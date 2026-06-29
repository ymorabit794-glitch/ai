"use client";

import { useLangControl } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLangControl();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      title="Language / اللغة"
      aria-label="Language"
      className="inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl px-2 text-xs font-bold transition hover:bg-black/5 dark:hover:bg-white/5"
      style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
    >
      {lang === "ar" ? "EN" : "ع"}
    </button>
  );
}
