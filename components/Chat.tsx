"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ar } from "@/lib/strings";
import PlayButton from "./PlayButton";
import ThemeToggle from "./ThemeToggle";
import Markdown from "./Markdown";
import {
  loadConversations,
  saveConversations,
  titleFrom,
  type ChatMessage,
  type Conversation,
} from "@/lib/conversations";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTime(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString("ar-MA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

interface Group {
  label: string;
  items: Conversation[];
}

function groupByDate(list: Conversation[]): Group[] {
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const weekAgo = startToday - 6 * 86400000;
  const monthAgo = startToday - 29 * 86400000;

  const today: Conversation[] = [];
  const week: Conversation[] = [];
  const month: Conversation[] = [];
  const older: Conversation[] = [];

  for (const c of list) {
    if (c.updatedAt >= startToday) today.push(c);
    else if (c.updatedAt >= weekAgo) week.push(c);
    else if (c.updatedAt >= monthAgo) month.push(c);
    else older.push(c);
  }

  return [
    { label: ar.groupToday, items: today },
    { label: ar.groupWeek, items: week },
    { label: ar.groupMonth, items: month },
    { label: ar.groupOlder, items: older },
  ].filter((g) => g.items.length > 0);
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setConversations(loadConversations());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveConversations(conversations);
  }, [conversations, loaded]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || isStreaming) return;

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: clean,
      ts: now,
    };
    const assistantId = uid();

    const prior = active?.messages ?? [];
    const payload = [...prior, userMsg].map(({ role, content }) => ({
      role,
      content,
    }));

    const creating = !activeId;
    const convId = activeId ?? uid();

    setConversations((prev) => {
      if (creating) {
        const fresh: Conversation = {
          id: convId,
          title: titleFrom(clean),
          messages: [
            userMsg,
            { id: assistantId, role: "assistant", content: "", ts: now },
          ],
          updatedAt: now,
        };
        return [fresh, ...prev];
      }
      return prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [
                ...c.messages,
                userMsg,
                { id: assistantId, role: "assistant", content: "", ts: now },
              ],
              updatedAt: now,
            }
          : c
      );
    });

    setActiveId(convId);
    setInput("");
    setIsStreaming(true);

    const patchAssistant = (content: string) =>
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === assistantId ? { ...m, content } : m
                ),
              }
            : c
        )
      );

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok || !res.body) throw new Error("request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk.includes("[ERROR]")) {
          const quota = /429|RESOURCE_EXHAUSTED|quota/i.test(chunk);
          throw new Error(quota ? "QUOTA" : "GENERIC");
        }
        acc += chunk;
        patchAssistant(acc);
      }

      if (!acc.trim()) throw new Error("GENERIC");
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "QUOTA"
          ? ar.errorQuota
          : ar.errorGeneric;
      patchAssistant(msg);
    } finally {
      setIsStreaming(false);
      taRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function newChat() {
    if (isStreaming) return;
    setActiveId(null);
    setInput("");
    setSidebarOpen(false);
    taRef.current?.focus();
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function toggleMic() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
      ];
      let mimeType = "";
      for (const c of candidates) {
        if (
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported?.(c)
        ) {
          mimeType = c;
          break;
        }
      }
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "audio");
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          const text = (data?.text ?? "").trim();
          if (text) setInput((prev) => (prev ? prev + " " : "") + text);
          else alert(ar.micEmpty);
        } catch {
          /* ignore */
        } finally {
          setTranscribing(false);
          taRef.current?.focus();
        }
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch {
      setRecording(false);
      alert(ar.micError);
    }
  }

  const empty = messages.length === 0;

  const filtered = useMemo(() => {
    const q = search.trim();
    return q ? conversations.filter((c) => c.title.includes(q)) : conversations;
  }, [conversations, search]);

  const LIMIT = 12;
  const visible = showAll ? filtered : filtered.slice(0, LIMIT);
  const groups = groupByDate(visible);
  const hasMore = filtered.length > LIMIT;

  const sidebar = (
    <SidebarContent
      groups={groups}
      activeId={activeId}
      search={search}
      onSearch={setSearch}
      onNew={newChat}
      onSelect={selectConversation}
      onDelete={deleteConversation}
      isEmpty={conversations.length === 0}
      noResults={filtered.length === 0 && conversations.length > 0}
      hasMore={hasMore}
      showAll={showAll}
      onToggleMore={() => setShowAll((v) => !v)}
    />
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Sidebar — desktop (right side in RTL) */}
      <aside
        className="hidden w-72 shrink-0 flex-col md:flex"
        style={{
          background: "var(--panel)",
          borderInlineEnd: "1px solid var(--border)",
        }}
      >
        {sidebar}
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className="absolute inset-y-0 end-0 flex w-80 max-w-[85%] flex-col"
            style={{ background: "var(--panel)" }}
          >
            {sidebar}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="glass sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label={ar.openMenu}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl md:hidden"
              style={{ color: "var(--text-muted)" }}
            >
              <MenuIcon />
            </button>
            <BrandAvatar size={38} />
            <div className="leading-tight">
              <h1
                className="font-display text-[17px] font-extrabold"
                style={{ color: "var(--text)" }}
              >
                {ar.brand}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--text-faint)" }}
                >
                  {ar.online}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="hidden items-center gap-2 rounded-full px-3 py-1.5 sm:flex"
              style={{
                background: "var(--bg-soft)",
                border: "1px solid var(--border)",
              }}
            >
              <SparkIcon />
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text)" }}
              >
                {ar.modelName}
              </span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {ar.modelSub}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {empty ? (
              <WelcomeCard onPick={send} />
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    message={m}
                    streaming={
                      isStreaming &&
                      m.role === "assistant" &&
                      m.id === messages[messages.length - 1].id
                    }
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 pb-4 pt-2">
          <div className="mx-auto w-full max-w-3xl">
            <div
              className="focus-glow flex items-end gap-2 rounded-[26px] p-2 transition"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border-strong)",
                boxShadow: "var(--shadow)",
              }}
            >
              <button
                type="button"
                onClick={toggleMic}
                disabled={isStreaming || transcribing}
                title={recording ? ar.micStop : ar.micStart}
                aria-label={recording ? ar.micStop : ar.micStart}
                className={[
                  "mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
                  recording ? "animate-pulse-soft bg-red-500 text-white" : "",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                ].join(" ")}
                style={
                  recording ? undefined : { color: "var(--text-muted)" }
                }
              >
                {transcribing ? (
                  <Spinner />
                ) : recording ? (
                  <StopIcon />
                ) : (
                  <MicIcon />
                )}
              </button>

              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={ar.placeholder}
                rows={1}
                dir="rtl"
                className="max-h-44 flex-1 resize-none bg-transparent px-2 py-3 text-base outline-none"
                style={{ color: "var(--text)" }}
              />

              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isStreaming}
                aria-label={ar.send}
                className="gold-gradient mb-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  !input.trim() || isStreaming
                    ? {
                        background: "var(--bg-soft)",
                        color: "var(--text-faint)",
                      }
                    : undefined
                }
              >
                {isStreaming ? <Spinner /> : <SendIcon />}
              </button>
            </div>

            <p
              className="mt-2.5 text-center text-[11px]"
              style={{ color: "var(--text-faint)" }}
            >
              {recording
                ? ar.micRecording
                : transcribing
                  ? ar.transcribing
                  : ar.footer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Sidebar ───────────────────────────── */

function SidebarContent({
  groups,
  activeId,
  search,
  onSearch,
  onNew,
  onSelect,
  onDelete,
  isEmpty,
  noResults,
  hasMore,
  showAll,
  onToggleMore,
}: {
  groups: Group[];
  activeId: string | null;
  search: string;
  onSearch: (v: string) => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isEmpty: boolean;
  noResults: boolean;
  hasMore: boolean;
  showAll: boolean;
  onToggleMore: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-3">
      <button
        onClick={onNew}
        className="gold-gradient mb-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition"
      >
        <PlusIcon />
        {ar.newChat}
      </button>

      {/* Search */}
      <div
        className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
      >
        <SearchIcon />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={ar.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: "var(--text)" }}
        />
      </div>

      {/* History */}
      <div className="-mx-1 flex-1 overflow-y-auto px-1">
        {isEmpty ? (
          <p className="px-2 py-4 text-xs" style={{ color: "var(--text-faint)" }}>
            {ar.historyEmpty}
          </p>
        ) : noResults ? (
          <p className="px-2 py-4 text-xs" style={{ color: "var(--text-faint)" }}>
            {ar.searchEmpty}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mb-3">
              <p
                className="px-2 pb-1.5 text-[11px] font-semibold"
                style={{ color: "var(--text-faint)" }}
              >
                {g.label}
              </p>
              <div className="space-y-0.5">
                {g.items.map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <div
                      key={c.id}
                      className="group flex items-center gap-1 rounded-xl px-2.5 py-2 text-sm transition"
                      style={{
                        background: isActive ? "var(--bg-soft)" : "transparent",
                        border: isActive
                          ? "1px solid var(--border)"
                          : "1px solid transparent",
                      }}
                    >
                      {isActive && (
                        <span
                          className="h-4 w-[3px] shrink-0 rounded-full"
                          style={{ background: "var(--accent-2)" }}
                        />
                      )}
                      <button
                        onClick={() => onSelect(c.id)}
                        className="flex-1 truncate text-start"
                        style={{
                          color: isActive ? "var(--text)" : "var(--text-muted)",
                        }}
                        title={c.title}
                      >
                        {c.title}
                      </button>
                      <button
                        onClick={() => onDelete(c.id)}
                        aria-label={ar.deleteChat}
                        className="shrink-0 rounded p-1 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        style={{ color: "var(--text-faint)" }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <button
            onClick={onToggleMore}
            className="mt-1 w-full rounded-lg px-2 py-2 text-center text-xs font-semibold transition"
            style={{ color: "var(--accent)" }}
          >
            {showAll ? ar.showLess : ar.showMore}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Messages ──────────────────────────── */

function MessageRow({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  const isUser = message.role === "user";
  const isError =
    message.content === ar.errorGeneric || message.content === ar.errorQuota;

  if (isUser) {
    return (
      <div className="flex animate-rise-in justify-start gap-3">
        <div className="order-2 max-w-[82%]">
          <div
            className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-relaxed"
            style={{
              background: "var(--user-bubble)",
              border: "1px solid var(--user-bubble-border)",
              color: "var(--text)",
            }}
          >
            {message.content}
          </div>
          <div
            className="mt-1 text-end text-[10px]"
            style={{ color: "var(--text-faint)" }}
          >
            {formatTime(message.ts)}
          </div>
        </div>
        <div className="order-1 mt-0.5 shrink-0">
          <UserAvatar />
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-rise-in justify-start gap-3">
      <div className="mt-0.5 shrink-0">
        <BrandAvatar size={32} />
      </div>
      <div className="max-w-[85%]">
        <div className="premium-card rounded-2xl rounded-tl-md px-4 py-3">
          <div style={{ color: "var(--text)" }}>
            <Markdown>{message.content}</Markdown>
            {streaming && (
              <span
                className="ms-1 inline-block h-4 w-[2px] translate-y-0.5 animate-cursor-blink align-middle"
                style={{ background: "var(--accent-2)" }}
              />
            )}
          </div>
        </div>
        {!streaming && message.content && !isError && (
          <div className="mt-1.5 flex items-center gap-1 px-1">
            <PlayButton text={message.content} />
            <MessageActions content={message.content} />
            <span
              className="ms-1 text-[10px]"
              style={{ color: "var(--text-faint)" }}
            >
              {formatTime(message.ts)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<"like" | "dislike" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <IconBtn label={copied ? ar.copied : ar.copy} onClick={copy} active={copied}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconBtn>
      <IconBtn
        label={ar.like}
        onClick={() => setReaction((r) => (r === "like" ? null : "like"))}
        active={reaction === "like"}
      >
        <ThumbUpIcon />
      </IconBtn>
      <IconBtn
        label={ar.dislike}
        onClick={() => setReaction((r) => (r === "dislike" ? null : "dislike"))}
        active={reaction === "dislike"}
      >
        <ThumbDownIcon />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-black/5 dark:hover:bg-white/5"
      style={{ color: active ? "var(--accent)" : "var(--text-faint)" }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────────── Welcome ───────────────────────────── */

function WelcomeCard({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center px-2 py-10 text-center">
      <div className="premium-card gold-glow flex w-full max-w-xl flex-col items-center rounded-3xl px-6 py-10">
        <BrandAvatar size={64} />
        <h2
          className="mt-5 font-display text-2xl font-extrabold"
          style={{ color: "var(--text)" }}
        >
          {ar.welcomeTitle}
        </h2>
        <p className="mt-2 max-w-md text-sm" style={{ color: "var(--text-muted)" }}>
          {ar.welcomeSub}
        </p>
      </div>

      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ar.suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="hover-card rounded-2xl px-4 py-3 text-start text-sm"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── Avatars ───────────────────────────── */

function BrandAvatar({ size = 36 }: { size?: number }) {
  return (
    <div
      className="gold-gradient flex items-center justify-center rounded-full font-display font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.46 }}
    >
      {ar.brandLetter}
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ───────────────────────────── Icons ─────────────────────────────── */

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2 21l21-9L2 3v7l15 2-15 2z" transform="scale(-1,1) translate(-24,0)" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
      <path d="M17 11a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-2)" aria-hidden>
      <path d="M12 2l2.2 6.2L20 10l-5.8 1.8L12 18l-2.2-6.2L4 10l5.8-1.8z" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function ThumbUpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M7 10v11H4V10h3zm4 11h6.5a2 2 0 0 0 2-1.6l1.3-6A2 2 0 0 0 18.8 11H14V5a2 2 0 0 0-4 0c0 2-3 4-3 5v11z" />
    </svg>
  );
}
function ThumbDownIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M17 14V3h3v11h-3zm-4-11H6.5a2 2 0 0 0-2 1.6l-1.3 6A2 2 0 0 0 5.2 13H10v6a2 2 0 0 0 4 0c0-2 3-4 3-5V3z" />
    </svg>
  );
}
