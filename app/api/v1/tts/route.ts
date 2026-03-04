import { NextRequest } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const MAX_TEXT_CHARS = 5000;
const DEFAULT_MODEL_ID = "eleven_v3";
const DEFAULT_OUTPUT_FORMAT = "mp3_22050_32";
const DEFAULT_LANGUAGE_CODE = "th";
const DEFAULT_VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"; // Liam - Energetic, Social Media Creator
const DEFAULT_OPTIMIZE_STREAMING_LATENCY = 4;

export const runtime = "nodejs";

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? process.env.TOKEN ?? "";
}

function getVoiceId(): string {
  return (
    process.env.ELEVENLABS_TTS_VOICE_ID ??
    process.env.NEXT_PUBLIC_ELEVENLABS_TTS_VOICE_ID ??
    DEFAULT_VOICE_ID
  );
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const THAI_DIGIT_WORDS: Record<string, string> = {
  "0": "ศูนย์",
  "1": "หนึ่ง",
  "2": "สอง",
  "3": "สาม",
  "4": "สี่",
  "5": "ห้า",
  "6": "หก",
  "7": "เจ็ด",
  "8": "แปด",
  "9": "เก้า",
};

function normalizeThaiTtsText(value: string): string {
  // Convert only standalone single digits (e.g. list item "1." or " 1 ")
  // so we avoid corrupting multi-digit numbers like amounts/dates.
  return value.replace(/(?<!\d)([0-9])(?!\d)/g, (_, d: string) => THAI_DIGIT_WORDS[d] ?? d);
}

function getTextFromBody(body: unknown): string {
  return typeof body === "object" &&
    body !== null &&
    typeof (body as { text?: unknown }).text === "string"
    ? (body as { text: string }).text
    : "";
}

function getOptionalTextFromBody(body: unknown, key: "previousText" | "nextText"): string {
  if (typeof body !== "object" || body === null) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function getOptimizeStreamingLatency(): number {
  const fromEnv = Number(process.env.ELEVENLABS_TTS_OPTIMIZE_STREAMING_LATENCY ?? "");
  if (Number.isFinite(fromEnv) && fromEnv >= 0 && fromEnv <= 4) {
    return fromEnv;
  }
  return DEFAULT_OPTIMIZE_STREAMING_LATENCY;
}

function supportsOptimizeStreamingLatency(modelId: string): boolean {
  // Eleven v3 does not support optimize_streaming_latency.
  return modelId.trim().toLowerCase() !== "eleven_v3";
}

function supportsContextHints(modelId: string): boolean {
  // Eleven v3 does not support previous_text / next_text yet.
  return modelId.trim().toLowerCase() !== "eleven_v3";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

async function handleTtsRequest(textRaw: string, previousTextRaw = "", nextTextRaw = "") {
  const apiKey = getApiKey();
  if (!apiKey) {
    return Response.json(
      {
        err_code: "PF_9301",
        err_message: "Missing ELEVENLABS_API_KEY",
      },
      { status: 500 },
    );
  }

  try {
    const normalizedText = normalizeText(textRaw);
    if (!normalizedText) {
      return Response.json(
        {
          err_code: "PF_9302",
          err_message: "Missing text",
        },
        { status: 400 },
      );
    }

    const text = normalizeThaiTtsText(normalizedText).slice(0, MAX_TEXT_CHARS);
    const previousText = normalizeThaiTtsText(normalizeText(previousTextRaw)).slice(-400);
    const nextText = normalizeThaiTtsText(normalizeText(nextTextRaw)).slice(0, 400);
    const elevenlabs = new ElevenLabsClient({ apiKey });
    const modelId = process.env.ELEVENLABS_TTS_MODEL_ID ?? DEFAULT_MODEL_ID;
    const request: Parameters<ElevenLabsClient["textToSpeech"]["stream"]>[1] = {
      text,
      modelId,
      outputFormat: DEFAULT_OUTPUT_FORMAT,
      languageCode: DEFAULT_LANGUAGE_CODE,
      applyTextNormalization: "off",
      ...(supportsContextHints(modelId) && previousText ? { previousText } : {}),
      ...(supportsContextHints(modelId) && nextText ? { nextText } : {}),
      ...(supportsOptimizeStreamingLatency(modelId)
        ? { optimizeStreamingLatency: getOptimizeStreamingLatency() }
        : {}),
    };
    let audioStream: Awaited<ReturnType<ElevenLabsClient["textToSpeech"]["stream"]>>;
    try {
      audioStream = await elevenlabs.textToSpeech.stream(getVoiceId(), request);
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      const shouldRetryWithoutContext =
        message.includes("previous_text") || message.includes("next_text");
      const shouldRetryWithoutLatency = message.includes("optimize_streaming_latency");

      if (!shouldRetryWithoutContext && !shouldRetryWithoutLatency) {
        throw error;
      }

      const retryRequest: Parameters<ElevenLabsClient["textToSpeech"]["stream"]>[1] = {
        text,
        modelId,
        outputFormat: DEFAULT_OUTPUT_FORMAT,
        languageCode: DEFAULT_LANGUAGE_CODE,
        applyTextNormalization: "off",
        ...(shouldRetryWithoutContext
          ? {}
          : {
              ...(previousText ? { previousText } : {}),
              ...(nextText ? { nextText } : {}),
            }),
        ...(shouldRetryWithoutLatency
          ? {}
          : supportsOptimizeStreamingLatency(modelId)
            ? { optimizeStreamingLatency: getOptimizeStreamingLatency() }
            : {}),
      };

      audioStream = await elevenlabs.textToSpeech.stream(getVoiceId(), retryRequest);
    }

    return new Response(audioStream, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate speech";
    return Response.json(
      {
        err_code: "PF_9303",
        err_message: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const textRaw = req.nextUrl.searchParams.get("text") ?? "";
  const previousTextRaw = req.nextUrl.searchParams.get("previousText") ?? "";
  const nextTextRaw = req.nextUrl.searchParams.get("nextText") ?? "";
  return handleTtsRequest(textRaw, previousTextRaw, nextTextRaw);
}

export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  return handleTtsRequest(
    getTextFromBody(body),
    getOptionalTextFromBody(body, "previousText"),
    getOptionalTextFromBody(body, "nextText"),
  );
}
