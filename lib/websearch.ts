// ───────────────────────────────────────────────────────────────
//  Free web search (DuckDuckGo lite — no API key) used to give the
//  model fresh information: we fetch top results server-side and
//  inject them into the system context.
// ───────────────────────────────────────────────────────────────

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x?\d+;?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SearchHit {
  title: string;
  snippet: string;
}

// Tavily (free tier: ~1000 searches/month) — stable, built for LLMs.
// Used when TAVILY_API_KEY is set; DuckDuckGo lite is the fallback.
async function tavilySearch(
  query: string,
  maxResults: number
): Promise<SearchHit[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: maxResults,
        search_depth: "basic",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((r: { title?: string; content?: string }) => ({
      title: (r.title ?? "").toString(),
      snippet: (r.content ?? "").toString().slice(0, 300),
    }));
  } catch {
    return [];
  }
}

export async function webSearch(
  query: string,
  maxResults = 5
): Promise<SearchHit[]> {
  // Prefer Tavily when configured (much more reliable than DDG).
  const tavily = await tavilySearch(query, maxResults);
  if (tavily.length > 0) return tavily;
  return ddgSearch(query, maxResults);
}

async function ddgSearch(
  query: string,
  maxResults = 5
): Promise<SearchHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(
      "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(query),
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: controller.signal,
      }
    );
    if (!res.ok) return [];
    const html = await res.text();

    const titles = [
      ...html.matchAll(/class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/g),
    ].map((m) => stripHtml(m[1]));
    const snippets = [
      ...html.matchAll(/class=['"]result-snippet['"]>([\s\S]*?)<\/td>/g),
    ].map((m) => stripHtml(m[1]));

    const hits: SearchHit[] = [];
    for (let i = 0; i < Math.min(titles.length, maxResults); i++) {
      if (titles[i]) {
        hits.push({ title: titles[i], snippet: snippets[i] || "" });
      }
    }
    return hits;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Turn the user's (often Darija/Arabizi) question into a short English
// search query using a tiny fast model. Falls back to the raw text.
export async function toSearchQuery(text: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return text;
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
                "Convert the user's message (often Moroccan Darija or Arabizi) into ONE short English web-search query capturing what current information they want. Output ONLY the query, nothing else.",
            },
            { role: "user", content: text },
          ],
          temperature: 0,
          max_tokens: 40,
        }),
      }
    );
    if (!res.ok) return text;
    const data = await res.json();
    const q = data?.choices?.[0]?.message?.content?.trim();
    return q && q.length > 1 ? q.replace(/^["']|["']$/g, "") : text;
  } catch {
    return text;
  }
}

// Formats search hits as a context block for the system prompt.
export function formatHits(hits: SearchHit[], query: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines = hits
    .map((h, i) => `${i + 1}. ${h.title}${h.snippet ? " — " + h.snippet : ""}`)
    .join("\n");
  return (
    `\n\n━━━ معلومات حديثة من بحث الويب (بتاريخ ${today}، عن: "${query}") ━━━\n` +
    lines +
    `\nاعتمد على هاد المعلومات فالجواب إلا كانت متعلقة بالسؤال، وجاوب بشخصيتك العادية. إلا ما كانتش كافية قول بصراحة أنك ما لقيتيش معلومات مؤكدة.`
  );
}
