"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

// Magic-lamp entry gate: rub the lamp until it lights (every visit),
// then the account screen appears (logo + Chmicha AI + sign-in buttons,
// styled like the app's design). Sign-up happens only once — returning
// visitors get a "Continue with this account" pill.

const PROFILE_KEY = "chmicha.profile.v1";
const RUB_DISTANCE = 700; // px of pointer movement needed to light it

export default function LampGate() {
  const ar = useLang();
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [lit, setLit] = useState(false);
  const [phase, setPhase] = useState<"lamp" | "account">("lamp");
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [profileName, setProfileName] = useState("");
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const litRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfileName(JSON.parse(raw)?.name || "");
    } catch {
      /* ignore */
    }
    setShow(true); // the lamp greets you on every visit
  }, []);

  function light() {
    if (litRef.current) return;
    litRef.current = true;
    setLit(true);
    setTimeout(() => setPhase("account"), 1300);
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

  function enter() {
    setShow(false);
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

  const initials =
    profileName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "🙂";

  if (!show) return null;

  /* ── Phase 2: account screen (like the design) — always dark ── */
  if (phase === "account") {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center px-6 py-10"
        style={{ background: "#0c0c0c" }}
      >
        {/* Hero: glasses with warm glow + serif wordmark (per design) */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative animate-rise-in">
            {/* Golden halo — bright core hugging the glasses */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-8% 4%",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse, rgba(255,205,105,0.55) 0%, rgba(232,175,80,0.35) 30%, rgba(190,135,55,0.18) 50%, rgba(140,95,40,0.08) 65%, transparent 80%)",
                filter: "blur(24px)",
                animation: "logo-glow 3.2s ease-in-out infinite",
              }}
            />
            {/* Wider soft warm wash behind */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-50% -35%",
                borderRadius: "50%",
                background:
                  "radial-gradient(ellipse, rgba(214,158,66,0.30) 0%, rgba(170,120,48,0.16) 35%, rgba(110,78,32,0.07) 58%, transparent 78%)",
                filter: "blur(46px)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Chmicha AI"
              className="relative h-52 w-80 max-w-[85vw] object-contain"
              style={{
                // The logo file is a dark square with the glasses in the
                // middle: zoom in on the glasses and fade the edges so
                // the square melts into the page completely.
                transform: "scale(1.55)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 60% 55% at center, black 30%, transparent 58%)",
                maskImage:
                  "radial-gradient(ellipse 60% 55% at center, black 30%, transparent 58%)",
              }}
            />
          </div>
          <h1
            className="mt-8 text-[2.6rem] font-bold animate-rise-in"
            style={{
              color: "#f2efe6",
              fontFamily: "Georgia, 'Times New Roman', serif",
              letterSpacing: "0.01em",
            }}
          >
            Chmicha <span style={{ color: "#d9a13a" }}>AI</span>
          </h1>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-sm space-y-3 animate-rise-in">
          {profileName && !formOpen && (
            <button
              onClick={enter}
              className="flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-start transition hover:opacity-90"
              style={{ background: "#efece1", color: "#1c1c1a" }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                style={{
                  background: "linear-gradient(135deg, #5fb8a5, #f5b301)",
                }}
              >
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold">
                  {ar.continueAccount}
                </span>
                <span className="block truncate text-sm opacity-60">
                  {profileName}
                </span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex w-full items-center justify-center gap-3 rounded-3xl px-4 py-3.5 text-base font-semibold transition hover:opacity-80"
            style={{
              border: "1px solid rgba(255,255,255,0.16)",
              color: "#ece9df",
            }}
          >
            <GoogleG />
            {ar.continueGoogle}
          </button>

          {!formOpen ? (
            <button
              onClick={() => setFormOpen(true)}
              className="w-full rounded-3xl px-4 py-3.5 text-base font-semibold transition hover:opacity-80"
              style={{
                border: "1px solid rgba(255,255,255,0.16)",
                color: "#ece9df",
              }}
            >
              {ar.loginAnother}
            </button>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={ar.namePlaceholder}
                dir="auto"
                autoFocus
                className="w-full rounded-3xl px-4 py-3.5 text-center text-base outline-none"
                style={{
                  background: "#161616",
                  border: "1px solid #2e2e2e",
                  color: "#f2efe6",
                }}
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="gold-gradient w-full rounded-3xl px-4 py-3.5 text-base font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ar.signInBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ── Phase 1: rub the lamp — always dark, cinematic ── */
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{ background: "#0c0c0c" }}
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
            style={{ color: "#f2efe6" }}
          >
            {ar.lampRub}
          </p>
          <div
            className="mt-4 h-1.5 w-48 overflow-hidden rounded-full"
            style={{ background: "#1c1c1c" }}
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
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.1 3.56-5.18 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76z"
      />
    </svg>
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
