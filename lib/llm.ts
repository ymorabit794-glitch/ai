// ───────────────────────────────────────────────────────────────
//  Provider selector. Switch engines with LLM_PROVIDER in .env.local:
//    "groq"   → Groq only (free, fast)            [default here]
//    "gemini" → Gemini only (best Darija)
//    "hybrid" → Gemini first, fall back to Groq on failure
//  The persona is identical in all cases (same system prompt).
// ───────────────────────────────────────────────────────────────

import { streamGeminiText, type ChatTurn } from "./gemini";
import { streamGroqText } from "./groq";

export type { ChatTurn };

export interface StreamParams {
  history: ChatTurn[];
  systemPrompt: string;
  image?: string; // when present, route to a vision-capable model
}

const VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

export async function* streamLLM(params: StreamParams): AsyncGenerator<string> {
  // Images need a multimodal model — always use Groq vision regardless of
  // the configured text provider.
  if (params.image) {
    yield* streamGroqText({
      history: params.history,
      systemPrompt: params.systemPrompt,
      image: params.image,
      model: VISION_MODEL,
    });
    return;
  }

  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();

  if (provider === "groq") {
    yield* streamGroqText(params);
    return;
  }

  if (provider === "gemini") {
    yield* streamGeminiText(params);
    return;
  }

  // hybrid: try Gemini; if it fails BEFORE emitting anything, use Groq.
  // (Once tokens have streamed we can't safely restart mid-message.)
  let emitted = false;
  try {
    for await (const chunk of streamGeminiText(params)) {
      emitted = true;
      yield chunk;
    }
  } catch (err) {
    if (emitted) throw err;
    yield* streamGroqText(params);
  }
}
