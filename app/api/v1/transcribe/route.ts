import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SpeechToTextConvertRequestModelId } from "@elevenlabs/elevenlabs-js/api/resources/speechToText/types";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const DEFAULT_MODEL_ID = "scribe_v1";
const SUPPORTED_MODEL_IDS = new Set<SpeechToTextConvertRequestModelId>(["scribe_v1", "scribe_v2"]);

export const runtime = "nodejs";

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? process.env.TOKEN ?? "";
}

function resolveModelId(input: string): SpeechToTextConvertRequestModelId {
  if (SUPPORTED_MODEL_IDS.has(input as SpeechToTextConvertRequestModelId)) {
    return input as SpeechToTextConvertRequestModelId;
  }
  return DEFAULT_MODEL_ID;
}

export async function POST(req: NextRequest) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        err_code: "PF_9201",
        err_message: "Missing ELEVENLABS_API_KEY",
      },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    const languageCode = String(formData.get("languageCode") ?? "th");
    const requestedModel = String(formData.get("modelId") ?? "").trim();

    if (!(audioFile instanceof File)) {
      return NextResponse.json(
        {
          err_code: "PF_9202",
          err_message: "Missing audio file",
        },
        { status: 400 },
      );
    }

    if (!audioFile.size) {
      return NextResponse.json(
        {
          err_code: "PF_9203",
          err_message: "Audio file is empty",
        },
        { status: 400 },
      );
    }

    if (audioFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          err_code: "PF_9204",
          err_message: "Audio file is too large",
        },
        { status: 413 },
      );
    }

    const modelId = resolveModelId(
      requestedModel || process.env.ELEVENLABS_STT_MODEL_ID || DEFAULT_MODEL_ID,
    );
    const elevenlabs = new ElevenLabsClient({ apiKey });
    const response = await elevenlabs.speechToText.convert({
      modelId,
      languageCode,
      file: audioFile,
      diarize: false,
      tagAudioEvents: false,
    });

    const text = typeof response.text === "string" ? response.text.trim() : "";
    return NextResponse.json({
      text,
      languageCode: response.languageCode,
      modelId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json(
      {
        err_code: "PF_9205",
        err_message: message,
      },
      { status: 500 },
    );
  }
}
