import type { PrRef } from "./types";

const TOKEN_KEY = "charwise.token";
const RECENT_KEY = "charwise.recent";
const RECENT_MAX = 10;

export interface RecentPr {
  ref: PrRef;
  label: string;
}

/** The token, wherever the user chose to keep it. */
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
}

/**
 * Store the token in exactly one place: sessionStorage by default, so it dies
 * with the tab, or localStorage when the user asks to be remembered.
 */
export function setToken(token: string, remember: boolean): void {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function isTokenRemembered(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function sameRef(a: PrRef, b: PrRef): boolean {
  return a.owner === b.owner && a.repo === b.repo && a.number === b.number;
}

export function getRecentPrs(): RecentPr[] {
  const raw = localStorage.getItem(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecentPr[]) : [];
  } catch {
    return [];
  }
}

/** Records the PR's identity and title only — never diff content. */
export function addRecentPr(ref: PrRef, title: string): void {
  const entry: RecentPr = { ref, label: `${ref.owner}/${ref.repo}#${ref.number} ${title}` };
  const next = [entry, ...getRecentPrs().filter((r) => !sameRef(r.ref, ref))].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

/** Wipes every trace of this app from the browser. Used by "Clear local data". */
export function clearAllLocalData(): void {
  clearToken();
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("charwise.")) localStorage.removeItem(key);
  }
}
