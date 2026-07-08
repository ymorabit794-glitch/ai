"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

// Magic-lamp entry gate: rub the lamp (mouse hover-move on desktop,
// finger drag on mobile) until it lights, then a sign-in card appears.
// The profile is stored locally; returning visitors skip the gate.

const PROFILE_KEY = "chmicha.profile.v1";
const RUB_DISTANCE = 700; // px of pointer movement needed to light it

export default function LampGate() {
  const ar = useLang();
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [lit, setLit] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [name, setName] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const litRef = useRef(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(PROFILE_KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  function light() {
    if (litRef.current) return;
    litRef.current = true;
    setLit(true);
    setTimeout(() => setFormVisible(true), 1000);
  }

  function onMove(e: React.PointerEvent) {
    if (litRef.current) return;
    const p = { x: e.clientX, y: e.clientY };
    if (lastPos.current) {
      const d = Math.hypot(p.x - lastPos.current.x, p.y - lastPos.current.y);
      setProgress((prev) => {
        const next = Math.min(1, prev + d / RUB_DISTANCE);
        if (next >= 1) light();
        return next;
      });
    }
    lastPos.current = p;
  }

  function onEnd() {
    lastPos.current = null;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    try {
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ name: n, ts: Date.now() })
      );
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      {/* Lamp zone */}
      <div
        onPointerMove={onMove}
        onPointerLeave={onEnd}
        onPointerUp={onEnd}
        className={lit ? "" : "lamp-shake-slow cursor-pointer"}
        style={{ touchAction: "none", position: "relative", padding: 28 }}
      >
        {/* Glow behind the lamp — grows with progress */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "-30%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,197,66,0.55), transparent 65%)",
            filter: "blur(26px)",
            opacity: lit ? 1 : 0.08 + progress * 0.55,
            transform: `scale(${lit ? 1.35 : 0.7 + progress * 0.5})`,
            transition: "opacity 0.25s ease, transform 0.25s ease",
            animation: lit ? "logo-glow 2.6s ease-in-out infinite" : undefined,
          }}
        />

        {/* Sparkles once lit */}
        {lit && (
          <div aria-hidden className="lamp-sparks">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </div>
        )}

        <LampSvg lit={lit} progress={progress} />
      </div>

      {/* Hint + progress bar (before lit) */}
      {!lit && (
        <>
          <p
            className="mt-6 text-center text-base font-semibold"
            style={{ color: "var(--text)" }}
          >
            {ar.lampRub}
          </p>
          <div
            className="mt-4 h-1.5 w-48 overflow-hidden rounded-full"
            style={{ background: "var(--bg-soft)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(progress * 100)}%`,
                background:
                  "linear-gradient(90deg, #f7d774, #f5b301, #e0a200)",
                transition: "width 0.15s ease",
              }}
            />
          </div>
        </>
      )}

      {/* Sign-in card after lighting */}
      {lit && (
        <div
          className={`mt-8 w-full max-w-sm transition-all duration-700 ${
            formVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0"
          }`}
        >
          <form
            onSubmit={submit}
            className="premium-card rounded-3xl p-6 text-center"
          >
            <h2
              className="font-display text-xl font-extrabold"
              style={{ color: "var(--text)" }}
            >
              {ar.signInTitle}
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
              {ar.signInSub}
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ar.namePlaceholder}
              dir="auto"
              autoFocus
              className="mt-5 w-full rounded-2xl px-4 py-3 text-center text-base outline-none"
              style={{
                background: "var(--bg-soft)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
              }}
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="gold-gradient mt-4 w-full rounded-2xl px-4 py-3 text-base font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {ar.signInBtn}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function LampSvg({ lit, progress }: { lit: boolean; progress: number }) {
  const glow = lit ? 1 : progress;
  return (
    <svg
      width="230"
      height="170"
      viewBox="0 0 220 160"
      style={{
        position: "relative",
        zIndex: 1,
        filter: `drop-shadow(0 0 ${6 + glow * 22}px rgba(245,197,66,${
          0.25 + glow * 0.6
        }))`,
        transition: "filter 0.25s ease",
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9df8a" />
          <stop offset="50%" stopColor="#f5b301" />
          <stop offset="100%" stopColor="#c78f00" />
        </linearGradient>
      </defs>

      {/* Flame (appears when lit) */}
      <g
        style={{
          opacity: lit ? 1 : 0,
          transition: "opacity 0.5s ease",
          transformOrigin: "38px 44px",
          animation: lit ? "flame-dance 0.9s ease-in-out infinite" : undefined,
        }}
      >
        <path
          d="M38 22 q10 12 0 24 q-10 -12 0 -24 z"
          fill="#ffd75e"
          stroke="#f5b301"
          strokeWidth="1.5"
        />
        <path d="M38 32 q5 7 0 13 q-5 -6 0 -13 z" fill="#fff3c4" />
      </g>

      {/* Spout */}
      <path
        d="M78 78 Q52 70 38 52 Q34 46 42 46 Q62 50 84 68 Z"
        fill="url(#gold)"
      />
      {/* Body */}
      <path
        d="M74 76 Q110 58 150 76 Q160 104 132 120 Q110 130 88 120 Q60 104 74 76 Z"
        fill="url(#gold)"
      />
      {/* Lid */}
      <path d="M96 62 Q112 50 128 62 L123 72 Q112 66 101 72 Z" fill="url(#gold)" />
      <circle cx="112" cy="48" r="6" fill="url(#gold)" />
      {/* Handle */}
      <path
        d="M150 76 Q176 76 174 96 Q172 112 152 116"
        fill="none"
        stroke="url(#gold)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Base */}
      <path d="M92 122 L132 122 L140 134 L84 134 Z" fill="url(#gold)" />
      {/* Shine */}
      <ellipse cx="98" cy="86" rx="14" ry="7" fill="rgba(255,255,255,0.35)" transform="rotate(-18 98 86)" />
    </svg>
  );
}
