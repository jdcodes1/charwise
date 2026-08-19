import { PAIR_THRESHOLD } from "./constants";
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

  for (const d of dels) {
    let bestIndex = -1;
    let bestScore = PAIR_THRESHOLD;
    adds.forEach((a, index) => {
      if (claimed.has(index)) return;
      const score = similarity(d.text, a.text);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) {
      claimed.add(bestIndex);
      paired.push({ del: d, add: adds[bestIndex] });
    } else {
      unpairedDels.push(d);
    }
  }

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
    };
  }
  return {
    kind: del ? "delete" : "insert",
    del,
    add,
    leftSegments: null,
    rightSegments: null,
    whitespaceOnly: false,
  };
}

/** Flatten hunks into rendered rows, pairing each contiguous changed block. */
export function buildRows(hunks: Hunk[]): Row[] {
  const rows: Row[] = [];
  for (const hunk of hunks) {
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
