import { NextRequest, NextResponse } from "next/server";

const TRACE_BASE_URL =
  "https://mcp-server-v2-46469170160.asia-southeast1.run.app/trace";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toTimestampOrZero(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
    const t = Date.parse(value);
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

type SessionCandidate = { sessionId: string; timestamp: number };

function getAccountId(req: NextRequest): string {
  const queryAccountId = req.nextUrl.searchParams.get("accountId");
  if (queryAccountId) return queryAccountId;
  return req.headers.get("x-account-id") ?? "";
}

function getSessionIdFromRecord(value: Record<string, unknown>): string {
  return (
    toStringOrEmpty(value["sessionId"]) ||
    toStringOrEmpty(value["session_id"]) ||
    toStringOrEmpty(value["id"]) ||
    ""
  );
}

function getTimestampFromRecord(value: Record<string, unknown>): number {
  return Math.max(
    toTimestampOrZero(value["updatedAt"]),
    toTimestampOrZero(value["createdAt"]),
    toTimestampOrZero(value["timestamp"]),
    toTimestampOrZero(value["time"]),
    toTimestampOrZero(value["ts"]),
  );
}

function collectSessionCandidates(value: unknown): SessionCandidate[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSessionCandidates(item));
  }
  if (!isRecord(value)) return [];

  const out: SessionCandidate[] = [];
  const sessionId = getSessionIdFromRecord(value);
  if (sessionId) {
    out.push({
      sessionId,
      timestamp: getTimestampFromRecord(value),
    });
  }

  out.push(...collectSessionCandidates(value["data"]));
  out.push(...collectSessionCandidates(value["items"]));
  out.push(...collectSessionCandidates(value["sessions"]));
  out.push(...collectSessionCandidates(value["traces"]));
  return out;
}

function pickLatestSessionId(value: unknown): string {
  const candidates = collectSessionCandidates(value);
  if (!candidates.length) return "";

  candidates.sort((a, b) => b.timestamp - a.timestamp);
  return candidates[0]?.sessionId ?? "";
}

function extractMessageFromEvent(event: unknown): string {
  if (!isRecord(event)) return "";

  const message = event["message"];
  if (typeof message === "string") return message;
  if (isRecord(message) && typeof message["text"] === "string") {
    return message["text"];
  }

  if (typeof event["content"] === "string") return event["content"];
  if (typeof event["text"] === "string") return event["text"];
  return "";
}

function extractEventMessage(value: unknown): string {
  if (!isRecord(value)) return "";

  const data = isRecord(value["data"]) ? value["data"] : value;
  const events = Array.isArray(data["events"]) ? data["events"] : [];
  if (!events.length) return "";

  // Prefer latest meaningful event; skip generic "new session" marker.
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const text = extractMessageFromEvent(events[i]).trim();
    if (!text) continue;
    if (text === "เริ่มต้นเซสชันใหม่") continue;
    return text;
  }

  // Fallback in case every event is generic.
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const text = extractMessageFromEvent(events[i]).trim();
    if (text) return text;
  }

  return "";
}

export async function GET(req: NextRequest) {
  const accountId = getAccountId(req);

  try {
    const listResponse = await fetch(TRACE_BASE_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-account-id": accountId,
      },
    });

    if (!listResponse.ok) {
      return NextResponse.json(
        { err_message: "Failed to fetch trace list" },
        { status: listResponse.status },
      );
    }

    const listData: unknown = await listResponse.json().catch(() => null);
    const sessionId = pickLatestSessionId(listData);

    if (!sessionId) {
      return NextResponse.json({ sessionId: null, message: null });
    }

    const detailResponse = await fetch(
      `${TRACE_BASE_URL}/${encodeURIComponent(sessionId)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          "x-account-id": accountId,
        },
      },
    );

    if (!detailResponse.ok) {
      return NextResponse.json(
        { sessionId, message: null, err_message: "Failed to fetch trace detail" },
        { status: detailResponse.status },
      );
    }

    const detailData: unknown = await detailResponse.json().catch(() => null);
    const message = extractEventMessage(detailData);

    return NextResponse.json({
      sessionId,
      message: message || null,
    });
  } catch {
    return NextResponse.json(
      { err_message: "Unexpected error while fetching trace" },
      { status: 500 },
    );
  }
}
