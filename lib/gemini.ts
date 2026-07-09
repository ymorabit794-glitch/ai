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
  image?: string; // data URL attached to the latest user turn (vision)
}

/**
 * Streams the model's reply token-by-token, given the whole chat
 * history (so the judge remembers what was said earlier).
 */
// All configured API keys (different Google accounts = separate free
// quotas), each paired with its own model: newer Google accounts only
// get newer models (e.g. account 1 → gemini-2.5-flash, account 2 →
// gemini-3.1-flash-lite). When one key fails (quota out, model not
// available), the next pair takes over automatically.
function getKeyModelPairs(): Array<{ key: string; model: string }> {
  const base = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  return [
    { key: process.env.GEMINI_API_KEY, model: base },
    {
      key: process.env.GEMINI_API_KEY_2,
      model: process.env.GEMINI_MODEL_2 || base,
    },
    {
      key: process.env.GEMINI_API_KEY_3,
      model: process.env.GEMINI_MODEL_3 || base,
    },
  ].filter((p): p is { key: string; model: string } => !!p.key);
}

export async function* streamGeminiText({
  history,
  systemPrompt,
  image,
}: GeminiStreamParams): AsyncGenerator<string> {
  const pairs = getKeyModelPairs();
  if (pairs.length === 0) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env.local");
  }

  const contents = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }] as Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >,
  }));

  // Attach the image to the last user turn (Gemini Flash is multimodal).
  // Data URL format: data:<mime>;base64,<data>
  if (image && contents.length) {
    const m = /^data:([^;]+);base64,(.+)$/s.exec(image);
    if (m) {
      const last = contents[contents.length - 1];
      if (last.role === "user") {
        last.parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
      }
    }
  }

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

  // Try each key+model pair in order. 429 (quota), 400/403 (bad key),
  // 404 (model not available to this account) → next pair. 503
  // (temporary overload) is retried on the same pair with backoff.
  let res: Response | null = null;
  let lastError = "";
  keyLoop: for (let k = 0; k < pairs.length; k++) {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${pairs[k].model}:streamGenerateContent?alt=sse&key=${pairs[k].key}`;

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok && res.body) {
        if (k > 0)
          console.log(`[gemini] using key #${k + 1} (${pairs[k].model})`);
        break keyLoop;
      }

      if ([429, 400, 403, 404].includes(res.status)) {
        lastError = `key #${k + 1} failed (${res.status})`;
        console.log(`[gemini] ${lastError} — trying next key`);
        continue keyLoop;
      }

      const transient = res.status === 503;
      if (!transient || attempt === maxAttempts) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Gemini request failed (${res.status}): ${detail}`);
      }
      // backoff: 0.8s, 1.6s
      await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }

  if (!res || !res.ok || !res.body) {
    throw new Error(
      `Gemini request failed: all API keys exhausted (${lastError || "no response"})`
    );
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
