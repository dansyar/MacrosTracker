import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Vision-capable Claude model. Override with the CLAUDE_MODEL env var
// (e.g. set to "claude-sonnet-4-20250514" for higher accuracy at ~3× cost).
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

// Pull the first JSON object out of a string. Claude sometimes wraps JSON
// in prose or code fences; we want to be permissive but strict on the parse.
export function extractJSON<T = unknown>(text: string): T {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON found in response");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
