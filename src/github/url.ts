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

/**
 * Link to a file as it stands on the PR's head commit. Used as the escape
 * hatch for files GitHub sent no patch for. This is a link the reader may
 * click, not a request this app makes — nothing is fetched from github.com.
 */
export function blobUrl(ref: PrRef, headSha: string, path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${ref.owner}/${ref.repo}/blob/${headSha}/${encodedPath}`;
}
