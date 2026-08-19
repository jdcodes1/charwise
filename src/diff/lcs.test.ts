import { describe, expect, it } from "vitest";
import { PAIR_THRESHOLD } from "./constants";
import { lcsDiff, similarity } from "./lcs";

describe("lcsDiff", () => {
  it("marks everything equal for identical input", () => {
    expect(lcsDiff(["a", "b"], ["a", "b"])).toEqual([
      { op: "=", v: "a" },
      { op: "=", v: "b" },
    ]);
  });

  it("reports a deletion", () => {
    expect(lcsDiff(["a", "b"], ["a"])).toEqual([
      { op: "=", v: "a" },
      { op: "-", v: "b" },
    ]);
  });

  it("reports an insertion", () => {
    expect(lcsDiff(["a"], ["a", "b"])).toEqual([
      { op: "=", v: "a" },
      { op: "+", v: "b" },
    ]);
  });

  it("keeps deletions before insertions in a replacement", () => {
    expect(lcsDiff(["x"], ["y"])).toEqual([
      { op: "-", v: "x" },
      { op: "+", v: "y" },
    ]);
  });

  it("handles an empty left side", () => {
    expect(lcsDiff([], ["a"])).toEqual([{ op: "+", v: "a" }]);
  });

  it("diffs characters when given character arrays", () => {
    const ops = lcsDiff([..."30_000"], [..."60_000"]);
    expect(ops.filter((o) => o.op !== "=")).toEqual([
      { op: "-", v: "3" },
      { op: "+", v: "6" },
    ]);
  });
});

describe("similarity", () => {
  it("is 1 for identical strings", () => {
    expect(similarity("abc", "abc")).toBe(1);
  });

  it("is 1 for two empty strings", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("is 0 for disjoint strings", () => {
    expect(similarity("abc", "xyz")).toBe(0);
  });

  it("is above the pair threshold for a one-character edit", () => {
    expect(similarity("    timeout: 30_000,", "    timeout: 60_000,")).toBeGreaterThan(0.9);
  });

  it("is below the pair threshold for unrelated statements", () => {
    // Shared indentation, `await`, `event`, and `);` inflate this to ~0.51 —
    // the reason PAIR_THRESHOLD sits at 0.6 rather than 0.5.
    const score = similarity("  await legacyQueue.publish(event);", "  await bus.emit(event.type, event.payload);");
    expect(score).toBeLessThan(PAIR_THRESHOLD);
    expect(score).toBeGreaterThan(0.45);
  });

  it("does not blow up on very long lines", () => {
    const a = "x".repeat(50_000);
    const b = "y".repeat(50_000);
    expect(similarity(a, b)).toBeGreaterThanOrEqual(0);
  });
});
