import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const runtime = "nodejs";

function getApiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? process.env.TOKEN ?? "";
}

export async function GET() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        err_code: "PF_9206",
        err_message: "Missing ELEVENLABS_API_KEY",
      },
      { status: 500 },
    );
  }

  try {
    const elevenlabs = new ElevenLabsClient({ apiKey });
    const response = await elevenlabs.tokens.singleUse.create("realtime_scribe");

    return NextResponse.json({
      token: response.token,
      modelId: "scribe_v2_realtime",
      languageCode: "th",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create realtime token";
    return NextResponse.json(
      {
        err_code: "PF_9207",
        err_message: message,
      },
      { status: 500 },
    );
  }
}
