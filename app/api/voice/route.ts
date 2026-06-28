import { NextRequest } from "next/server";
import { synthesizeSpeech } from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepts the final verdict text and returns MP3 audio bytes.
export async function POST(req: NextRequest) {
  let text = "";
  try {
    const body = await req.json();
    text = (body?.text ?? "").toString().trim();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (!text) {
    return new Response("Empty input", { status: 422 });
  }

  // ElevenLabs has per-request character limits; keep it sane.
  const clipped = text.slice(0, 2500);

  try {
    const audio = await synthesizeSpeech({ text: clipped });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
