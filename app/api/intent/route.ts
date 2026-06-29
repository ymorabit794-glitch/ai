import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight classifier: does the user want an image generated?
// Returns { action: "image", prompt } or { action: "chat" }.
export async function POST(req: NextRequest) {
  let text = "";
  try {
    const body = await req.json();
    text = (body?.text ?? "").toString().trim();
  } catch {
    return Response.json({ action: "chat" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !text) return Response.json({ action: "chat" });

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
                'You classify intent. The user writes in Moroccan Darija/Arabic. If the user is asking to CREATE, GENERATE, DRAW, MAKE or IMAGINE an image / picture / drawing / poster / logo, return JSON {"action":"image","prompt":"<a concise vivid ENGLISH description of the image they want>"}. For anything else (questions, chat, asking about an existing image) return {"action":"chat"}. Output ONLY JSON.',
            },
            { role: "user", content: text },
          ],
          temperature: 0,
          max_tokens: 200,
          response_format: { type: "json_object" },
        }),
      }
    );
    if (!res.ok) return Response.json({ action: "chat" });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    if (parsed?.action === "image" && parsed?.prompt) {
      return Response.json({ action: "image", prompt: String(parsed.prompt) });
    }
    return Response.json({ action: "chat" });
  } catch {
    return Response.json({ action: "chat" });
  }
}
