"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

// Full-screen profile & settings panel, styled like the app design:
// big gradient avatar, "MY CHMICHA AI" and "ACCOUNT" card sections,
// appearance/language rows, and a red Log out row (clears the local
// profile and returns to the lamp gate).

const PROFILE_KEY = "chmicha.profile.v1";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const ar = useLang();
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfileName(JSON.parse(raw)?.name || "");
    } catch {
      /* ignore */
    }
  }, []);

  const initials =
    profileName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "🙂";

  function logout() {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* ignore */
    }
    location.reload();
  }

  return (
    <div
      className="fixed inset-0 z-[90] overflow-y-auto"
      style={{ background: "var(--bg)" }}
    >
      <div className="mx-auto w-full max-w-lg px-5 pb-10 pt-5">
        {/* Back */}
        <button
          onClick={onClose}
          aria-label={ar.backLabel}
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-80"
          style={{ color: "var(--text)" }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rtl:rotate-180"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        {/* Avatar + name */}
        <div className="mt-2 flex flex-col items-center">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full text-3xl font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, #5fb8a5, #f5b301)" }}
          >
            {initials}
          </div>
          <h2
            className="mt-4 text-2xl font-bold"
            style={{ color: "var(--text)" }}
          >
            {profileName || "Chmicha"}
          </h2>
        </div>

        {/* MY CHMICHA AI */}
        <SectionTitle>{ar.secMyApp}</SectionTitle>
        <Card>
          <Row icon={<SmileIcon />} label={ar.rowPersonalization} badge={ar.soonBadge} />
          <Row icon={<MemoryIcon />} label={ar.rowMemory} badge={ar.soonBadge} />
          <Row icon={<AppsIcon />} label={ar.rowApps} badge={ar.soonBadge} />
          <Row icon={<RemoteIcon />} label={ar.rowRemote} badge={ar.soonBadge} last />
        </Card>

        {/* ACCOUNT */}
        <SectionTitle>{ar.secAccount}</SectionTitle>
        <Card>
          <Row icon={<BagIcon />} label={ar.rowWorkspace} sub={ar.rowWorkspaceSub} />
          <Row icon={<PlusHexIcon />} label={ar.rowUpgrade} badge={ar.soonBadge} />
          <Row icon={<UserIcon />} label={ar.rowName} sub={profileName || "—"} last />
        </Card>

        {/* Appearance / language */}
        <Card className="mt-6">
          <div className="flex items-center gap-4 px-4 py-4">
            <span style={{ color: "var(--text-muted)" }}>
              <SunIcon />
            </span>
            <span
              className="flex-1 text-[17px] font-medium"
              style={{ color: "var(--text)" }}
            >
              {ar.rowAppearance}
            </span>
            <ThemeToggle />
          </div>
          <Divider />
          <div className="flex items-center gap-4 px-4 py-4">
            <span style={{ color: "var(--text-muted)" }}>
              <GlobeIcon />
            </span>
            <span
              className="flex-1 text-[17px] font-medium"
              style={{ color: "var(--text)" }}
            >
              {ar.rowLanguage}
            </span>
            <LanguageToggle />
          </div>
          <Divider />
          <Row icon={<InfoIcon />} label={ar.rowAbout} sub="Chmicha AI v1.0" last />
        </Card>

        {/* Log out */}
        <Card className="mt-6">
          <button
            onClick={logout}
            className="flex w-full items-center gap-4 px-4 py-4 text-start transition hover:opacity-80"
            style={{ color: "#e5695e" }}
          >
            <LogoutIcon />
            <span className="text-[17px] font-semibold">{ar.logout}</span>
          </button>
        </Card>
      </div>
    </div>
  );
}

/* ── Building blocks ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 mt-8 px-1 text-xs font-semibold tracking-widest"
      style={{ color: "var(--text-faint)" }}
    >
      {children}
    </p>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl ${className}`}
      style={{ background: "var(--bg-soft)", border: "1px solid var(--border)" }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 h-px" style={{ background: "var(--border)" }} />;
}

function Row({
  icon,
  label,
  sub,
  badge,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  badge?: string;
  last?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-4 px-4 py-4">
        <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-[17px] font-medium"
            style={{ color: "var(--text)" }}
          >
            {label}
          </span>
          {sub && (
            <span
              className="block truncate text-sm"
              style={{ color: "var(--text-faint)" }}
            >
              {sub}
            </span>
          )}
        </span>
        {badge && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-faint)",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      {!last && <Divider />}
    </>
  );
}

/* ── Icons (24px, stroke style like the design) ── */

const S = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function SmileIcon() {
  return (
    <svg {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5 Q12 17 15.5 14.5" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}

function MemoryIcon() {
  return (
    <svg {...S}>
      <path d="M9 4 Q12 6 15 4" />
      <path d="M12 5v14" />
      <path d="M9 20 Q12 18 15 20" />
      <path d="M8 9 Q12 11 16 9" opacity="0.6" />
    </svg>
  );
}

function AppsIcon() {
  return (
    <svg {...S} fill="currentColor" stroke="none">
      <rect x="5" y="5" width="5.5" height="5.5" rx="1.2" />
      <rect x="13.5" y="5" width="5.5" height="5.5" rx="1.2" />
      <rect x="5" y="13.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="5.5" height="5.5" rx="1.2" />
    </svg>
  );
}

function RemoteIcon() {
  return (
    <svg {...S}>
      <rect x="4" y="7" width="16" height="10" rx="2.5" />
      <circle cx="8" cy="14" r="0.7" fill="currentColor" />
      <circle cx="12" cy="14" r="0.7" fill="currentColor" />
      <circle cx="16" cy="14" r="0.7" fill="currentColor" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg {...S}>
      <rect x="4" y="8" width="16" height="11" rx="2.5" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

function PlusHexIcon() {
  return (
    <svg {...S}>
      <path d="M12 3l7 4v10l-7 4-7-4V7z" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg {...S}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg {...S}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg {...S}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.7" fill="currentColor" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...S}>
      <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
      <path d="M17 8l4 4-4 4M21 12H10" />
    </svg>
  );
}
