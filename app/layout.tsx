import type { Metadata, Viewport } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chmicha AI",
  description: "المساعد الذكي بأسلوب مغربي بلا فلتر.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f11" },
  ],
};

// Set the theme before first paint to avoid a flash of the wrong mode.
// Set theme + language before first paint to avoid a flash.
const bootScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark');}var l=localStorage.getItem('lang')||'en';document.documentElement.lang=l;document.documentElement.dir=(l==='ar'?'rtl':'ltr');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${cairo.variable} ${tajawal.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="font-sans antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
