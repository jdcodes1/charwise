import { PAIR_MAX_COMPARISONS, PAIR_THRESHOLD, PAIR_WINDOW } from "./constants";
import { similarity } from "./lcs";
import { refinePair } from "./refine";
import type { DiffLine, Hunk, Row } from "./types";

export interface Pairing {
  del: DiffLine | null;
  add: DiffLine | null;
}

/**
 * Match deleted lines to inserted lines by similarity rather than position, so
 * reordered code pairs with itself instead of with whatever sat beside it.
 * Greedy: each deletion, in order, claims the highest-scoring unclaimed
 * insertion whose similarity is strictly above PAIR_THRESHOLD.
 */
export function pairBlock(dels: DiffLine[], adds: DiffLine[]): Pairing[] {
  const paired: Pairing[] = [];
  const unpairedDels: DiffLine[] = [];
  const claimed = new Set<number>();

  // Every comparison is an O(n*m) DP, so a big changed block is a second of
  // synchronous work. Past the cap, a deletion only looks near its own index —
  // reordering within a window still pairs, distant moves degrade to unpaired.
  const windowed = dels.length * adds.length > PAIR_MAX_COMPARISONS;

  dels.forEach((d, dIndex) => {
    let bestIndex = -1;
    let bestScore = PAIR_THRESHOLD;
    const from = windowed ? Math.max(0, dIndex - PAIR_WINDOW) : 0;
    const to = windowed ? Math.min(adds.length, dIndex + PAIR_WINDOW + 1) : adds.length;

    for (let index = from; index < to; index++) {
      if (claimed.has(index)) continue;
      const a = adds[index];
      // Similarity is bounded by the length ratio, so a pair that cannot reach
      // the threshold is skipped before paying for the DP. Exact, not a
      // heuristic: it only skips pairs the DP would have rejected anyway.
      const shorter = Math.min(d.text.length, a.text.length);
      const total = d.text.length + a.text.length;
      if (total > 0 && (2 * shorter) / total <= PAIR_THRESHOLD) continue;
      const score = similarity(d.text, a.text);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    if (bestIndex >= 0) {
      claimed.add(bestIndex);
      paired.push({ del: d, add: adds[bestIndex] });
    } else {
      unpairedDels.push(d);
    }
  });

  const rows: Pairing[] = [...paired];
  for (const d of unpairedDels) rows.push({ del: d, add: null });
  adds.forEach((a, index) => {
    if (!claimed.has(index)) rows.push({ del: null, add: a });
  });
  return rows;
}

function toRow(pairing: Pairing): Row {
  const { del, add } = pairing;
  if (del && add) {
    const { left, right } = refinePair(del.text, add.text);
    return {
      kind: "pair",
      del,
      add,
      leftSegments: left,
      rightSegments: right,
      whitespaceOnly: del.text !== add.text && del.text.trim() === add.text.trim(),
      header: null,
    };
  }
  return {
    kind: del ? "delete" : "insert",
    del,
    add,
    leftSegments: null,
    rightSegments: null,
    whitespaceOnly: false,
    header: null,
  };
}

/** Flatten hunks into rendered rows, pairing each contiguous changed block. */
export function buildRows(hunks: Hunk[]): Row[] {
  const rows: Row[] = [];
  for (let h = 0; h < hunks.length; h++) {
    const hunk = hunks[h];
    // Between hunks only: a divider above the first line would be noise.
    if (h > 0) {
      rows.push({
        kind: "gap",
        del: null,
        add: null,
        leftSegments: null,
        rightSegments: null,
        whitespaceOnly: false,
        header: hunk.header,
      });
    }
    let i = 0;
    while (i < hunk.lines.length) {
      const line = hunk.lines[i];
      if (line.type === "ctx") {
        rows.push({
          kind: "context",
          del: line,
          add: line,
          leftSegments: null,
          rightSegments: null,
          whitespaceOnly: false,
          header: null,
        });
        i++;
        continue;
      }
      const dels: DiffLine[] = [];
      const adds: DiffLine[] = [];
      while (i < hunk.lines.length && hunk.lines[i].type !== "ctx") {
        if (hunk.lines[i].type === "del") dels.push(hunk.lines[i]);
        else adds.push(hunk.lines[i]);
        i++;
      }
      for (const pairing of pairBlock(dels, adds)) rows.push(toRow(pairing));
    }
  }
  return rows;
}
