# إياس AI — Ilyas AI

> مساعد ذكي بالدارجة المغربية، بشخصية حادّة وساخرة — مع إدخال صوتي، إخراج صوتي، وتصميم premium.
>
> A Moroccan-Darija AI chat assistant with a sharp, sarcastic streamer persona — featuring voice input, voice output, math rendering, chat history, and a premium dark UI.

![status](https://img.shields.io/badge/status-active-success) ![next](https://img.shields.io/badge/Next.js-15-black) ![license](https://img.shields.io/badge/use-personal%20%2F%20demo-yellow)

---

## ✨ Features

- 💬 **Arabic-first RTL chat** — fully localized Moroccan-Darija interface.
- 🧠 **Understands Darija + Arabizi** — typed Darija in Arabic *or* Latin letters/numbers (`wach`, `3lach`, `7slt`…).
- 🎭 **A real persona** — sharp, sarcastic, confident; the personality lives in [`prompts/system_prompt.txt`](prompts/system_prompt.txt).
- 🎙️ **Voice input** — speak in Darija → transcribed by **Groq Whisper** (free).
- 🔊 **Voice output** — on-demand text-to-speech via **ElevenLabs**.
- 📐 **Math rendering** — LaTeX equations via **KaTeX**, in the French/Moroccan convention.
- 🗂️ **Chat history** — saved per device (localStorage), grouped by day/week/month, with search.
- 🎨 **Premium UI** — dark/charcoal theme with gold accent, glass effects, and a light/dark toggle.
- 🔌 **Swappable LLM** — Groq (free) by default; switch to Gemini or a hybrid with one env var.

---

## 🧱 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS (RTL, dark/light, gold accent) |
| Chat model | **Groq** `openai/gpt-oss-120b` (default, free) — or Google **Gemini** |
| Speech-to-text | **Groq** Whisper `whisper-large-v3` |
| Text-to-speech | **ElevenLabs** `eleven_multilingual_v2` |
| Math | KaTeX + react-markdown + remark-math |
| Fonts | Cairo + Tajawal (Arabic) via `next/font` |

All AI calls run **server-side** through Next.js API routes — API keys never reach the browser.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 18.18+** (20+ recommended) — <https://nodejs.org>

### 2. Install
```bash
git clone <your-repo-url>
cd the-cynic-judge
npm install
```

### 3. Configure environment
```bash
cp .env.local.example .env.local
```
Then fill in `.env.local`:

| Variable | Required | Where to get it |
|----------|----------|-----------------|
| `GROQ_API_KEY` | ✅ | <https://console.groq.com/keys> |
| `GROQ_MODEL` | optional | default `openai/gpt-oss-120b` |
| `LLM_PROVIDER` | optional | `groq` (default) · `gemini` · `hybrid` |
| `ELEVENLABS_API_KEY` | for voice | <https://elevenlabs.io/app/settings/api-keys> |
| `ELEVENLABS_VOICE_ID` | for voice | a voice from your ElevenLabs library |
| `GEMINI_API_KEY` | optional | <https://aistudio.google.com/app/apikey> |
| `GEMINI_MODEL` | optional | default `gemini-2.5-flash-lite` |

### 4. Run
```bash
npm run dev    # → http://localhost:3000
```

---

## 📁 Project Structure

```
the-cynic-judge/
├── app/
│   ├── layout.tsx              # RTL, Arabic fonts, theme bootstrap
│   ├── page.tsx                # renders the chat
│   ├── globals.css             # premium theme tokens + markdown styles
│   └── api/
│       ├── judge/route.ts      # chat (streaming) endpoint
│       ├── transcribe/route.ts # speech-to-text (Whisper)
│       └── voice/route.ts      # text-to-speech (ElevenLabs)
├── components/
│   ├── Chat.tsx                # full chat UI + sidebar + history
│   ├── Markdown.tsx            # markdown + KaTeX rendering
│   ├── PlayButton.tsx          # voice playback
│   └── ThemeToggle.tsx         # dark / light switch
├── lib/
│   ├── llm.ts                  # provider selector (groq/gemini/hybrid)
│   ├── groq.ts                 # Groq streaming
│   ├── gemini.ts               # Gemini streaming
│   ├── prompt.ts               # loads the system prompt
│   ├── conversations.ts        # local chat-history store
│   └── strings.ts              # all Arabic UI strings
└── prompts/
    └── system_prompt.txt       # the persona (single source of truth)
```

---

## 🎭 Customizing

- **The personality** → edit [`prompts/system_prompt.txt`](prompts/system_prompt.txt) (loaded server-side only).
- **UI text** → edit [`lib/strings.ts`](lib/strings.ts).
- **The model / provider** → set `LLM_PROVIDER` and `GROQ_MODEL` / `GEMINI_MODEL` in `.env.local`.

---

## ☁️ Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it on [vercel.com](https://vercel.com).
3. Add the same environment variables in **Project → Settings → Environment Variables**.
4. Deploy — Vercel auto-scales the serverless API routes.

---

## ⚠️ Notes

- `.env.local` is **git-ignored** — never commit your keys. If a key was ever exposed, regenerate it.
- Free tiers have rate limits; for heavy traffic enable billing (Groq Dev tier / Gemini) — see the provider dashboards.
- Chat history is stored **per browser/device**. For history that follows a user across devices, add auth + a database.
- This is an **entertainment** project; the persona is fictional and may be wrong — verify important info.
