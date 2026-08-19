import type { PrRef } from "./types";

const URL_RE = /github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/;
const SHORT_RE = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** Parse a PR URL or `owner/repo#number` shorthand. Returns null if neither. */
export function parsePrUrl(input: string): PrRef | null {
  const trimmed = input.trim();
  const match = URL_RE.exec(trimmed) ?? SHORT_RE.exec(trimmed);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}
