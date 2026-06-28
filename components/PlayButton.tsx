"use client";

import { useEffect, useRef, useState } from "react";
import { ar } from "@/lib/strings";

type VoiceState = "idle" | "loading" | "playing" | "played" | "error";

interface PlayButtonProps {
  text: string;
  disabled?: boolean;
}

/**
 * Fetches MP3 audio for the verdict from /api/voice on demand and plays
 * it. Audio is only generated when the user clicks, so ElevenLabs
 * credits are spent only when voice is actually wanted.
 */
export default function PlayButton({ text, disabled }: PlayButtonProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  // Reset cached audio whenever the verdict text changes.
  useEffect(() => {
    cleanup();
    setState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Cleanup on unmount.
  useEffect(() => cleanup, []);

  function cleanup() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }

  async function handleClick() {
    if (state === "loading") return;

    // Replay the already-fetched clip without hitting the API again.
    if (urlRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setState("playing");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState("played");
      audio.onpause = () =>
        setState((s) => (s === "playing" ? "played" : s));

      await audio.play();
      setState("playing");
    } catch {
      cleanup();
      setState("error");
    }
  }

  const label = {
    idle: ar.playButton,
    loading: ar.loadingVoice,
    playing: ar.playingButton,
    played: ar.replayButton,
    error: ar.errorVoice,
  }[state];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "loading"}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1",
        "text-xs font-medium transition hover:bg-black/5 dark:hover:bg-white/5",
        "disabled:cursor-not-allowed disabled:opacity-40",
      ].join(" ")}
      style={{ color: state === "error" ? "#ef4444" : "var(--text-faint)" }}
    >
      {state === "loading" ? (
        <Spinner />
      ) : state === "playing" ? (
        <Equalizer />
      ) : (
        <PlayIcon />
      )}
      <span>{label}</span>
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom animate-bars rounded-full bg-current"
          style={{ height: "100%", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
