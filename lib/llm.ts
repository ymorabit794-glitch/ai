// ───────────────────────────────────────────────────────────────
//  Provider selector. Switch engines with LLM_PROVIDER in .env.local:
//    "groq"   → Groq only (free, fast)            [default here]
//    "gemini" → Gemini only (best Darija)
//    "hybrid" → Gemini first, fall back to Groq on failure
//  The persona is identical in all cases (same system prompt).
// ───────────────────────────────────────────────────────────────

import { streamGeminiText, type ChatTurn } from "./gemini";
import { streamGroqText } from "./groq";
import { webSearch, toSearchQuery, formatHits } from "./websearch";

export type { ChatTurn };

export interface StreamParams {
  history: ChatTurn[];
  systemPrompt: string;
  image?: string; // when present, route to a vision-capable model
}

const VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

// Heuristic: does the latest user message ask about current/live info?
// Covers Darija (Arabic + Arabizi), Arabic, French and English.
const FRESH_RE =
  /(اليوم|البارح|دابا|هاد (السيمانة|الأسبوع|الشهر|العام)|آخر|أخبار|جديدة?|سعر|أسعار|ثمن|نتيجة|ماتش|مباراة|ميركاتو|انتقالات|كلاسيكو|طقس|بورصة|عملة|بيتكوين|دولار|درهم|أورو|انتخابات|مباريات|ترتيب|جدولة|20(2[4-9]|3[0-9])|today|right now|latest|news|price|score|who won|weather|current|stock|bitcoin|crypto|exchange rate|standings|transfer|aujourd|maintenant|derni[eè]re?s?|actualit|prix|m[ée]t[ée]o|r[ée]sultat|akhbar|akhir|jdid|daba|lyoma|lbare?7|match|natija|ta9s|se3r|taman|mercato)/i;

function lastUserText(history: ChatTurn[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "user") return history[i].text;
  }
  return "";
}

// For fresh-info questions: run a free web search and append the top
// results to the system prompt so the model can answer with current
// information. Any failure just returns the params unchanged.
async function withFreshContext(params: StreamParams): Promise<StreamParams> {
  const text = lastUserText(params.history);
  if (!text || !FRESH_RE.test(text)) return params;
  const honesty =
    "\n\n━━━ تنبيه ━━━\nالسؤال يتعلق بمعلومات حديثة/حالية، ولم تنجح أي عملية بحث في الويب الآن. لا تخترع أخبارا أو أرقاما أو نتائج. قل بصراحة (بشخصيتك) أنك ما عندكش وصول للمعلومات الحديثة فهاد اللحظة، وجاوب فقط بما هو مؤكد وعام.";
  try {
    const query = await toSearchQuery(text);
    const hits = await webSearch(query);
    if (hits.length === 0) {
      return { ...params, systemPrompt: params.systemPrompt + honesty };
    }
    return {
      ...params,
      systemPrompt: params.systemPrompt + formatHits(hits, query),
    };
  } catch {
    return { ...params, systemPrompt: params.systemPrompt + honesty };
  }
}

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

  // Fresh-info questions get free web-search results injected into the
  // system context before any model answers (all providers).
  const enriched = await withFreshContext(params);

  if (provider === "groq") {
    yield* streamGroqText(enriched);
    return;
  }

  if (provider === "gemini") {
    yield* streamGeminiText(enriched);
    return;
  }

  // hybrid: try Gemini (smartest free option); if it fails BEFORE
  // emitting anything (quota/503), fall back to Groq silently.
  // (Once tokens have streamed we can't safely restart mid-message.)
  let emitted = false;
  try {
    for await (const chunk of streamGeminiText(enriched)) {
      emitted = true;
      yield chunk;
    }
  } catch (err) {
    if (emitted) throw err;
    yield* streamGroqText(enriched);
  }
}
