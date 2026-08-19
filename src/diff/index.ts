import { buildRows } from "./pairLines";
import { parsePatch } from "./parsePatch";
import type { FileDiff } from "./types";

export interface FileDiffInput {
  path: string;
  oldPath: string;
  status: string;
  additions: number;
  deletions: number;
  /** Absent when GitHub omitted the patch for size. */
  patch?: string;
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
    tooLarge: !input.patch,
  };
}

export { buildRows } from "./pairLines";
export { parsePatch } from "./parsePatch";
export type { FileDiff, Layout, Row, Segment } from "./types";
