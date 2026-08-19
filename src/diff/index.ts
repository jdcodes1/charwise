import { BINARY_EXTENSIONS } from "./constants";
import { buildRows } from "./pairLines";
import { parsePatch } from "./parsePatch";
import type { FileDiff, NoPatchReason } from "./types";

export interface FileDiffInput {
  path: string;
  oldPath: string;
  status: string;
  additions: number;
  deletions: number;
  /** Absent when GitHub omitted the patch for size. */
  patch?: string;
}

function isBinaryPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  if (dot <= path.lastIndexOf("/")) return false;
  return BINARY_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase());
}

/**
 * Why this file has no rows. Binary is checked before the counts because
 * GitHub reports a changed binary blob as +0 −0 with no patch, so the counts
 * rule would otherwise claim a replaced image had no content change.
 */
function noPatchReason(input: FileDiffInput): NoPatchReason | null {
  if (input.patch) return null;
  if (input.status === "renamed") return "renamed";
  if (isBinaryPath(input.path)) return "binary";
  if (input.additions === 0 && input.deletions === 0) return "unchanged";
  return "too-large";
}

/** Turn one file's patch into rendered rows. */
export function buildFileDiff(input: FileDiffInput): FileDiff {
  const rows = input.patch ? buildRows(parsePatch(input.patch)) : [];
  return {
    path: input.path,
    oldPath: input.oldPath,
    status: input.status,
    additions: input.additions,
    deletions: input.deletions,
    rows,
    noPatch: noPatchReason(input),
  };
}

export { buildRows } from "./pairLines";
export { parsePatch } from "./parsePatch";
export type { FileDiff, Layout, NoPatchReason, Row, Segment } from "./types";
