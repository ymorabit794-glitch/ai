"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Models emit math with mixed delimiters (\( \), \[ \]). remark-math only
// understands $ … $ and $$ … $$, so normalize them first.
function normalizeMath(s: string): string {
  return s
    .replace(/\\\[/g, () => "$$")
    .replace(/\\\]/g, () => "$$")
    .replace(/\\\(/g, () => "$")
    .replace(/\\\)/g, () => "$");
}

// Renders the assistant's Markdown (bold, lists, code, tables) and LaTeX
// math (via KaTeX) the way big AI chat apps do.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-msg" dir="auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: "#dc2626" }]]}
      >
        {normalizeMath(children)}
      </ReactMarkdown>
    </div>
  );
}
