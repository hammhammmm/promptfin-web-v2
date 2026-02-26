// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };
type UIAction =
  | { action: "confirm_transfer"; prepared_id: string }
  | { action: "cancel"; prepared_id: string }
  | { action: "edit"; prepared_id: string };

type AgentResponse = {
  reply?: unknown;
  session_id?: string;
  choices?: Array<{ message?: { content?: unknown } }>;
  sessionId?: string;
};

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 5000;
const MAX_CLIENT_EVENT_ID_CHARS = 128;
const MAX_SESSION_ID_CHARS = 128;
const MAX_ACCOUNT_ID_CHARS = 64;

const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /reveal\s+(the\s+)?(system|developer)\s+prompt/i,
  /\b(system|developer)\s+prompt\b/i,
  /act\s+as\s+(a\s+)?(system|developer|root|admin)/i,
  /bypass\s+(all\s+)?(rules|guardrails|safety)/i,
  /jailbreak/i,
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toTextPayload(v: unknown): string {
  if (typeof v === "string") return v;
  if (isRecord(v) || Array.isArray(v)) {
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeInputText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, "")
    .trim();
}

function hasPromptInjectionSignals(value: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLastUserMessage(messages: ChatMessage[]): string {
  const reversed = [...messages].reverse();
  const lastUser = reversed.find((m) => m.role === "user");
  return lastUser?.content ?? "";
}

export const POST = async (req: NextRequest) => {
  const rawAgentBaseUrl = process.env.AGENT_API_URL ?? "";
  const agentBaseUrl = rawAgentBaseUrl.replace("://localhost:", "://127.0.0.1:");
  if (!agentBaseUrl) {
    return NextResponse.json(
      { err_code: "PF_9001", err_message: "Missing AGENT_API_URL" },
      { status: 500 }
    );
  }

  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) throw new Error("Invalid JSON body");

    const clientEventId = getString(body.client_event_id, "");
    if (!clientEventId) throw new Error("Missing client_event_id");
    if (clientEventId.length > MAX_CLIENT_EVENT_ID_CHARS) {
      throw new Error("client_event_id is too long");
    }

    const model = getString(body.model, "gemini-2.5-flash");
    const sessionIdFromBody = getString(body.sessionId, "");
    const sessionIdFromHeader = req.headers.get("x-session-id") ?? "";
    const sessionId = sessionIdFromBody || sessionIdFromHeader || generateSessionId();
    if (sessionId.length > MAX_SESSION_ID_CHARS) {
      throw new Error("sessionId is too long");
    }

    const accountIdFromBody = getString(body.accountId, "");
    const accountIdFromHeader = req.headers.get("x-account-id") ?? "";
    const accountId = (accountIdFromBody || accountIdFromHeader).trim();
    if (!accountId) throw new Error("Missing x-account-id/accountId");
    if (accountId.length > MAX_ACCOUNT_ID_CHARS) {
      throw new Error("accountId is too long");
    }

    const userIdHeader = (req.headers.get("x-user-id") ?? "anonymous").trim();

    let message = "";
    let upstreamPayload: Record<string, unknown> | null = null;

    if (isRecord(body.ui_action)) {
      const action = getString(body.ui_action.action, "");
      const preparedId = getString(body.ui_action.prepared_id, "");
      if (!action) throw new Error("Missing ui_action.action");
      if (
        (action === "confirm_transfer" || action === "cancel" || action === "edit") &&
        !preparedId
      ) {
        throw new Error("Missing ui_action.prepared_id");
      }
      upstreamPayload = {
        ui_action: body.ui_action as UIAction,
      };
    } else {
      const rawMessages = body.messages;
      if (!Array.isArray(rawMessages)) throw new Error("Missing messages[]");
      if (rawMessages.length === 0) throw new Error("messages[] must not be empty");
      if (rawMessages.length > MAX_MESSAGES) {
        throw new Error(`messages[] exceeds limit (${MAX_MESSAGES})`);
      }

      const cleaned: ChatMessage[] = [];
      let totalChars = 0;

      for (const raw of rawMessages) {
        if (!isRecord(raw)) throw new Error("Invalid message object");
        const role = getString(raw.role, "");
        if (role !== "user" && role !== "assistant") {
          throw new Error(`Unsupported role: ${role || "(empty)"}`);
        }

        const content = normalizeInputText(getString(raw.content, ""));
        if (role === "user" && !content) throw new Error("User message must not be empty");
        if (content.length > MAX_MESSAGE_CHARS) {
          throw new Error(`Message exceeds ${MAX_MESSAGE_CHARS} characters`);
        }
        if (role === "user" && hasPromptInjectionSignals(content)) {
          continue;
        }

        totalChars += content.length;
        if (totalChars > MAX_TOTAL_CHARS) {
          throw new Error(`Total message length exceeds ${MAX_TOTAL_CHARS} characters`);
        }

        cleaned.push({ role, content });
      }

      const hasUser = cleaned.some((m) => m.role === "user");
      if (!hasUser) throw new Error("No safe user message found");

      message = getLastUserMessage(cleaned);
      if (!message) throw new Error("Cannot resolve latest user message");
      upstreamPayload = {
        messages: [{ role: "user", content: message }],
      };
    }

    console.log(accountId, sessionId, "->", message || "[ui_action]");
    const upstreamResp = await fetch(`${agentBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        "x-account-id": accountId,
        "x-user-id": userIdHeader,
        "x-request-id": req.headers.get("x-request-id") ?? clientEventId,
      },
      body: JSON.stringify(upstreamPayload),
    });

    const upstreamData: unknown = await upstreamResp.json().catch(() => null);
    if (!upstreamResp.ok || !isRecord(upstreamData)) {
      return NextResponse.json(
        {
          err_code: "PF_9003",
          err_message: "Upstream error",
          upstream_status: upstreamResp.status,
          upstream_body: upstreamData,
        },
        { status: upstreamResp.status || 502 }
      );
    }

    const agent = upstreamData as Partial<AgentResponse>;
    const replyFromChoices = Array.isArray(agent.choices)
      ? toTextPayload(agent.choices[0]?.message?.content)
      : "";
    const reply = toTextPayload(agent.reply) || replyFromChoices;
    const returnedSessionId = getString(agent.session_id, getString(agent.sessionId, sessionId));

    return NextResponse.json(
      {
        id: clientEventId,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        sessionId: returnedSessionId,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: reply },
            finish_reason: "stop",
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        err_code: "PF_4000",
        err_message: error instanceof Error ? error.message : "Bad Request",
      },
      { status: 400 }
    );
  }
};
