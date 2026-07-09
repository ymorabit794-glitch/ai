import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Turn a (often Darija) idea into a vivid English image prompt for Flux.
// Improves general scenes/objects a lot. (Specific real people still
// won't render — that's a model limitation, not a prompt issue.)
async function enhancePrompt(raw: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return raw;
  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "the-cynic-judge/1.0",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content:
                "Convert the user's idea (often Moroccan Darija/Arabic) into ONE concise, vivid ENGLISH text-to-image prompt. Keep any specific names of people, brands or places. Add useful visual detail, composition and style. Output ONLY the prompt, no quotes, no explanation.",
            },
            { role: "user", content: raw },
          ],
          temperature: 0.4,
          max_tokens: 160,
        }),
      }
    );
    if (!res.ok) return raw;
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content?.trim();
    return out && out.length > 2 ? out : raw;
  } catch {
    return raw;
  }
}

// Nano Banana (Gemini image generation) — best quality. Tries every
// configured Gemini key; returns null when quota is out or it fails,
// so the caller falls back to the free providers.
async function nanoBanana(prompt: string): Promise<string | null> {
  // Each key gets its own image model: newer Google accounts only have
  // the newer image models (gemini-3.1-flash-image), older ones use
  // gemini-2.5-flash-image.
  const baseModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const pairs = [
    { key: process.env.GEMINI_API_KEY, model: baseModel },
    {
      key: process.env.GEMINI_API_KEY_2,
      model: process.env.GEMINI_IMAGE_MODEL_2 || "gemini-3.1-flash-image",
    },
    {
      key: process.env.GEMINI_API_KEY_3,
      model: process.env.GEMINI_IMAGE_MODEL_3 || baseModel,
    },
  ].filter((p): p is { key: string; model: string } => !!p.key);

  for (const { key, model } of pairs) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
          signal: AbortSignal.timeout(45000),
        }
      );
      if (!res.ok) continue; // quota/billing → next key or fallback
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const inline = p?.inlineData;
          if (inline?.data) {
            const mime = inline.mimeType || "image/png";
            return `data:${mime};base64,${inline.data}`;
          }
        }
      }
    } catch {
      /* try next key */
    }
  }
  return null;
}

// Image generation. Primary: Nano Banana (Gemini) when quota allows.
// Then: Cloudflare Workers AI (Flux, free, 1024px).
// Fallback: Pollinations (free, no key) if Cloudflare is unavailable.
export async function POST(req: NextRequest) {
  let prompt = "";
  try {
    const body = await req.json();
    prompt = (body?.prompt ?? "").toString().trim();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if (!prompt) return Response.json({ error: "empty" }, { status: 422 });

  const enhanced = await enhancePrompt(prompt);
  const styled =
    enhanced + ", highly detailed, sharp focus, cinematic lighting, 4k";

  const banana = await nanoBanana(styled);
  if (banana) return Response.json({ image: banana });

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (accountId && token) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: styled, steps: 8 }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.result?.image;
        if (b64) {
          return Response.json({ image: `data:image/jpeg;base64,${b64}` });
        }
      }
    } catch {
      /* fall through to Pollinations */
    }
  }

  // Fallback: Pollinations (free, no key)
  const seed = Math.floor(Math.random() * 1e9);
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(styled) +
    `?width=1024&height=1024&model=flux&enhance=true&nologo=true&seed=${seed}`;
  return Response.json({ image: url });
}
