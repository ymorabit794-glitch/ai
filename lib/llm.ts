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

// "Who is X / do you know X" questions about (often local Moroccan)
// people or entities the model can't know reliably → web search too,
// preferring the general index over news.
const PERSON_RE =
  /(كتعرفي?|واش (كت|ت)عرف|شكون (هو|هي|هوما|هاد)|عرفني ب|kat3re?f|kat3r |wach t(a3?|3)re?f|chkoun?|3re?fni|who is|who'?s|do you know|heard of|qui est|tu connais|c'?est qui|conoces|quien es)/i;

// For person questions we take the name straight from the user's text
// (an LLM rewrite can silently "correct" names to different people).
// Strip the question words and keep the rest as the query.
const PERSON_STRIP_RE =
  /(كتعرفي?|واش (كت|ت)عرف|شكون (هو|هي|هوما|هاد)|عرفني ب|kat3re?f|kat3r|wach t(a3?|3)re?f|chkoun?|3re?fni|who is|who'?s|do you know|have you heard of|heard of|qui est|tu connais|c'?est qui|conoces|quien es|واش|wach)/gi;

function personQuery(text: string): string {
  return text
    .replace(PERSON_STRIP_RE, " ")
    .replace(/[؟?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
  const isFresh = FRESH_RE.test(text);
  const isPerson = PERSON_RE.test(text);
  if (!text || (!isFresh && !isPerson)) return params;
  const honesty =
    "\n\n━━━ تنبيه ━━━\nالسؤال يتعلق بمعلومات حديثة/حالية، ولم تنجح أي عملية بحث في الويب الآن. لا تخترع أخبارا أو أرقاما أو نتائج. قل بصراحة (بشخصيتك) أنك ما عندكش وصول للمعلومات الحديثة فهاد اللحظة، وجاوب فقط بما هو مؤكد وعام.";
  try {
    const stripped = isPerson ? personQuery(text) : "";
    const query =
      isPerson && stripped.length >= 3 ? stripped : await toSearchQuery(text);
    const hits = await webSearch(query, 5, { preferGeneral: isPerson });
    console.log(
      `[search] q=${JSON.stringify(query)} person=${isPerson} hits=${hits.length}`
    );
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
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();

  // Pure Gemini Flash: chat AND image analysis both go through Gemini
  // (it's multimodal). No web search, no fallback.
  if (provider === "gemini") {
    yield* streamGeminiText(params);
    return;
  }

  // Other modes: images need a multimodal model — use Groq vision.
  if (params.image) {
    yield* streamGroqText({
      history: params.history,
      systemPrompt: params.systemPrompt,
      image: params.image,
      model: VISION_MODEL,
    });
    return;
  }

  // Fresh-info questions get free web-search results injected into the
  // system context before the model answers (groq / hybrid).
  const enriched = await withFreshContext(params);

  if (provider === "groq") {
    yield* streamGroqText(enriched);
    return;
  }

  // hybrid: try Gemini (smartest free option); fall back to Groq
  // silently on failure. The first ~150 chars are buffered before being
  // shown, so early aborts (quota, 503, RECITATION cut-offs) switch to
  // Groq without the user ever seeing a truncated fragment.
  const HOLD = 150;
  let held: string[] = [];
  let heldLen = 0;
  let flushed = false;
  try {
    for await (const chunk of streamGeminiText(enriched)) {
      if (flushed) {
        yield chunk;
      } else {
        held.push(chunk);
        heldLen += chunk.length;
        if (heldLen >= HOLD) {
          flushed = true;
          yield held.join("");
          held = [];
        }
      }
    }
    // Short-but-complete answer: release whatever was held.
    if (!flushed && held.length) yield held.join("");
  } catch (err) {
    console.log(
      `[hybrid] gemini failed (flushed=${flushed}):`,
      err instanceof Error ? err.message.slice(0, 120) : err
    );
    if (flushed) throw err;
    yield* streamGroqText(enriched);
  }
}
