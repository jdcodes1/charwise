export type SegmentKind = "same" | "chg";

/** A run of characters within one rendered line, either unchanged or changed. */
export interface Segment {
  kind: SegmentKind;
  text: string;
}

export type LineType = "ctx" | "del" | "add";

export interface DiffLine {
  type: LineType;
  /** Line number on the old side; null for insertions. */
  oldNumber: number | null;
  /** Line number on the new side; null for deletions. */
  newNumber: number | null;
  /** Line content without the leading +/-/space marker and without a newline. */
  text: string;
}

export interface Hunk {
  oldStart: number;
  newStart: number;
  /** The raw @@ header line, kept for display and debugging. */
  header: string;
  lines: DiffLine[];
}

export type RowKind = "context" | "pair" | "delete" | "insert";

/** One rendered row: a context line, a matched pair, or an unmatched line. */
export interface Row {
  kind: RowKind;
  del: DiffLine | null;
  add: DiffLine | null;
  leftSegments: Segment[] | null;
  rightSegments: Segment[] | null;
  /** True when the two paired lines are identical after trimming. */
  whitespaceOnly: boolean;
}

/**
 * Why a file has no rendered rows. GitHub omits `patch` for binary blobs, pure
 * renames, mode-only changes and empty files as well as for oversized ones, so
 * a single `tooLarge` flag told the reader something false about most of them.
 */
export type NoPatchReason = "renamed" | "unchanged" | "binary" | "too-large";

export interface FileDiff {
  path: string;
  /** Differs from `path` only for renames. */
  oldPath: string;
  status: string;
  additions: number;
  deletions: number;
  rows: Row[];
  /** Null when the patch was present and rows were built. */
  noPatch: NoPatchReason | null;
}

export type Layout = "split" | "unified";
