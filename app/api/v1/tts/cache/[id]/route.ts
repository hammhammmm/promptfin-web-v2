import { NextRequest } from "next/server";
import { readPreloadedTts } from "@/src/server/ttsPreloadCache";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = readPreloadedTts(id);
  if (!item) {
    return Response.json(
      {
        err_code: "PF_9311",
        err_message: "TTS audio not found or expired",
      },
      { status: 404 },
    );
  }

  return new Response(new Uint8Array(item.audio), {
    status: 200,
    headers: {
      "Content-Type": item.contentType,
      "Cache-Control": "no-store",
    },
  });
}
