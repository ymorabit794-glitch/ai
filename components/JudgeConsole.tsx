"use client";

import { useRef, useState } from "react";
import { ar } from "@/lib/strings";
import VerdictText from "./VerdictText";
import PlayButton from "./PlayButton";

export default function JudgeConsole() {
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = input.trim().length > 0 && !isStreaming;

  async function handleJudge() {
    const text = input.trim();
    if (!text) {
      setError(ar.errorEmpty);
      return;
    }

    setError(null);
    setVerdict("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok || !res.body) {
        throw new Error("request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // The server signals fatal errors inline with an [ERROR] marker.
        if (chunk.includes("[ERROR]")) {
          throw new Error(chunk);
        }

        acc += chunk;
        setVerdict(acc);
      }

      if (!acc.trim()) {
        throw new Error("empty verdict");
      }
    } catch {
      setError(ar.errorGeneric);
      setVerdict("");
    } finally {
      setIsStreaming(false);
    }
  }

  function handleClear() {
    setInput("");
    setVerdict("");
    setError(null);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Enter submits.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
      e.preventDefault();
      handleJudge();
    }
  }

  const showVerdict = isStreaming || verdict.length > 0;

  return (
    <section className="flex flex-col gap-6">
      {/* Input card */}
      <div className="glass rounded-2xl p-5 shadow-neon sm:p-6">
        <label
          htmlFor="argument"
          className="mb-2 block text-sm font-semibold text-neon/80"
        >
          {ar.inputLabel}
        </label>
        <textarea
          id="argument"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={ar.placeholder}
          rows={4}
          dir="rtl"
          className={[
            "w-full resize-none rounded-xl bg-ink-900/70 p-4 text-base text-slate-100",
            "placeholder:text-slate-600",
            "border border-white/5 outline-none transition",
            "focus:border-neon/40 focus:shadow-neon",
          ].join(" ")}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={isStreaming || (!input && !verdict)}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-slate-200 disabled:opacity-30"
          >
            {ar.clearButton}
          </button>

          <button
            type="button"
            onClick={handleJudge}
            disabled={!canSubmit}
            className={[
              "inline-flex items-center gap-2 rounded-full px-7 py-3",
              "text-base font-extrabold transition-all duration-200",
              "bg-neon text-ink-900 shadow-neon-strong",
              "hover:brightness-110 hover:shadow-neon-strong",
              "disabled:cursor-not-allowed disabled:bg-ink-500 disabled:text-slate-500 disabled:shadow-none",
            ].join(" ")}
          >
            {isStreaming ? (
              <>
                <span className="h-2 w-2 animate-pulse-glow rounded-full bg-ink-900" />
                {ar.judgingButton}
              </>
            ) : (
              <>
                <GavelIcon />
                {ar.judgeButton}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="animate-rise-in rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <span className="font-bold">{ar.errorTitle}: </span>
          {error}
        </div>
      )}

      {/* Verdict card */}
      {showVerdict && (
        <div className="glass animate-rise-in rounded-2xl p-5 shadow-neon sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-neon/70">
              <span className="h-px w-6 bg-neon/50" />
              {ar.verdictTitle}
            </h2>
            {verdict.length > 0 && !isStreaming && (
              <PlayButton text={verdict} />
            )}
          </div>

          <VerdictText text={verdict} isStreaming={isStreaming} />
        </div>
      )}
    </section>
  );
}

function GavelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14.12 3.88 12 6l6 6 2.12-2.12a1.5 1.5 0 0 0 0-2.12l-3.88-3.88a1.5 1.5 0 0 0-2.12 0ZM10.59 7.41 4 14l6 6 6.59-6.59-6-6ZM2 20h8v2H2z" />
    </svg>
  );
}
