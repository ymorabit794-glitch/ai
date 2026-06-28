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
}

export async function* streamLLM(params: StreamParams): AsyncGenerator<string> {
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
