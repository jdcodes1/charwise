import { ISLAND_MAX, REFINE_MAX_LINE, REFINE_THRESHOLD } from "./constants";
import { lcsDiff, similarity } from "./lcs";
import { tokenize } from "./tokenize";
import type { Segment, SegmentKind } from "./types";

/** Append text, merging into the previous segment when the kind matches. */
function push(into: Segment[], kind: SegmentKind, text: string): void {
  if (text === "") return;
  const last = into[into.length - 1];
  if (last && last.kind === kind) last.text += text;
  else into.push({ kind, text });
}

/**
 * A short unchanged run between two changes is noise. Absorb it so a change
 * reads as one span rather than a stutter of alternating highlights.
 */
function absorbIslands(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const isIsland =
      seg.kind === "same" &&
      seg.text.length < ISLAND_MAX &&
      out.length > 0 &&
      out[out.length - 1].kind === "chg" &&
      segs[i + 1]?.kind === "chg";
    push(out, isIsland ? "chg" : seg.kind, seg.text);
  }
  return out;
}

/** Character-level diff of one changed run. */
function charSegments(delText: string, addText: string): [Segment[], Segment[]] {
  const left: Segment[] = [];
  const right: Segment[] = [];
  for (const op of lcsDiff([...delText], [...addText])) {
    if (op.op === "=") {
      push(left, "same", op.v);
      push(right, "same", op.v);
    } else if (op.op === "-") {
      push(left, "chg", op.v);
    } else {
      push(right, "chg", op.v);
    }
  }
  return [absorbIslands(left), absorbIslands(right)];
}

/**
 * Diff two paired lines into segment lists. Token-level first, then character
 * level inside any changed run whose two sides are similar enough to be worth it.
 */
export function refinePair(oldLine: string, newLine: string): { left: Segment[]; right: Segment[] } {
  // Both DPs below are O(n*m) in time and memory. A minified or generated line
  // would allocate gigabytes, so past REFINE_MAX_LINE we degrade to whole-line
  // highlighting rather than hang the tab.
  if (oldLine.length > REFINE_MAX_LINE || newLine.length > REFINE_MAX_LINE) {
    return {
      left: oldLine ? [{ kind: "chg", text: oldLine }] : [],
      right: newLine ? [{ kind: "chg", text: newLine }] : [],
    };
  }

  const ops = lcsDiff(tokenize(oldLine), tokenize(newLine));
  const left: Segment[] = [];
  const right: Segment[] = [];

  let i = 0;
  while (i < ops.length) {
    if (ops[i].op === "=") {
      push(left, "same", ops[i].v);
      push(right, "same", ops[i].v);
      i++;
      continue;
    }

    let delText = "";
    let addText = "";
    while (i < ops.length && ops[i].op !== "=") {
      if (ops[i].op === "-") delText += ops[i].v;
      else addText += ops[i].v;
      i++;
    }

    if (delText !== "" && addText !== "" && similarity(delText, addText) >= REFINE_THRESHOLD) {
      const [l, r] = charSegments(delText, addText);
      for (const s of l) push(left, s.kind, s.text);
      for (const s of r) push(right, s.kind, s.text);
    } else {
      push(left, "chg", delText);
      push(right, "chg", addText);
    }
  }

  return { left, right };
}
