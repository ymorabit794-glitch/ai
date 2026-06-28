// ───────────────────────────────────────────────────────────────
//  Groq text generation (streaming) via the OpenAI-compatible API.
//  Free, very fast, generous limits. Same persona as Gemini since the
//  character lives entirely in the system prompt.
// ───────────────────────────────────────────────────────────────

import type { ChatTurn } from "./gemini";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// Strip stray characters from scripts that should never appear in an
// Arabic/Darija reply (Cyrillic, CJK, Devanagari, Hangul, Kana...).
// Llama occasionally emits visually-similar glyphs from these ranges.
const FOREIGN_SCRIPT =
  /[Ѐ-ԯऀ-ॿ぀-ヿ㐀-䶿一-鿿가-힯]/g;

function sanitize(text: string): string {
  return text.replace(FOREIGN_SCRIPT, "");
}

export interface GroqStreamParams {
  history: ChatTurn[];
  systemPrompt: string;
}

export async function* streamGroqText({
  history,
  systemPrompt,
}: GroqStreamParams): AsyncGenerator<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local");
  }

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  // Map our Gemini-style roles ("model") to OpenAI-style ("assistant").
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((t) => ({
      role: t.role === "model" ? "assistant" : "user",
      content: t.text,
    })),
  ];

  const body: Record<string, unknown> = {
    model,
    messages,
    // Slightly lower temp reduces stray non-Arabic characters mid-word.
    temperature: 0.8,
    top_p: 0.9,
    // gpt-oss spends tokens on hidden reasoning, so give headroom.
    max_tokens: 2048,
    stream: true,
  };

  // gpt-oss models reason before answering — keep it light & hidden so
  // the reply stays fast and the reasoning never leaks into the text.
  if (model.includes("gpt-oss")) {
    body.reasoning_effort = "low";
  }

  // Free-tier TPM limits return 429 (with a short retry window) or 503.
  // Retry a few times with backoff so transient limits don't surface.
  let res: Response | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Avoid Cloudflare bot blocks (error 1010) on default UAs.
        "User-Agent": "the-cynic-judge/1.0",
      },
      body: JSON.stringify(body),
    });

    if (res.ok && res.body) break;

    const transient = res.status === 429 || res.status === 503;
    if (!transient || attempt === maxAttempts) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Groq request failed (${res.status}): ${detail}`);
    }
    await new Promise((r) => setTimeout(r, attempt * 1200));
  }

  if (!res || !res.ok || !res.body) {
    throw new Error("Groq request failed: no response");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const json = trimmed.slice(5).trim();
      if (!json || json === "[DONE]") continue;

      try {
        const parsed = JSON.parse(json);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length) {
          const clean = sanitize(delta);
          if (clean.length) yield clean;
        }
      } catch {
        buffer = trimmed + "\n" + buffer;
      }
    }
  }
}
