import { promises as fs } from "fs";
import path from "path";

// Loads the persona system prompt from /prompts/system_prompt.txt.
// Cached in module scope so we read the file from disk only once per
// server process (it never changes at runtime).
let cached: string | null = null;

export async function getSystemPrompt(): Promise<string> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "prompts", "system_prompt.txt");
  cached = await fs.readFile(file, "utf-8");
  return cached;
}
