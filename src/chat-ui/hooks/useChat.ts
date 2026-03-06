import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { PROFILE_CONFIG } from "@/src/chat-ui/config/profile";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type UIAction =
  | { action: "confirm_transfer"; prepared_id: string }
  | { action: "cancel"; prepared_id: string }
  | { action: "edit"; prepared_id: string };

export type ChatMeta = {
  next: string;
  stop_tool_calls: boolean;
  prepared_id: string;
};

export type ChatOutput = {
  reply_text: string | null;
  ui: Record<string, unknown> | null;
  meta: ChatMeta;
};

type ChatRequest =
  | {
      messages: ChatMessage[];
      client_event_id: string;
      sessionId: string;
      accountId: string;
    }
  | {
      ui_action: UIAction;
      client_event_id: string;
      sessionId: string;
      accountId: string;
    };

export type Profile = {
  id?: string;
  accountId: string;
  accountNo: string;
  accountName: string;
  birthDt?: string;
  mobileNo?: string;
  sex?: string;
  income?: string;
  salaryEmployeeFlag?: boolean;
  createdAt?: string;
};

type ProfileApiResponse = {
  status: string;
  data: Profile;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Some upstreams append stray backticks or wrap JSON in markdown fences.
 * This strips trailing backticks and extracts the best fenced JSON block if present.
 */
function stripTrailingBackticks(s: string): string {
  return s.replace(/`+\s*$/g, "").trim();
}

function stripJsonFence(s: string): string {
  const trimmed = stripTrailingBackticks(s.trim());
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;

  let m: RegExpExecArray | null = null;
  let best: string | null = null;

  while ((m = re.exec(trimmed))) {
    const block = (m[1] ?? "").trim();
    if (!best) best = block;
    if (block.includes("{") && block.includes("}")) best = block;
  }

  return (best ?? trimmed).trim();
}

function extractLikelyJsonObject(s: string): string {
  const t = s.trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return t.slice(a, b + 1);
  return t;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function addThousandsSeparators(numText: string): string {
  const normalized = numText.replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) return numText;
  const [intPart, fracPart] = normalized.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return typeof fracPart === "string" ? `${withCommas}.${fracPart}` : withCommas;
}

function formatMoneyInText(text: string): string {
  if (!text) return text;
  let out = text.replace(
    /(?<![\d.])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?=\s*บาท)/g,
    (_full, a: string, b?: string) => addThousandsSeparators(`${a}${b ?? ""}`),
  );
  out = out.replace(
    /฿\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/g,
    (_full, a: string, b?: string) => `฿${addThousandsSeparators(`${a}${b ?? ""}`)}`,
  );
  return out;
}

function sanitizeSystemMessage(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("topup failed: timeout of 20000ms exceeded")) {
    return "ขออภัยครับ ระบบใช้เวลานานกว่าปกติ จึงยังทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
  return text;
}

function postProcessChatOutput(out: ChatOutput): ChatOutput {
  const reply =
    typeof out.reply_text === "string"
      ? sanitizeSystemMessage(formatMoneyInText(out.reply_text))
      : out.reply_text;
  const ui = isRecord(out.ui) ? { ...out.ui } : out.ui;
  if (isRecord(ui) && isRecord(ui["props"])) {
    const props = { ...(ui["props"] as Record<string, unknown>) };
    if (typeof props["summary"] === "string") props["summary"] = formatMoneyInText(props["summary"]);
    if (typeof props["message"] === "string") {
      props["message"] = sanitizeSystemMessage(formatMoneyInText(props["message"]));
    }
    ui["props"] = props;
  }
  return { ...out, reply_text: reply, ui };
}

function buildMeta(meta: unknown, ui: unknown): ChatMeta {
  const m = isRecord(meta) ? meta : {};

  let prepared_id =
    typeof m["prepared_id"] === "string" ? m["prepared_id"] : "";

  // fallback: try read from ui.props.prepared_id
  if (!prepared_id && isRecord(ui) && isRecord(ui["props"])) {
    const pid = ui["props"]["prepared_id"];
    if (typeof pid === "string") prepared_id = pid;
  }

  return {
    next: typeof m["next"] === "string" ? m["next"] : "reply_to_user",
    stop_tool_calls:
      typeof m["stop_tool_calls"] === "boolean" ? m["stop_tool_calls"] : true,
    prepared_id,
  };
}

function coerceChatOutputFromObject(obj: Record<string, unknown>): ChatOutput {
  const reply = obj["reply_text"];
  const uiRaw = obj["ui"];
  const meta = obj["meta"];

  const ui = isRecord(uiRaw)
    ? normalizeUi(uiRaw)
    : uiRaw === null
      ? null
      : null;

  return {
    reply_text:
      typeof reply === "string" ? reply : reply === null ? null : null,
    ui,
    meta: buildMeta(meta, ui),
  };
}

/**
 * Fallback recovery for truncated nested JSON that still contains prepared_id/message.
 * Example:
 * {"reply_text":"{\"reply_text\":null,\"ui\":{\"type\":\"payment_cancelled\",\"props\":{\"prepared_id
 */
function tryRecoverPaymentCancelledUiFromTruncated(
  s: string,
): Record<string, unknown> | null {
  const hasCancelledType = /"type"\s*:\s*"payment_cancelled"/.test(s);
  // Be strict: only recover when payload explicitly points to payment_cancelled.
  // A generic prepared_id appears in many non-cancel flows (e.g. payment_confirmation).
  if (!hasCancelledType) return null;

  const pid = /"prepared_id"\s*:\s*"([^"]*)"/.exec(s)?.[1] ?? "";

  const msg = /"message"\s*:\s*"([^"]+)"/.exec(s)?.[1] ?? "ยกเลิกรายการแล้ว";

  return {
    type: "payment_cancelled",
    props: { prepared_id: pid, message: msg },
    actions: [
      {
        label: "ปิด",
        type: "button",
        style: "secondary",
        onClick: { action: "close" },
      },
    ],
  };
}

function normalizeUi(
  ui: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!ui) return null;

  // Upstream may return:
  // 1) ui = { type, props, actions }
  // 2) ui = { widget: { type, props, actions } }
  const candidate = isRecord(ui["widget"])
    ? (() => {
        const widget = ui["widget"] as Record<string, unknown>;
        const widgetActions = widget["actions"];
        const outerActions = ui["actions"];

        // Some upstream payloads place actions at ui.actions, not ui.widget.actions.
        if (!Array.isArray(widgetActions) && Array.isArray(outerActions)) {
          return { ...widget, actions: outerActions };
        }

        return widget;
      })()
    : ui;

  const type = candidate["type"];
  if (typeof type !== "string") return candidate;

  if (type === "payment_confirmation") {
    const propsRaw = candidate["props"];
    const props = isRecord(propsRaw) ? propsRaw : {};
    const data = isRecord(ui["data"]) ? ui["data"] : {};

    const providerFromProps =
      typeof props["provider"] === "string" ? props["provider"] : "";
    const providerFromData =
      typeof data["provider"] === "string" ? data["provider"] : "";
    const mobileFromProps =
      typeof props["mobile_number"] === "string" ? props["mobile_number"] : "";
    const mobileFromData =
      typeof data["mobile_number"] === "string" ? data["mobile_number"] : "";
    const destinationBank =
      typeof props["destinationBank"] === "string"
        ? props["destinationBank"]
        : providerFromProps || providerFromData;
    const destinationAccount =
      typeof props["destinationAccount"] === "string"
        ? props["destinationAccount"]
        : mobileFromProps || mobileFromData;

    const amountCandidate =
      typeof props["amount"] === "number"
        ? props["amount"]
        : typeof data["amount"] === "number"
          ? data["amount"]
          : null;

    return {
      ...candidate,
      props: {
        ...props,
        amount: amountCandidate ?? 0,
        destinationBank,
        destinationAccount,
        currency:
          typeof props["currency"] === "string" ? props["currency"] : "บาท",
      },
    };
  }

  if (type === "list") {
    const props = isRecord(candidate["props"]) ? candidate["props"] : {};
    const rawItems = Array.isArray(props["items"]) ? props["items"] : [];

    const normalizedItems = rawItems.map((rawItem) => {
      if (!isRecord(rawItem)) return rawItem;

      const directType = rawItem["type"];
      if (typeof directType === "string") {
        return rawItem;
      }

      const nestedWidget = isRecord(rawItem["widget"]) ? rawItem["widget"] : null;
      if (!nestedWidget || typeof nestedWidget["type"] !== "string") return rawItem;

      const nestedWidgetProps = isRecord(nestedWidget["props"])
        ? nestedWidget["props"]
        : {};
      const itemLabel =
        typeof rawItem["label"] === "string" ? rawItem["label"].trim() : "";
      const mergedProps =
        itemLabel && typeof nestedWidgetProps["label"] !== "string"
          ? { ...nestedWidgetProps, label: itemLabel }
          : nestedWidgetProps;

      const nestedActions = Array.isArray(nestedWidget["actions"])
        ? nestedWidget["actions"]
        : null;
      const outerActions = Array.isArray(rawItem["actions"])
        ? rawItem["actions"]
        : null;

      const normalizedWidget =
        normalizeUi({
          ...nestedWidget,
          props: mergedProps,
          actions: nestedActions ?? outerActions ?? [],
        }) ?? nestedWidget;

      return {
        ...rawItem,
        ...normalizedWidget,
        props: mergedProps,
        actions:
          Array.isArray(normalizedWidget["actions"])
            ? normalizedWidget["actions"]
            : nestedActions ?? outerActions ?? [],
      };
    });

    return {
      ...candidate,
      props: {
        ...props,
        items: normalizedItems,
      },
    };
  }

  // default passthrough for supported widgets
  if (type !== "payment_cancelled") return candidate;

  const propsRaw = candidate["props"];
  const props = isRecord(propsRaw) ? propsRaw : {};

  const prepared_id =
    typeof props["prepared_id"] === "string" ? props["prepared_id"] : "";

  const message =
    typeof props["message"] === "string"
      ? props["message"]
      : typeof props["summary"] === "string"
        ? props["summary"]
        : "ยกเลิกรายการแล้ว";

  return {
    ...candidate,
    props: {
      ...props,
      prepared_id,
      message, // ✅ map summary -> message
    },
  };
}

/**
 * 🔥 Key fix:
 * outer: { reply_text: "{\"reply_text\":null,\"ui\":{...}}", ui: null }
 * -> parse reply_text and promote inner ui to top-level
 * plus: recover payment_cancelled even if inner JSON is truncated.
 */
function promoteNestedUiIfAny(out: ChatOutput): ChatOutput {
  if (out.ui !== null) return out;
  if (typeof out.reply_text !== "string") return out;

  const raw = stripJsonFence(out.reply_text);
  const candidate = extractLikelyJsonObject(raw);
  const inner = safeJsonParse(candidate);

  if (isRecord(inner)) {
    const innerUi = inner["ui"];
    const innerReply = inner["reply_text"];

    if (isRecord(innerUi)) {
      const normalized = normalizeUi(innerUi);
      return {
        ...out,
        reply_text: null,
        ui: normalized,
        meta: buildMeta(inner["meta"], normalized),
      };
    }

    // inner might be widget directly { type, props, actions }
    if (typeof inner["type"] === "string") {
      return {
        ...out,
        reply_text: null,
        ui: inner,
        meta: buildMeta(inner["meta"], inner),
      };
    }

    // If ui exists but is null/undefined, keep out
    if (
      innerReply === null &&
      (innerUi === null || typeof innerUi === "undefined")
    ) {
      return out;
    }
  }

  // fallback: recover truncated nested JSON for payment_cancelled
  const recovered = tryRecoverPaymentCancelledUiFromTruncated(raw);
  if (recovered) {
    return {
      ...out,
      reply_text: null,
      ui: recovered,
      meta: buildMeta(out.meta, recovered),
    };
  }

  return out;
}

function normalizeLegacyContentToOutput(content: string): ChatOutput {
  // content might be:
  // - "```json { ... } ```"
  // - "{ \"output\": \"```json ...```\" }"
  // - "{ Banking_Agent_response: { result: \"[{ output: '...'}]\" } }"
  const cleaned = extractLikelyJsonObject(stripJsonFence(content));
  const parsed0 = safeJsonParse(cleaned);

  // if parse fails, fallback to plain text
  if (!isRecord(parsed0)) {
    const base: ChatOutput = {
      reply_text: stripJsonFence(content),
      ui: null,
      meta: { next: "reply_to_user", stop_tool_calls: true, prepared_id: "" },
    };
    return promoteNestedUiIfAny(base);
  }

  // direct ChatOutput-like
  if ("reply_text" in parsed0 || "ui" in parsed0) {
    return promoteNestedUiIfAny(coerceChatOutputFromObject(parsed0));
  }

  // nested { output: "..." }
  const output = parsed0["output"];
  if (typeof output === "string") {
    return normalizeLegacyContentToOutput(output);
  }

  // nested Banking_Agent_response.result
  const banking = parsed0["Banking_Agent_response"];
  if (isRecord(banking) && typeof banking["result"] === "string") {
    const arr = safeJsonParse(banking["result"]);
    if (Array.isArray(arr) && arr.length > 0 && isRecord(arr[0])) {
      const out = arr[0]["output"];
      if (typeof out === "string") return normalizeLegacyContentToOutput(out);
    }
  }

  // unknown object fallback
  const base: ChatOutput = {
    reply_text: JSON.stringify(parsed0),
    ui: null,
    meta: { next: "reply_to_user", stop_tool_calls: true, prepared_id: "" },
  };

  return promoteNestedUiIfAny(base);
}

function normalizeApiResponseToChatOutput(data: unknown): ChatOutput | null {
  // ✅ backend returns ChatOutput directly (meta may exist)
  if (isRecord(data) && ("reply_text" in data || "ui" in data)) {
    return postProcessChatOutput(promoteNestedUiIfAny(coerceChatOutputFromObject(data)));
  }

  // ✅ legacy wrapper: { choices: [{ message: { content } }] }
  if (isRecord(data)) {
    const choices = data["choices"];
    if (Array.isArray(choices) && choices.length > 0 && isRecord(choices[0])) {
      const msg = choices[0]["message"];
      if (isRecord(msg) && typeof msg["content"] === "string") {
        return postProcessChatOutput(normalizeLegacyContentToOutput(msg["content"]));
      }
      if (isRecord(msg) && isRecord(msg["content"])) {
        const contentObj = msg["content"] as Record<string, unknown>;
        if ("reply_text" in contentObj || "ui" in contentObj) {
          return postProcessChatOutput(
            promoteNestedUiIfAny(coerceChatOutputFromObject(contentObj)),
          );
        }
      }
    }
  }

  // ✅ raw string
  if (typeof data === "string") {
    return postProcessChatOutput(normalizeLegacyContentToOutput(data));
  }

  return null;
}

function createClientEventId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createSessionId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function extractApiErrorMessage(data: unknown, fallback: string): string {
  if (isRecord(data)) {
    if (typeof data["err_message"] === "string" && data["err_message"].trim()) {
      return data["err_message"].trim();
    }
    if (typeof data["message"] === "string" && data["message"].trim()) {
      return data["message"].trim();
    }
  }
  return fallback;
}

async function fetchProfile(accountId: string): Promise<ProfileApiResponse> {
  const response = await fetch(
    `/api/v1/profile?accountId=${encodeURIComponent(accountId)}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch profile");
  }

  const data: unknown = await response.json().catch(() => null);

  if (!isRecord(data) || !isRecord(data["data"])) {
    throw new Error("Invalid profile response");
  }

  return data as ProfileApiResponse;
}

type UseChatOptions = {
  accountId?: string;
};

type StreamEvent =
  | { type: "delta"; text?: string }
  | { type: "done"; response?: unknown }
  | { type: "tts_ready"; audio_url?: string }
  | { type: string; [key: string]: unknown };

export function useChat(options?: UseChatOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(createSessionId());
  const accountId = options?.accountId ?? PROFILE_CONFIG.accountId;

  const profileQuery = useQuery({
    queryKey: ["profile", accountId],
    queryFn: () => fetchProfile(accountId),
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  const post = async (payload: ChatRequest): Promise<ChatOutput | null> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // ✅ read as text first (handles JSON-in-string / weird content-types)
      const raw = await response.text();

      let data: unknown = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        // keep as string
      }

      if (!response.ok) {
        const fallback = response.status >= 500
          ? "Server error. Please try again."
          : "Request failed. Please try again.";
        throw new Error(extractApiErrorMessage(data, fallback));
      }

      return (
        normalizeApiResponseToChatOutput(data) ??
        normalizeLegacyContentToOutput(raw)
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const resetSession = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    sessionIdRef.current = createSessionId();
    setIsLoading(false);
    setError(null);
  }, []);

  const sendMessage = (messages: ChatMessage[]) =>
    post({
      messages,
      client_event_id: createClientEventId(),
      sessionId: sessionIdRef.current,
      accountId,
    });

  const sendMessageStream = async (
    messages: ChatMessage[],
    onDelta: (deltaText: string) => void,
    onTtsReady?: (audioUrl: string) => void,
  ): Promise<ChatOutput | null> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          client_event_id: createClientEventId(),
          sessionId: sessionIdRef.current,
          accountId,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const rawError = await response.text().catch(() => "");
        let data: unknown = rawError;
        try {
          data = JSON.parse(rawError);
        } catch {
          // keep string
        }
        const fallback = response.status >= 500
          ? "Server error. Please try again."
          : "Request failed. Please try again.";
        throw new Error(extractApiErrorMessage(data, fallback));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let finalOutput: ChatOutput | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          separatorIndex = buffer.indexOf("\n\n");

          const lines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const dataLines = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim());
          if (!dataLines.length) continue;

          const joined = dataLines.join("\n");
          if (joined === "[DONE]") continue;

          let evt: StreamEvent | null = null;
          try {
            const parsed: unknown = JSON.parse(joined);
            evt = isRecord(parsed) ? (parsed as StreamEvent) : null;
          } catch {
            evt = null;
          }
          if (!evt) continue;

          if (evt.type === "delta" && typeof evt.text === "string" && evt.text) {
            onDelta(evt.text);
          } else if (
            evt.type === "tts_ready" &&
            typeof evt.audio_url === "string" &&
            evt.audio_url.trim()
          ) {
            onTtsReady?.(evt.audio_url.trim());
          } else if (evt.type === "done") {
            const output = normalizeApiResponseToChatOutput(evt.response) ??
              normalizeLegacyContentToOutput(
                typeof evt.response === "string" ? evt.response : JSON.stringify(evt.response ?? {}),
              );
            if (output) {
              finalOutput = output;
            }
          }
        }
      }

      const shouldFallbackToNonStream =
        !finalOutput ||
        (((finalOutput.reply_text ?? "").trim().length === 0) && !finalOutput.ui);

      if (!shouldFallbackToNonStream) {
        return finalOutput;
      }

      const fallbackResponse = await fetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          client_event_id: createClientEventId(),
          sessionId: sessionIdRef.current,
          accountId,
        }),
        signal: controller.signal,
      });

      const fallbackRaw = await fallbackResponse.text();
      let fallbackData: unknown = fallbackRaw;
      try {
        fallbackData = JSON.parse(fallbackRaw);
      } catch {
        // keep string
      }

      if (!fallbackResponse.ok) {
        const fallback = fallbackResponse.status >= 500
          ? "Server error. Please try again."
          : "Request failed. Please try again.";
        throw new Error(extractApiErrorMessage(fallbackData, fallback));
      }

      return (
        normalizeApiResponseToChatOutput(fallbackData) ??
        normalizeLegacyContentToOutput(fallbackRaw)
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      setError(err instanceof Error ? err.message : "An error occurred");
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const sendUIAction = (ui_action: UIAction) =>
    post({
      ui_action,
      client_event_id: createClientEventId(),
      sessionId: sessionIdRef.current,
      accountId,
    });

  return {
    sendMessage,
    sendMessageStream,
    sendUIAction,
    cancelRequest,
    resetSession,
    isLoading,
    error,
    profile: profileQuery.data?.data ?? null,
    profileStatus: profileQuery.data?.status ?? null,
    isProfileLoading: profileQuery.isLoading,
    profileError:
      profileQuery.error instanceof Error ? profileQuery.error.message : null,
    refetchProfile: profileQuery.refetch,
  };
}
