import { NextRequest, NextResponse } from "next/server";
import { storePreloadedTts } from "@/src/server/ttsPreloadCache";

type ChatMessage = { role: "user" | "assistant"; content: string };

type StreamEvent = {
  type?: unknown;
  text?: unknown;
  response?: unknown;
  [key: string]: unknown;
};

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 5000;
const MAX_CLIENT_EVENT_ID_CHARS = 128;
const MAX_SESSION_ID_CHARS = 128;
const MAX_ACCOUNT_ID_CHARS = 64;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeInputText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, "")
    .trim();
}

function getLastUserMessage(messages: ChatMessage[]): string {
  const reversed = [...messages].reverse();
  const lastUser = reversed.find((m) => m.role === "user");
  return lastUser?.content ?? "";
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractReplyText(response: unknown): string {
  if (typeof response === "string") return response;
  if (!isRecord(response)) return "";

  const direct = response["reply_text"];
  if (typeof direct === "string") return direct;

  const choices = response["choices"];
  if (Array.isArray(choices) && choices.length > 0 && isRecord(choices[0])) {
    const message = choices[0]["message"];
    if (isRecord(message) && typeof message["content"] === "string") {
      return message["content"];
    }
  }

  return "";
}

async function preloadTtsAudio(req: NextRequest, text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const ttsResp = await fetch(new URL("/api/v1/tts", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: trimmed }),
    });

    if (!ttsResp.ok) return null;

    const audio = Buffer.from(await ttsResp.arrayBuffer());
    if (!audio.length) return null;

    const contentType = ttsResp.headers.get("content-type") ?? "audio/mpeg";
    const cacheId = storePreloadedTts(audio, contentType);
    return `/api/v1/tts/cache/${cacheId}`;
  } catch {
    return null;
  }
}

function parseSseData(rawEvent: string): string | null {
  const dataLines = rawEvent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (!dataLines.length) return null;
  return dataLines.join("\n");
}

const FIRST_CHUNK_MIN_CHARS = 18;
const FIRST_CHUNK_MAX_CHARS = 30;
const FORCE_CHUNK_CHARS = 72;

function splitTtsSegments(
  input: string,
  flushRemainder: boolean,
  allowEarlyChunk: boolean,
): { segments: string[]; rest: string } {
  const segments: string[] = [];
  let lastCut = 0;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (/[.!?。！？\n]/.test(ch)) {
      const segment = input.slice(lastCut, i + 1).trim();
      if (segment) segments.push(segment);
      lastCut = i + 1;
    }
  }

  let rest = input.slice(lastCut).trim();
  if (!segments.length && allowEarlyChunk && rest.length >= FIRST_CHUNK_MIN_CHARS) {
    const head = rest.slice(0, FIRST_CHUNK_MAX_CHARS);
    const bySpace = head.lastIndexOf(" ");
    const byComma = Math.max(head.lastIndexOf(","), head.lastIndexOf("，"));
    const byThaiPause = Math.max(head.lastIndexOf("ๆ"), head.lastIndexOf("ฯ"));
    const cutAtCandidate = Math.max(bySpace, byComma, byThaiPause);
    const cutAt = cutAtCandidate > 6 ? cutAtCandidate + 1 : Math.min(FIRST_CHUNK_MAX_CHARS, rest.length);
    const forced = rest.slice(0, cutAt).trim();
    if (forced) segments.push(forced);
    rest = rest.slice(cutAt).trim();
  }

  if (!segments.length && rest.length >= FORCE_CHUNK_CHARS) {
    const head = rest.slice(0, FORCE_CHUNK_CHARS);
    const bySpace = head.lastIndexOf(" ");
    const byComma = Math.max(head.lastIndexOf(","), head.lastIndexOf("，"));
    const byThaiPause = Math.max(head.lastIndexOf("ๆ"), head.lastIndexOf("ฯ"));
    const cutAtCandidate = Math.max(bySpace, byComma, byThaiPause);
    const cutAt = cutAtCandidate > 12 ? cutAtCandidate + 1 : FORCE_CHUNK_CHARS;
    const forced = rest.slice(0, cutAt).trim();
    if (forced) segments.push(forced);
    rest = rest.slice(cutAt).trim();
  }

  if (flushRemainder && rest) {
    segments.push(rest);
    rest = "";
  }

  return { segments, rest };
}

export const POST = async (req: NextRequest) => {
  const rawAgentBaseUrl = process.env.AGENT_API_URL ?? "";
  const agentBaseUrl = rawAgentBaseUrl.replace("://localhost:", "://127.0.0.1:");
  if (!agentBaseUrl) {
    return NextResponse.json(
      { err_code: "PF_9401", err_message: "Missing AGENT_API_URL" },
      { status: 500 },
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

      totalChars += content.length;
      if (totalChars > MAX_TOTAL_CHARS) {
        throw new Error(`Total message length exceeds ${MAX_TOTAL_CHARS} characters`);
      }

      cleaned.push({ role, content });
    }

    const message = getLastUserMessage(cleaned);
    if (!message) throw new Error("Cannot resolve latest user message");

    const upstreamResp = await fetch(`${agentBaseUrl}/chat/completions/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        "x-account-id": accountId,
        "x-user-id": (req.headers.get("x-user-id") ?? "anonymous").trim(),
        "x-request-id": req.headers.get("x-request-id") ?? clientEventId,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!upstreamResp.ok || !upstreamResp.body) {
      const upstreamData = await upstreamResp.text().catch(() => "");
      return NextResponse.json(
        {
          err_code: "PF_9403",
          err_message: "Upstream stream error",
          upstream_status: upstreamResp.status,
          upstream_body: upstreamData,
        },
        { status: upstreamResp.status || 502 },
      );
    }

    const upstreamReader = upstreamResp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = "";
        let ttsRest = "";
        let firstChunkSent = false;
        let ttsSeq = 0;
        const ttsQueue: string[] = [];
        let ttsWorkerPromise: Promise<void> | null = null;

        const enqueueSse = (payload: string) => {
          try {
            controller.enqueue(encoder.encode(payload));
          } catch {
            // Client disconnected.
          }
        };

        const enqueueTtsSegment = (segment: string) => {
          const normalized = segment.trim();
          if (!normalized) return;
          ttsQueue.push(normalized);
          if (ttsWorkerPromise) return;
          ttsWorkerPromise = (async () => {
            while (ttsQueue.length > 0) {
              const nextText = ttsQueue.shift();
              if (!nextText) continue;
              const audioUrl = await preloadTtsAudio(req, nextText);
              if (!audioUrl) continue;
              const evt = `data: ${JSON.stringify({
                type: "tts_ready",
                audio_url: audioUrl,
                seq: ttsSeq++,
              })}\n\n`;
              enqueueSse(evt);
            }
          })().finally(() => {
            ttsWorkerPromise = null;
          });
        };

        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let separatorIndex = buffer.indexOf("\n\n");
            while (separatorIndex !== -1) {
              const rawEvent = buffer.slice(0, separatorIndex);
              buffer = buffer.slice(separatorIndex + 2);
              separatorIndex = buffer.indexOf("\n\n");

              enqueueSse(`${rawEvent}\n\n`);

              const data = parseSseData(rawEvent);
              if (!data || data === "[DONE]") continue;

              let parsed: StreamEvent | null = null;
              try {
                const maybe = JSON.parse(data);
                parsed = isRecord(maybe) ? (maybe as StreamEvent) : null;
              } catch {
                parsed = null;
              }

              if (!parsed || parsed.type !== "done") {
                if (parsed?.type === "delta" && typeof parsed.text === "string" && parsed.text) {
                  const combined = `${ttsRest}${parsed.text}`;
                  const { segments, rest } = splitTtsSegments(combined, false, !firstChunkSent);
                  ttsRest = rest;
                  if (segments.length > 0) firstChunkSent = true;
                  segments.forEach(enqueueTtsSegment);
                }
                if (parsed?.type !== "done") continue;
              }

              if (parsed.type === "done") {
                const { segments, rest } = splitTtsSegments(ttsRest, true, !firstChunkSent);
                ttsRest = rest;
                if (segments.length > 0) firstChunkSent = true;
                segments.forEach(enqueueTtsSegment);

                // Fallback: if stream had no deltas but has final text, synthesize once.
                if (ttsQueue.length === 0 && !ttsWorkerPromise) {
                  const replyText = extractReplyText(parsed.response);
                  if (replyText.trim()) {
                    enqueueTtsSegment(replyText);
                  }
                }
              }
            }
          }

          if (buffer.trim().length > 0) {
            enqueueSse(`${buffer}\n\n`);
          }

          if (ttsRest) {
            const { segments } = splitTtsSegments(ttsRest, true, !firstChunkSent);
            ttsRest = "";
            if (segments.length > 0) firstChunkSent = true;
            segments.forEach(enqueueTtsSegment);
          }

          if (ttsWorkerPromise) await ttsWorkerPromise;
        } catch {
          // Ignore stream transformation failures and close the stream.
        } finally {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      },
      async cancel() {
        try {
          await upstreamReader.cancel();
        } catch {
          // ignore
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json(
      { err_code: "PF_9402", err_message: message },
      { status: 400 },
    );
  }
};
