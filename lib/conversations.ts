// ───────────────────────────────────────────────────────────────
//  Per-device chat history, persisted in the browser (localStorage).
//  Each visitor keeps their own conversations on their own device.
//  (For history that follows a user across devices → add accounts + DB.)
// ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts?: number; // creation time (for timestamps); optional for older saved data
  image?: string; // optional data-URL of an attached image (vision)
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const KEY = "ilyass.conversations.v1";

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota or disabled storage — ignore */
  }
}

export function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 38 ? t.slice(0, 38) + "…" : t || "محادثة جديدة";
}
