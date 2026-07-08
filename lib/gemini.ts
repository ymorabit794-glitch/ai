// ───────────────────────────────────────────────────────────────
//  Gemini text generation (streaming) via the official REST API.
//  Accepts the FULL conversation history so the judge holds a real
//  multi-turn chat (like ChatGPT / Claude / Gemini), in persona.
// ───────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "gemini-2.5-flash";

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface GeminiStreamParams {
  history: ChatTurn[];
  systemPrompt: string;
}

/**
 * Streams the model's reply token-by-token, given the whole chat
 * history (so the judge remembers what was said earlier).
 */
export async function* streamGeminiText({
  history,
  systemPrompt,
}: GeminiStreamParams): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const contents = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.95,
      topP: 0.95,
      maxOutputTokens: 1200,
      // Disable "thinking" — it ate the output-token budget and caused
      // truncated/empty replies. Off = faster, full answers, and great
      // at understanding Moroccan Darija + Arabizi.
      thinkingConfig: { thinkingBudget: 0 },
    },
    // Roast persona: don't let safety refuse crude/insulting user input.
    // (The system prompt still forbids inciting real violence.)
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  // Free-tier models occasionally return 503 (high demand) or a
  // transient 429. Retry a few times with backoff before giving up.
  let res: Response | null = null;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok && res.body) break;

    // 429 = daily/minute quota exhausted — it won't recover in seconds,
    // so fail fast (lets the hybrid provider fall back to Groq at once).
    // Only 503 (temporary overload) is worth retrying.
    const transient = res.status === 503;
    if (!transient || attempt === maxAttempts) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Gemini request failed (${res.status}): ${detail}`);
    }
    // backoff: 0.8s, 1.6s, 2.4s
    await new Promise((r) => setTimeout(r, attempt * 800));
  }

  if (!res || !res.ok || !res.body) {
    throw new Error("Gemini request failed: no response");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let emittedChars = 0;
  let finishReason: string | null = null;

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
        const cand = parsed?.candidates?.[0];
        if (cand?.finishReason) finishReason = cand.finishReason;
        const parts = cand?.content?.parts;
        if (Array.isArray(parts)) {
          for (const p of parts) {
            if (typeof p?.text === "string" && p.text.length) {
              emittedChars += p.text.length;
              yield p.text;
            }
          }
        }
      } catch {
        buffer = trimmed + "\n" + buffer;
      }
    }
  }

  // Gemini sometimes aborts the stream mid-answer (RECITATION/SAFETY),
  // leaving a truncated fragment. If almost nothing was produced, treat
  // it as a failure so the hybrid provider can fall back to Groq.
  console.log(
    `[gemini] finished: reason=${finishReason} chars=${emittedChars}`
  );
  // Streams sometimes die silently (no finishReason at all) or get cut
  // by RECITATION/SAFETY after a few characters. A short answer without
  // an explicit STOP is a failure — let the hybrid fall back to Groq.
  if (emittedChars < 150 && finishReason !== "STOP") {
    throw new Error(
      `Gemini stream ended early (${finishReason ?? "no finish reason"})`
    );
  }
}
