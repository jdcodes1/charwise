import { describe, expect, it } from "vitest";
import { refinePair } from "./refine";
import type { Segment } from "./types";

const changed = (segs: Segment[]) => segs.filter((s) => s.kind === "chg").map((s) => s.text);
const joined = (segs: Segment[]) => segs.map((s) => s.text).join("");

describe("refinePair", () => {
  it("narrows a one-character numeric change to that character", () => {
    const r = refinePair("    timeout: 30_000,", "    timeout: 60_000,");
    expect(changed(r.left)).toEqual(["3"]);
    expect(changed(r.right)).toEqual(["6"]);
  });

  it("highlights only the changed substring of a long signature", () => {
    const r = refinePair(
      "export function resolveUserPreferences(userId, { includeDefaults = true } = {}) {",
      "export function resolveViewerPreferences(viewerId, { includeDefaults = true } = {}) {",
    );
    // Character LCS decides exactly which letters survive inside the two renamed
    // identifiers, so assert the property that matters rather than the split:
    // the highlight stays inside the renamed words and never spills onto the
    // 50-odd characters of untouched signature around them.
    // Measured: left highlights "User" + "us" = 6; right highlights
    // "Viewer" + "view" = 10. Both stay inside the two renamed identifiers.
    expect(changed(r.left).join("").length).toBeLessThanOrEqual(6);
    expect(changed(r.right).join("").length).toBeLessThanOrEqual(10);
    for (const side of [r.left, r.right]) {
      const spilled = side.filter((s) => s.kind === "chg" && /Preferences|includeDefaults|export|function/.test(s.text));
      expect(spilled).toEqual([]);
    }
    expect(r.left.some((s) => s.kind === "same" && s.text.includes("Preferences("))).toBe(true);
  });

  it("does not explode dissimilar lines into character confetti", () => {
    // In production these two never pair — their similarity is 0.51, below
    // PAIR_THRESHOLD — so this asserts the fallback stays sane rather than a
    // single run: the shared `  await `, `event`, and `);` are genuine token
    // matches, and collapsing them would be wrong. What must not happen is a
    // stutter of one-character highlights.
    const r = refinePair("  await legacyQueue.publish(event);", "  await bus.emit(event.type, event.payload);");
    expect(changed(r.left).length).toBeLessThanOrEqual(3);
    expect(changed(r.right).length).toBeLessThanOrEqual(3);
    for (const side of [r.left, r.right]) {
      expect(side.filter((s) => s.kind === "chg" && s.text.length === 1)).toEqual([]);
    }
  });

  it("marks a pure insertion on the right only", () => {
    const r = refinePair("const a = 1;", "const a = 1; // note");
    expect(changed(r.left)).toEqual([]);
    expect(changed(r.right)).toEqual([" // note"]);
  });

  it("returns everything as one same segment for identical lines", () => {
    const r = refinePair("const a = 1;", "const a = 1;");
    expect(r.left).toEqual([{ kind: "same", text: "const a = 1;" }]);
    expect(r.right).toEqual([{ kind: "same", text: "const a = 1;" }]);
  });

  it("detects an indentation-only change", () => {
    const r = refinePair("\tif (!session) return null;", "    if (!session) return null;");
    expect(changed(r.left)).toEqual(["\t"]);
    expect(changed(r.right)).toEqual(["    "]);
  });

  it("never emits two adjacent segments of the same kind", () => {
    const r = refinePair('  return fetch(url, { method: "POST", headers, body });',
                         '  return fetch(url, { method: "PUT", headers, body, signal });');
    for (const side of [r.left, r.right]) {
      for (let i = 1; i < side.length; i++) {
        expect(side[i].kind).not.toBe(side[i - 1].kind);
      }
    }
  });

  it("preserves the original text on both sides", () => {
    const a = '  return fetch(url, { method: "POST", headers, body });';
    const b = '  return fetch(url, { method: "PUT", headers, body, signal });';
    const r = refinePair(a, b);
    expect(joined(r.left)).toBe(a);
    expect(joined(r.right)).toBe(b);
  });

  it("handles an empty old line", () => {
    const r = refinePair("", "new");
    expect(r.left).toEqual([]);
    expect(changed(r.right)).toEqual(["new"]);
  });
});
