// ───────────────────────────────────────────────────────────────
//  Central Arabic UI strings (single source of truth for the UI).
// ───────────────────────────────────────────────────────────────

export const ar = {
  brand: "شميشة AI",
  brandLetter: "ش",
  modelName: "Chmicha AI",
  modelSub: "GPT-4o",
  online: "متصل",

  // Welcome card
  welcomeTitle: "مرحباً! أنا شميشة، مساعدك الذكي.",
  welcomeSub: "كيف يمكنني مساعدتك اليوم؟ اسألني عن أي شيء.",

  // Suggestion chips
  suggestions: [
    "شنو رأيك فالنجاح؟",
    "عطيني نصيحة فالفلوس",
    "واش الذكاء الاصطناعي غادي ياخد خدمتي؟",
    "علاش الناس كيخسرو الوقت؟",
  ],

  // Theme
  themeToggle: "بدّل الثيم",

  // Sidebar / history
  newChat: "محادثة جديدة",
  searchPlaceholder: "ابحث في المحادثات...",
  historyEmpty: "ما كاين حتى محادثة بعد",
  searchEmpty: "ما لقينا حتى نتيجة",
  deleteChat: "مسح المحادثة",
  openMenu: "المحادثات",
  showMore: "عرض المزيد",
  showLess: "عرض أقل",
  groupToday: "اليوم",
  groupWeek: "هذا الأسبوع",
  groupMonth: "الشهر الماضي",
  groupOlder: "أقدم",

  // Composer
  placeholder: "اكتب رسالتك هنا...",
  send: "إرسال",
  sending: "كيفكر…",
  attachImage: "أضف صورة",
  removeImage: "حذف الصورة",
  imageDefaultPrompt: "شنو هاد الصورة؟ علّق عليها.",
  genImage: "توليد صورة",
  genPlaceholder: "وصف الصورة اللي بغيتي نصاوب...",
  generatingImage: "كيصاوب الصورة…",

  // Message actions
  copy: "نسخ",
  copied: "تم النسخ",
  like: "إعجاب",
  dislike: "عدم إعجاب",

  // Voice
  playButton: "تشغيل الصوت",
  loadingVoice: "كنحضّر الصوت…",
  playingButton: "كيهضر…",
  replayButton: "عاود",
  errorVoice: "الصوت ما خدامش",

  // Voice input
  micStart: "هضر",
  micStop: "وقف التسجيل",
  micRecording: "كنسجّل… دوس باش توقف",
  transcribing: "كنحوّل الصوت…",
  micError: "ما قدرناش نسجّلو. تأكد من إذن الميكرو.",
  micEmpty: "ما سمعتش مزيان. عاود هضر بوضوح وبصوت عالي، وقرّب الميكرو.",

  // Errors
  errorGeneric: "شي حاجة طاحت. عاود المحاولة.",
  errorQuota: "الموديل مشغول دابا بزاف ديال الطلبات. تسنّى شي ثواني وعاود صيفط.",

  // Footer / disclaimer
  footer: "شميشة قد يخطئ. تحقق من المعلومات المهمة.",
} as const;

export type ArStrings = typeof ar;
