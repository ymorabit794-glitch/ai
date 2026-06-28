"use client";

import { ar } from "@/lib/strings";

interface VerdictTextProps {
  text: string;
  isStreaming: boolean;
}

/**
 * Renders the judge's verdict. Shows a blinking neon cursor while the
 * model is still streaming, and an empty-state hint before anything has
 * been generated.
 */
export default function VerdictText({ text, isStreaming }: VerdictTextProps) {
  const isEmpty = !text && !isStreaming;

  return (
    <div
      className="min-h-[7rem] whitespace-pre-wrap break-words text-lg leading-loose text-slate-100 sm:text-xl"
      aria-live="polite"
    >
      {isEmpty ? (
        <span className="text-slate-600">{ar.verdictEmpty}</span>
      ) : (
        <span className="animate-rise-in">
          {text}
          {isStreaming && (
            <span className="ms-1 inline-block h-5 w-[3px] translate-y-1 animate-cursor-blink bg-neon align-middle" />
          )}
        </span>
      )}
    </div>
  );
}
