import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Speech-to-text via Groq Whisper (free, great at Arabic/Darija).
// Receives an audio blob, returns the transcribed Arabic text.
export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "no audio" }, { status: 422 });
  }

  // Pick a filename extension Groq recognizes from the blob's mime type.
  const type = file.type || "audio/webm";
  const ext = type.includes("mp4")
    ? "mp4"
    : type.includes("ogg")
      ? "ogg"
      : type.includes("wav")
        ? "wav"
        : "webm";

  const upstream = new FormData();
  upstream.append("file", file, `audio.${ext}`);
  // Full large-v3 is more accurate on Darija than the turbo variant.
  upstream.append("model", "whisper-large-v3");
  upstream.append("language", "ar");
  // Bias Whisper toward Moroccan Darija vocabulary instead of MSA.
  upstream.append(
    "prompt",
    "تسجيل صوتي بالدارجة المغربية العامية. كلمات مغربية مثل: واش، شنو، بزاف، دابا، خويا، مزيان، علاش، كاين، بغيت، فلوس، خدمة."
  );
  upstream.append("temperature", "0");
  upstream.append("response_format", "json");

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return Response.json(
        { error: `transcription failed (${res.status}): ${detail}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const raw = (data?.text ?? "").toString().trim();
    // NOTE: tried an LLM "correction" pass here, but the free small
    // model rewrote sentences and changed meaning — worse, not better.
    // Whisper's raw output is more faithful, so we return it directly.
    return Response.json({ text: raw });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
