"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ───────────────────────────────────────────────────────────────
//  Bilingual UI strings (English default + Arabic) with a toggle.
//  The persona's *replies* follow the user's typed language; this
//  only controls the interface labels and text direction.
// ───────────────────────────────────────────────────────────────

export const en = {
  brand: "Chmicha AI",
  brandLetter: "C",
  modelName: "Chmicha AI",
  modelSub: "GPT-4o",
  online: "Online",

  welcomeTitle: "Hi! I'm Chmicha, your smart assistant.",
  welcomeSub: "How can I help you today? Ask me anything.",
  suggestions: [
    "What do you think about success?",
    "Give me money advice",
    "Will AI take my job?",
    "Why do people waste time?",
  ],

  themeToggle: "Toggle theme",
  langToggle: "Language",

  newChat: "New chat",
  searchPlaceholder: "Search conversations...",
  historyEmpty: "No conversations yet",
  searchEmpty: "No results found",
  deleteChat: "Delete conversation",
  openMenu: "Conversations",
  showMore: "Show more",
  showLess: "Show less",
  menuLibrary: "Library",
  menuProjects: "Projects",
  menuHistory: "History",
  menuMore: "More",
  soonBadge: "Soon",
  backLabel: "Back",
  continueAccount: "Continue with this account",
  continueGoogle: "Continue with Google",
  loginAnother: "Log in another way",
  secMyApp: "MY CHMICHA AI",
  secAccount: "ACCOUNT",
  rowPersonalization: "Personalization",
  rowMemory: "Memory",
  rowApps: "Apps",
  rowRemote: "Remote control",
  rowWorkspace: "Workspace",
  rowWorkspaceSub: "Personal",
  rowUpgrade: "Upgrade to Plus",
  rowName: "Name",
  rowAppearance: "Appearance",
  rowLanguage: "Language",
  rowAbout: "About",
  logout: "Log out",
  groupToday: "Today",
  groupWeek: "This week",
  groupMonth: "Last month",
  groupOlder: "Older",

  placeholder: "Message Chmicha AI",
  send: "Send",
  sending: "Thinking…",
  attachImage: "Add image",
  addLabel: "Add",
  removeImage: "Remove image",
  imageDefaultPrompt: "What's in this image? Describe it.",
  genImage: "Generate image",
  genPlaceholder: "Describe an image…",
  generatingImage: "Generating image…",
  genError: "Couldn't generate the image. Try again.",

  copy: "Copy",
  copied: "Copied",
  like: "Like",
  dislike: "Dislike",

  playButton: "Play voice",
  loadingVoice: "Preparing audio…",
  playingButton: "Playing…",
  replayButton: "Replay",
  errorVoice: "Voice failed",

  micStart: "Speak",
  micStop: "Stop recording",
  micRecording: "Recording… tap to stop",
  transcribing: "Transcribing…",
  micError: "Couldn't record. Check microphone permission.",
  micEmpty: "Didn't catch that. Speak clearly and louder, closer to the mic.",

  errorGeneric: "Something went wrong. Try again.",
  errorQuota:
    "The model is busy with too many requests. Wait a few seconds and try again.",

  footer: "Chmicha can make mistakes. Check important info.",

  // Magic lamp gate
  lampRub: "Rub the lamp to light it",
  lampLit: "The lamp is lit!",
  signInTitle: "Sign in",
  signInSub: "What should Chmicha call you?",
  namePlaceholder: "Your name…",
  signInBtn: "Enter",
};

export const ar: typeof en = {
  brand: "Chmicha AI",
  brandLetter: "ش",
  modelName: "Chmicha AI",
  modelSub: "GPT-4o",
  online: "متصل",

  welcomeTitle: "مرحباً! أنا شميشة، مساعدك الذكي.",
  welcomeSub: "كيف يمكنني مساعدتك اليوم؟ اسألني عن أي شيء.",
  suggestions: [
    "شنو رأيك فالنجاح؟",
    "عطيني نصيحة فالفلوس",
    "واش الذكاء الاصطناعي غادي ياخد خدمتي؟",
    "علاش الناس كيخسرو الوقت؟",
  ],

  themeToggle: "بدّل الثيم",
  langToggle: "اللغة",

  newChat: "محادثة جديدة",
  searchPlaceholder: "ابحث في المحادثات...",
  historyEmpty: "ما كاين حتى محادثة بعد",
  searchEmpty: "ما لقينا حتى نتيجة",
  deleteChat: "مسح المحادثة",
  openMenu: "المحادثات",
  showMore: "عرض المزيد",
  showLess: "عرض أقل",
  menuLibrary: "المكتبة",
  menuProjects: "المشاريع",
  menuHistory: "السجل",
  menuMore: "المزيد",
  soonBadge: "قريبا",
  backLabel: "رجوع",
  continueAccount: "كمّل بهاد الحساب",
  continueGoogle: "المتابعة بحساب Google",
  loginAnother: "دخول بطريقة أخرى",
  secMyApp: "شميشة ديالي",
  secAccount: "الحساب",
  rowPersonalization: "التخصيص",
  rowMemory: "الذاكرة",
  rowApps: "التطبيقات",
  rowRemote: "التحكم عن بعد",
  rowWorkspace: "مساحة العمل",
  rowWorkspaceSub: "شخصي",
  rowUpgrade: "الترقية لـ Plus",
  rowName: "الاسم",
  rowAppearance: "المظهر",
  rowLanguage: "اللغة",
  rowAbout: "حول التطبيق",
  logout: "تسجيل الخروج",
  groupToday: "اليوم",
  groupWeek: "هذا الأسبوع",
  groupMonth: "الشهر الماضي",
  groupOlder: "أقدم",

  placeholder: "راسل شميشة…",
  send: "إرسال",
  sending: "كيفكر…",
  attachImage: "أضف صورة",
  addLabel: "إضافة",
  removeImage: "حذف الصورة",
  imageDefaultPrompt: "شنو هاد الصورة؟ علّق عليها.",
  genImage: "توليد صورة",
  genPlaceholder: "وصف الصورة…",
  generatingImage: "كيصاوب الصورة…",
  genError: "تعذّر توليد الصورة. عاود المحاولة.",

  copy: "نسخ",
  copied: "تم النسخ",
  like: "إعجاب",
  dislike: "عدم إعجاب",

  playButton: "تشغيل الصوت",
  loadingVoice: "كنحضّر الصوت…",
  playingButton: "كيهضر…",
  replayButton: "عاود",
  errorVoice: "الصوت ما خدامش",

  micStart: "هضر",
  micStop: "وقف التسجيل",
  micRecording: "كنسجّل… دوس باش توقف",
  transcribing: "كنحوّل الصوت…",
  micError: "ما قدرناش نسجّلو. تأكد من إذن الميكرو.",
  micEmpty: "ما سمعتش مزيان. عاود هضر بوضوح وبصوت عالي، وقرّب الميكرو.",

  errorGeneric: "شي حاجة طاحت. عاود المحاولة.",
  errorQuota: "الموديل مشغول دابا بزاف ديال الطلبات. تسنّى شي ثواني وعاود صيفط.",

  footer: "شميشة قد يخطئ. تحقق من المعلومات المهمة.",

  // Magic lamp gate
  lampRub: "افرك المصباح باش يشعل",
  lampLit: "المصباح شعل!",
  signInTitle: "تسجيل الدخول",
  signInSub: "شنو سميتك باش يناديك شميشة؟",
  namePlaceholder: "سميتك…",
  signInBtn: "دخول",
};

export type Lang = "en" | "ar";
export type Strings = typeof en;

const dict: Record<Lang, Strings> = { en, ar };

interface LangCtx {
  lang: Lang;
  t: Strings;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LangCtx>({
  lang: "en",
  t: en,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lang") as Lang | null;
      if (stored === "ar" || stored === "en") setLangState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }

  return (
    <LanguageContext.Provider value={{ lang, t: dict[lang], setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Returns the strings for the current language.
export function useLang(): Strings {
  return useContext(LanguageContext).t;
}

// Returns { lang, setLang } for the language switcher.
export function useLangControl() {
  const { lang, setLang } = useContext(LanguageContext);
  return { lang, setLang };
}
