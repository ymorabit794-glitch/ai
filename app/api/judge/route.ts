import { NextRequest } from "next/server";
import { streamLLM, type ChatTurn } from "@/lib/llm";
import { getSystemPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

// Streams the judge's reply, given the whole conversation so far.
export async function POST(req: NextRequest) {
  let messages: IncomingMessage[] = [];
  let image: string | undefined;
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    if (typeof body?.image === "string" && body.image.startsWith("data:image")) {
      image = body.image;
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Cost/abuse guards for high traffic:
  //  - cap each message length (huge inputs cost more tokens)
  //  - keep only the last N turns (long histories blow up token cost)
  const MAX_CHARS = 2000;
  const MAX_TURNS = 12;

  const history: ChatTurn[] = messages
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      text: (m.content ?? "").toString().trim().slice(0, MAX_CHARS),
    }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_TURNS);

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return new Response("Conversation must end with a user message", {
      status: 422,
    });
  }

  let systemPrompt: string;
  try {
    systemPrompt = await getSystemPrompt();
  } catch {
    return new Response("System prompt missing", { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamLLM({ history, systemPrompt, image })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        controller.enqueue(encoder.encode(`\n\n[ERROR] ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
