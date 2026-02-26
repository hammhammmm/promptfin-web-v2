import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; content: string };

type UIAction =
  | { action: "confirm_transfer"; prepared_id: string }
  | { action: "cancel"; prepared_id: string }
  | { action: "edit"; prepared_id: string };

type ChatRequest =
  | {
      model?: string;
      messages: ChatMessage[];
      client_event_id: string;
      sessionId?: string;
      accountId?: string;
    }
  | {
      model?: string;
      ui_action: UIAction;
      client_event_id: string;
      sessionId?: string;
      accountId?: string;
    };

const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOTAL_CHARS = 5000;
const MAX_CLIENT_EVENT_ID_CHARS = 128;
const MAX_SESSION_ID_CHARS = 128;
const MAX_ACCOUNT_ID_CHARS = 64;
const ALLOWED_ROLES: ReadonlySet<string> = new Set(["user", "assistant"]);
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

function getString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function getHeader(req: NextRequest, key: string): string {
  return req.headers.get(key) ?? "";
}

function normalizeInputText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    // Remove control chars (except tab/newline) + DEL.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Remove zero-width/invisible characters.
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, "")
    .trim();
}

function hasPromptInjectionSignals(value: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type PreferenceData = {
  aliasAdditionalInfo?: string;
  aliasTargetDestination?: string;
  aliasTargetBankBillerName?: string;
  aliasAccountId?: string;
};

type LookupDestinationData = {
  accountId?: string;
  accountNo?: string;
  accountName?: string;
  promptPayId?: string;
};

function getRecord(v: unknown): Record<string, unknown> | null {
  return isRecord(v) ? v : null;
}

function parseRecordString(v: unknown): Record<string, unknown> | null {
  if (typeof v !== "string") return null;
  try {
    const parsed = JSON.parse(v);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function findUuidDeep(value: unknown, depth = 0): string {
  if (depth > 8) return "";

  if (isRecord(value)) {
    if (typeof value["uuid"] === "string") return value["uuid"];

    for (const nested of Object.values(value)) {
      const found = findUuidDeep(nested, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUuidDeep(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  const parsed = parseRecordString(value);
  if (parsed) return findUuidDeep(parsed, depth + 1);

  return "";
}

function extractUuidFromUi(uiWidget: Record<string, unknown>): string {
  if (typeof uiWidget["uuid"] === "string") return uiWidget["uuid"];

  const props = getRecord(uiWidget["props"]);
  if (props && typeof props["uuid"] === "string") return props["uuid"];
  const propsFromString = parseRecordString(uiWidget["props"]);
  if (propsFromString && typeof propsFromString["uuid"] === "string") {
    return propsFromString["uuid"];
  }

  const data = getRecord(uiWidget["data"]);
  if (data && typeof data["uuid"] === "string") return data["uuid"];
  const dataFromString = parseRecordString(uiWidget["data"]);
  if (dataFromString && typeof dataFromString["uuid"] === "string") {
    return dataFromString["uuid"];
  }

  return findUuidDeep(uiWidget);
}

function applyPreferenceToUi(
  uiWidget: Record<string, unknown>,
  preference: PreferenceData,
) {
  const currentProps = getRecord(uiWidget["props"]) ?? {};
  const aliasAdditionalInfo = preference.aliasAdditionalInfo?.trim() || "";
  const aliasTargetDestination = preference.aliasTargetDestination?.trim() || "";
  const aliasTargetBankBillerName =
    preference.aliasTargetBankBillerName?.trim() || "";

  uiWidget["props"] = {
    ...currentProps,
    target: aliasAdditionalInfo || currentProps["target"],
    beneficiaryName: aliasAdditionalInfo || currentProps["beneficiaryName"],
    destinationAccount:
      aliasTargetDestination || currentProps["destinationAccount"],
    destinationBank:
      aliasTargetBankBillerName || currentProps["destinationBank"],
  };
}

function splitPiiTokens(pii: string): string[] {
  return pii
    .split("???")
    .map((part) => part.replace(/[{}]/g, "").trim())
    .filter(Boolean);
}

function extractRedisKeyFromPii(pii: string): string {
  const uuidMatch =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(pii);
  if (uuidMatch?.[0]) return uuidMatch[0];

  const parts = splitPiiTokens(pii);
  return parts.at(-1) ?? "";
}

function resolveDestinationBankFromPii(pii: string): string {
  const firstToken = splitPiiTokens(pii)[0]?.toLowerCase() ?? "";
  if (firstToken.startsWith("phone")) return "PROMPTPAY";
  if (firstToken.startsWith("financial")) return "KTB";
  return "PROMPTPAY";
}

function applyPiiDestinationToUi(
  uiWidget: Record<string, unknown>,
  destinationAccount: string,
  destinationBank: string,
) {
  const currentProps = getRecord(uiWidget["props"]) ?? {};
  uiWidget["props"] = {
    ...currentProps,
    destinationAccount,
    destinationBank,
  };
}

function normalizeDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").trim();
}

function isLikelyMobileNumber(value: string): boolean {
  return /^0\d{9}$/.test(value);
}

function applyLookupDestinationToUi(
  uiWidget: Record<string, unknown>,
  lookup: LookupDestinationData,
  fallbackDestinationRaw: string,
) {
  const currentProps = getRecord(uiWidget["props"]) ?? {};
  const normalizedRaw = normalizeDigitsOnly(fallbackDestinationRaw);
  const destinationInput = normalizedRaw || fallbackDestinationRaw.trim();
  const isMobile = isLikelyMobileNumber(destinationInput);

  const accountName = lookup.accountName?.trim() || "";
  const lookupPromptPayId = lookup.promptPayId?.trim() || "";
  const lookupAccountNo = lookup.accountNo?.trim() || "";

  const destinationAccount = isMobile
    ? lookupPromptPayId || destinationInput
    : lookupAccountNo || destinationInput;

  uiWidget["props"] = {
    ...currentProps,
    target: accountName || currentProps["target"],
    beneficiaryName: accountName || currentProps["beneficiaryName"],
    destinationAccount: destinationAccount || currentProps["destinationAccount"],
    destinationBank: isMobile
      ? "PROMPTPAY"
      : currentProps["destinationBank"],
    provider: isMobile ? "PROMPTPAY" : currentProps["provider"],
    mobile_number: isMobile
      ? destinationAccount || currentProps["mobile_number"]
      : currentProps["mobile_number"],
  };
}

function extractPreparedIdFromOnClick(onClick: unknown): string {
  const config = getRecord(onClick);
  if (!config) return "";

  if (config["action"] === "confirm_transfer") {
    return typeof config["prepared_id"] === "string" ? config["prepared_id"] : "";
  }

  if (
    config["action"] === "tool" &&
    config["name"] === "confirm_transfer" &&
    isRecord(config["args"]) &&
    typeof config["args"]["prepared_id"] === "string"
  ) {
    return config["args"]["prepared_id"];
  }

  if (config["action"] === "cancel") {
    return typeof config["prepared_id"] === "string" ? config["prepared_id"] : "";
  }

  return "";
}

function extractPreparedIdFromUi(uiWidget: Record<string, unknown>): string {
  const actions = Array.isArray(uiWidget["actions"]) ? uiWidget["actions"] : [];
  for (const action of actions) {
    if (!isRecord(action)) continue;
    const pid = extractPreparedIdFromOnClick(action["onClick"]);
    if (pid) return pid;
  }

  const props = getRecord(uiWidget["props"]);
  if (props && typeof props["prepared_id"] === "string") return props["prepared_id"];

  const data = getRecord(uiWidget["data"]);
  if (data && typeof data["prepared_id"] === "string") return data["prepared_id"];

  return "";
}

function hasCancelAction(uiWidget: Record<string, unknown>): boolean {
  const actions = Array.isArray(uiWidget["actions"]) ? uiWidget["actions"] : [];
  return actions.some((a) => {
    if (!isRecord(a)) return false;
    const onClick = getRecord(a["onClick"]);
    if (!onClick) return false;
    return onClick["action"] === "cancel" || onClick["action"] === "cancel_transfer";
  });
}

function ensureCancelAction(uiWidget: Record<string, unknown>) {
  if (uiWidget["type"] !== "payment_confirmation") return;
  if (hasCancelAction(uiWidget)) return;

  const rawActions = Array.isArray(uiWidget["actions"]) ? uiWidget["actions"] : [];
  const actions = rawActions.filter(isRecord);
  const preparedId = extractPreparedIdFromUi(uiWidget);

  const cancelOnClick: Record<string, unknown> = preparedId
    ? { action: "cancel", prepared_id: preparedId }
    : { action: "cancel" };

  uiWidget["actions"] = [
    ...actions,
    {
      label: "ยกเลิก",
      type: "button",
      style: "secondary",
      onClick: cancelOnClick,
    },
  ];
}

function parseContentJson(content: string): unknown {
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "string") {
      try {
        return JSON.parse(parsed);
      } catch {
        return parsed;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

async function fetchPreferenceByUuid(
  uuid: string,
  accountId: string,
): Promise<PreferenceData | null> {
  const preferenceBaseUrl =
    process.env.PREFERENCE_API_URL ??
    "https://banking-api-46469170160.asia-southeast1.run.app";
  const url = `${preferenceBaseUrl}/preference?uuid=${encodeURIComponent(uuid)}`;

  try {
    console.log("[chat-v1] preference fetch:start", { uuid, url });
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "x-account-id": accountId,
      },
    });

    if (!resp.ok) {
      console.warn("[chat-v1] preference fetch:not_ok", {
        uuid,
        status: resp.status,
        statusText: resp.statusText,
      });
      return null;
    }
    const data: unknown = await resp.json().catch(() => null);
    if (!isRecord(data)) {
      console.warn("[chat-v1] preference fetch:invalid_json", { uuid });
      return null;
    }

    const payload = getRecord(data["data"]);
    if (!payload) {
      console.warn("[chat-v1] preference fetch:missing_data_field", { uuid });
      return null;
    }

    console.log("Fetched preference", { uuid, payload });

    return {
      aliasAdditionalInfo:
        typeof payload["aliasAdditionalInfo"] === "string"
          ? payload["aliasAdditionalInfo"]
          : undefined,
      aliasTargetDestination:
        typeof payload["aliasTargetDestination"] === "string"
          ? payload["aliasTargetDestination"]
          : undefined,
      aliasTargetBankBillerName:
        typeof payload["aliasTargetBankBillerName"] === "string"
          ? payload["aliasTargetBankBillerName"]
          : undefined,
      aliasAccountId:
        typeof payload["aliasAccountId"] === "string"
          ? payload["aliasAccountId"]
          : undefined,
    };
  } catch (error) {
    console.error("[chat-v1] preference fetch:error", { uuid, error });
    return null;
  }
}

async function fetchProfileNameByAccountId(accountId: string): Promise<string | null> {
  const baseUrl =
    process.env.BANKING_API_URL ??
    process.env.PREFERENCE_API_URL ??
    "https://banking-api-46469170160.asia-southeast1.run.app";
  const url = `${baseUrl}/profile?accountId=${encodeURIComponent(accountId)}`;

  try {
    console.log("[chat-v1] profile fetch:start", { accountId, url });
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "x-account-id": accountId,
      },
    });

    if (!resp.ok) {
      console.warn("[chat-v1] profile fetch:not_ok", {
        accountId,
        status: resp.status,
        statusText: resp.statusText,
      });
      return null;
    }

    const data: unknown = await resp.json().catch(() => null);
    if (!isRecord(data)) {
      console.warn("[chat-v1] profile fetch:invalid_json", { accountId });
      return null;
    }

    const payload = getRecord(data["data"]);
    if (!payload || typeof payload["accountName"] !== "string") {
      console.warn("[chat-v1] profile fetch:missing_account_name", { accountId });
      return null;
    }

    const accountName = payload["accountName"].trim();
    return accountName || null;
  } catch (error) {
    console.error("[chat-v1] profile fetch:error", { accountId, error });
    return null;
  }
}

async function fetchRedisValueByKey(
  key: string,
  accountId: string,
): Promise<string | null> {
  const baseUrl =
    process.env.BANKING_API_URL ??
    process.env.PREFERENCE_API_URL ??
    "https://banking-api-46469170160.asia-southeast1.run.app";

  const url = `${baseUrl}/debug/redis/get?key=${encodeURIComponent(key)}&db=0`;
  try {
    console.log("[chat-v1] pii redis fetch:start", { key, url });
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "x-account-id": accountId,
      },
    });

    if (!resp.ok) {
      console.warn("[chat-v1] pii redis fetch:not_ok", {
        key,
        status: resp.status,
        statusText: resp.statusText,
      });
      return null;
    }

    const data: unknown = await resp.json().catch(() => null);
    if (!isRecord(data)) {
      console.warn("[chat-v1] pii redis fetch:invalid_json", { key });
      return null;
    }

    if (typeof data["value"] !== "string") {
      console.warn("[chat-v1] pii redis fetch:missing_value", { key });
      return null;
    }

    return data["value"];
  } catch (error) {
    console.error("[chat-v1] pii redis fetch:error", { key, error });
    return null;
  }
}

async function fetchLookupByDestinationId(
  destinationId: string,
  accountId: string,
): Promise<LookupDestinationData | null> {
  const baseUrl =
    process.env.BANKING_API_URL ??
    process.env.PREFERENCE_API_URL ??
    "https://banking-api-46469170160.asia-southeast1.run.app";

  const normalized = normalizeDigitsOnly(destinationId);
  const value = normalized || destinationId.trim();
  if (!value) return null;

  const query = new URLSearchParams();
  if (isLikelyMobileNumber(value)) {
    query.set("prompt_pay_id", value);
  } else {
    query.set("account_no", value);
  }

  const url = `${baseUrl}/saving-balance/lookup?${query.toString()}`;

  try {
    console.log("[chat-v1] lookup fetch:start", {
      destinationId: value,
      mode: isLikelyMobileNumber(value) ? "prompt_pay_id" : "account_no",
      url,
    });
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "x-account-id": accountId,
      },
    });

    if (!resp.ok) {
      console.warn("[chat-v1] lookup fetch:not_ok", {
        destinationId: value,
        status: resp.status,
        statusText: resp.statusText,
      });
      return null;
    }

    const data: unknown = await resp.json().catch(() => null);
    if (!isRecord(data)) {
      console.warn("[chat-v1] lookup fetch:invalid_json", { destinationId: value });
      return null;
    }

    const payload = getRecord(data["data"]);
    if (!payload) {
      console.warn("[chat-v1] lookup fetch:missing_data", { destinationId: value });
      return null;
    }

    return {
      accountId:
        typeof payload["accountId"] === "string" ? payload["accountId"] : undefined,
      accountNo:
        typeof payload["accountNo"] === "string" ? payload["accountNo"] : undefined,
      accountName:
        typeof payload["accountName"] === "string"
          ? payload["accountName"]
          : undefined,
      promptPayId:
        typeof payload["promptPayId"] === "string"
          ? payload["promptPayId"]
          : undefined,
    };
  } catch (error) {
    console.error("[chat-v1] lookup fetch:error", { destinationId: value, error });
    return null;
  }
}

type PreferenceResolver = (uuid: string) => Promise<PreferenceData | null>;
type PiiResolver = (key: string) => Promise<string | null>;
type ProfileNameResolver = (accountId: string) => Promise<string | null>;
type LookupResolver = (
  destinationId: string,
  accountId: string,
) => Promise<LookupDestinationData | null>;

async function enrichPaymentConfirmationWidget(
  uiWidget: Record<string, unknown>,
  resolvePreference: PreferenceResolver,
  resolvePii: PiiResolver,
  resolveProfileName: ProfileNameResolver,
  resolveLookup: LookupResolver,
  sourceAccountId: string,
) {
  if (uiWidget["type"] !== "payment_confirmation") return;

  const uuid = extractUuidFromUi(uiWidget);
  if (uuid) {
    console.log("[chat-v1] payment_confirmation uuid", { uuid });
    const preference = await resolvePreference(uuid);
    if (preference) {
      if (!preference.aliasAdditionalInfo && preference.aliasAccountId) {
        const accountName = await resolveProfileName(preference.aliasAccountId);
        if (accountName) {
          preference.aliasAdditionalInfo = accountName;
        }
      }
      applyPreferenceToUi(uiWidget, preference);
    } else {
      const redisValue = await resolvePii(uuid);
      if (redisValue) {
        const lookup = await resolveLookup(redisValue, sourceAccountId);
        if (lookup) {
          applyLookupDestinationToUi(uiWidget, lookup, redisValue);
        }
      }
    }
  } else {
    console.warn("[chat-v1] payment_confirmation missing uuid");
  }

  const props = getRecord(uiWidget["props"]);
  const pii = props && typeof props["pii"] === "string" ? props["pii"] : "";
  if (pii) {
    const redisKey = extractRedisKeyFromPii(pii);
    if (redisKey) {
      const value = await resolvePii(redisKey);
      if (value) {
        const destinationBank = resolveDestinationBankFromPii(pii);
        applyPiiDestinationToUi(uiWidget, value, destinationBank);
      }
    } else {
      console.warn("[chat-v1] payment_confirmation invalid pii format", { pii });
    }
  }

  ensureCancelAction(uiWidget);
}

async function enrichListWidget(
  listWidget: Record<string, unknown>,
  resolvePreference: PreferenceResolver,
  resolvePii: PiiResolver,
  resolveProfileName: ProfileNameResolver,
  resolveLookup: LookupResolver,
  sourceAccountId: string,
) {
  if (listWidget["type"] !== "list") return;
  const props = getRecord(listWidget["props"]);
  if (!props || !Array.isArray(props["items"])) return;

  for (const item of props["items"]) {
    if (!isRecord(item)) continue;

    if (typeof item["type"] === "string") {
      await enrichPaymentConfirmationWidget(
        item,
        resolvePreference,
        resolvePii,
        resolveProfileName,
        resolveLookup,
        sourceAccountId,
      );
      continue;
    }

    const nestedWidget = getRecord(item["widget"]);
    if (!nestedWidget) continue;
    await enrichPaymentConfirmationWidget(
      nestedWidget,
      resolvePreference,
      resolvePii,
      resolveProfileName,
      resolveLookup,
      sourceAccountId,
    );
  }
}

async function enrichSourceRecord(
  source: Record<string, unknown>,
  resolvePreference: PreferenceResolver,
  resolvePii: PiiResolver,
  resolveProfileName: ProfileNameResolver,
  resolveLookup: LookupResolver,
  sourceAccountId: string,
): Promise<boolean> {
  let changed = false;

  const candidates: Record<string, unknown>[] = [];
  if (typeof source["type"] === "string") candidates.push(source);

  const ui = getRecord(source["ui"]);
  if (ui) {
    candidates.push(ui);
    const widget = getRecord(ui["widget"]);
    if (widget) candidates.push(widget);
  }

  for (const candidate of candidates) {
    const before = JSON.stringify(candidate);
    await enrichPaymentConfirmationWidget(
      candidate,
      resolvePreference,
      resolvePii,
      resolveProfileName,
      resolveLookup,
      sourceAccountId,
    );
    await enrichListWidget(
      candidate,
      resolvePreference,
      resolvePii,
      resolveProfileName,
      resolveLookup,
      sourceAccountId,
    );
    if (!changed && before !== JSON.stringify(candidate)) changed = true;
  }

  return changed;
}

async function enrichPaymentConfirmationResponse(
  data: unknown,
  accountId: string,
): Promise<unknown> {
  if (!isRecord(data)) return data;
  const preferenceCache = new Map<string, PreferenceData | null>();
  const piiCache = new Map<string, string | null>();
  const profileNameCache = new Map<string, string | null>();
  const lookupCache = new Map<string, LookupDestinationData | null>();
  const resolvePreference: PreferenceResolver = async (uuid: string) => {
    if (preferenceCache.has(uuid)) return preferenceCache.get(uuid) ?? null;
    const result = await fetchPreferenceByUuid(uuid, accountId);
    preferenceCache.set(uuid, result);
    return result;
  };
  const resolvePii: PiiResolver = async (key: string) => {
    if (piiCache.has(key)) return piiCache.get(key) ?? null;
    const result = await fetchRedisValueByKey(key, accountId);
    piiCache.set(key, result);
    return result;
  };
  const resolveProfileName: ProfileNameResolver = async (targetAccountId: string) => {
    if (profileNameCache.has(targetAccountId)) {
      return profileNameCache.get(targetAccountId) ?? null;
    }
    const result = await fetchProfileNameByAccountId(targetAccountId);
    profileNameCache.set(targetAccountId, result);
    return result;
  };
  const resolveLookup: LookupResolver = async (
    destinationId: string,
    sourceAccountId: string,
  ) => {
    const cacheKey = `${sourceAccountId}:${destinationId}`;
    if (lookupCache.has(cacheKey)) return lookupCache.get(cacheKey) ?? null;
    const result = await fetchLookupByDestinationId(destinationId, sourceAccountId);
    lookupCache.set(cacheKey, result);
    return result;
  };

  await enrichSourceRecord(
    data,
    resolvePreference,
    resolvePii,
    resolveProfileName,
    resolveLookup,
    accountId,
  );

  const choices = data["choices"];
  if (!Array.isArray(choices)) return data;

  for (const choice of choices) {
    if (!isRecord(choice)) continue;
    const message = getRecord(choice["message"]);
    if (!message || typeof message["content"] !== "string") continue;

    const parsedContent = parseContentJson(message["content"]);
    if (!isRecord(parsedContent)) continue;
    const changed = await enrichSourceRecord(
      parsedContent,
      resolvePreference,
      resolvePii,
      resolveProfileName,
      resolveLookup,
      accountId,
    );
    if (changed) message["content"] = JSON.stringify(parsedContent);
  }

  return data;
}

export const POST = async (req: NextRequest) => {
  const token = process.env.TOKEN ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_CHAT_URL ?? "";

  if (!baseUrl) {
    return NextResponse.json(
      { err_code: "PF_9001", err_message: "Missing NEXT_PUBLIC_CHAT_URL" },
      { status: 500 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { err_code: "PF_9002", err_message: "Missing TOKEN" },
      { status: 500 }
    );
  }

  let payload: ChatRequest | null = null;

  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) throw new Error("Invalid JSON body");

    const client_event_id = getString(body["client_event_id"], "");
    if (!client_event_id) throw new Error("Missing client_event_id");
    if (client_event_id.length > MAX_CLIENT_EVENT_ID_CHARS) {
      throw new Error("client_event_id is too long");
    }

    const model = getString(body["model"], "gemini-3-pro");

    // sessionId: ให้รับจาก body ก่อน, ถ้าไม่มีค่อยดู header, ถ้ายังไม่มี generate
    const sessionIdFromBody = getString(body["sessionId"], "");
    const sessionIdFromHeader = getHeader(req, "x-session-id");
    const sessionId = sessionIdFromBody || sessionIdFromHeader || generateSessionId();
    if (sessionId.length > MAX_SESSION_ID_CHARS) {
      throw new Error("sessionId is too long");
    }

    const accountIdFromBody = getString(body["accountId"], "");
    const accountIdFromHeader = getHeader(req, "x-account-id");
    const accountId = accountIdFromBody || accountIdFromHeader;
    if (accountId.length > MAX_ACCOUNT_ID_CHARS) {
      throw new Error("accountId is too long");
    }

    // ui_action path
    if (isRecord(body["ui_action"])) {
      const ua = body["ui_action"] as Record<string, unknown>;
      const action = getString(ua["action"], "");
      const prepared_id = getString(ua["prepared_id"], "");

      if (!action) throw new Error("Missing ui_action.action");

      // cancel/edit/confirm ต้องมี prepared_id
      if ((action === "confirm_transfer" || action === "cancel" || action === "edit") && !prepared_id) {
        throw new Error("Missing ui_action.prepared_id");
      }

      payload = {
        model,
        ui_action: ua as UIAction,
        client_event_id,
        sessionId,
        accountId,
      };
    } else {
      // messages path
      const msgs = body["messages"];
      if (!Array.isArray(msgs)) throw new Error("Missing messages[]");
      if (msgs.length === 0) throw new Error("messages[] must not be empty");
      if (msgs.length > MAX_MESSAGES) {
        throw new Error(`messages[] exceeds limit (${MAX_MESSAGES})`);
      }

      const messages: ChatMessage[] = [];
      let totalChars = 0;
      let droppedPromptInjectionMessages = 0;

      for (const rawMsg of msgs) {
        if (!isRecord(rawMsg)) throw new Error("Invalid message object");

        const role = getString(rawMsg["role"], "").trim();
        if (!ALLOWED_ROLES.has(role)) {
          throw new Error(`Unsupported role: ${role || "(empty)"}`);
        }

        const contentRaw = getString(rawMsg["content"], "");
        const content = normalizeInputText(contentRaw);
        if (role === "user" && !content) {
          throw new Error("Message content must not be empty");
        }
        if (role === "assistant" && !content) {
          messages.push({
            role: role as "user" | "assistant",
            content,
          });
          continue;
        }
        if (content.length > MAX_MESSAGE_CHARS) {
          throw new Error(`Message exceeds ${MAX_MESSAGE_CHARS} characters`);
        }
        if (role === "user" && hasPromptInjectionSignals(content)) {
          droppedPromptInjectionMessages += 1;
          continue;
        }

        totalChars += content.length;
        if (totalChars > MAX_TOTAL_CHARS) {
          throw new Error(`Total message length exceeds ${MAX_TOTAL_CHARS} characters`);
        }

        messages.push({
          role: role as "user" | "assistant",
          content,
        });
      }
      const hasSafeUserMessage = messages.some((message) => message.role === "user");
      if (!hasSafeUserMessage && droppedPromptInjectionMessages > 0) {
        throw new Error("Potential prompt injection content detected");
      }

      payload = {
        model,
        messages,
        client_event_id,
        sessionId,
        accountId,
      };
    }

    // ส่งต่อไป n8n
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": token,
        // ให้ x-session-id เป็น string ปกติ ไม่ต้อง encodeURIComponent
        "x-session-id": payload.sessionId ?? sessionId,
        "x-account-id": payload.accountId ?? accountId,
        // แนะนำส่งต่อ user-id จาก header ถ้ามี
        "x-user-id": getHeader(req, "x-user-id") || "anonymous",
        // ส่ง request id / client event id ให้ trace ได้
        "X-Request-ID": getHeader(req, "x-request-id") || client_event_id,
      },
      body: JSON.stringify(
        // n8n ใช้ body.messages หรือ body.ui_action + client_event_id
        "messages" in payload
          ? {
              model: payload.model,
              messages: payload.messages,
              client_event_id: payload.client_event_id,
              accountId: payload.accountId ?? accountId,
            }
          : {
              model: payload.model,
              ui_action: payload.ui_action,
              client_event_id: payload.client_event_id,
              accountId: payload.accountId ?? accountId,
            }
      ),
    });

    const data = await resp.json().catch(() => null);
    const enriched = await enrichPaymentConfirmationResponse(
      data,
      payload.accountId ?? accountId,
    );
    console.log(enriched)

    return NextResponse.json(enriched ?? { err_code: "PF_9003", err_message: "Invalid JSON from upstream" }, {
      status: resp.status,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        err_code: "PF_4000",
        err_message: error instanceof Error ? error.message : "Bad Request",
      },
      { status: 400 }
    );
  }
};
