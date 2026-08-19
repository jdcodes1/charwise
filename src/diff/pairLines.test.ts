import { describe, expect, it } from "vitest";
import { buildRows, pairBlock } from "./pairLines";
import { parsePatch } from "./parsePatch";
import type { DiffLine } from "./types";

const del = (text: string, n: number): DiffLine => ({ type: "del", oldNumber: n, newNumber: null, text });
const add = (text: string, n: number): DiffLine => ({ type: "add", oldNumber: null, newNumber: n, text });

describe("pairBlock", () => {
  it("pairs one deletion with one similar insertion", () => {
    const rows = pairBlock([del("timeout: 30_000", 1)], [add("timeout: 60_000", 1)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].del?.text).toBe("timeout: 30_000");
    expect(rows[0].add?.text).toBe("timeout: 60_000");
  });

  it("refuses to pair dissimilar lines", () => {
    const rows = pairBlock(
      [del("  await legacyQueue.publish(event);", 1)],
      [add("  await bus.emit(event.type, event.payload);", 1)],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ add: null });
    expect(rows[1]).toMatchObject({ del: null });
  });

  it("matches by similarity, not by position, when lines are reordered", () => {
    const dels = [
      del('  logger.debug("cache miss", { key });', 28),
      del("  const value = await loader.load(key);", 29),
    ];
    const adds = [
      add("  const value = await loader.loadMany([key]);", 28),
      add('  logger.debug("cache miss", { key });', 29),
    ];
    const rows = pairBlock(dels, adds);
    expect(rows).toHaveLength(2);
    expect(rows[0].add?.text).toBe('  logger.debug("cache miss", { key });');
    expect(rows[1].add?.text).toBe("  const value = await loader.loadMany([key]);");
  });

  it("leaves a surplus insertion unpaired", () => {
    const rows = pairBlock([del("a = 1;", 1)], [add("a = 2;", 1), add("// added", 2)]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ del: null });
    expect(rows[1].add?.text).toBe("// added");
  });

  it("stays responsive on a large changed block", () => {
    const dels = Array.from({ length: 200 }, (_, i) => del(`  const value${i} = compute(${i}, options);`, i + 1));
    const adds = Array.from({ length: 200 }, (_, i) => add(`  const value${i} = compute(${i}, settings);`, i + 1));
    const started = performance.now();
    const rows = pairBlock(dels, adds);
    expect(performance.now() - started).toBeLessThan(400);
    expect(rows).toHaveLength(200);
    expect(rows.every((r) => r.del !== null && r.add !== null)).toBe(true);
  });

  it("skips pairs whose lengths make the threshold unreachable", () => {
    const rows = pairBlock([del("x = 1;", 1)], [add(`x = 1; // ${"y".repeat(200)}`, 1)]);
    expect(rows).toHaveLength(2);
  });

  it("handles a block with no insertions", () => {
    const rows = pairBlock([del("gone;", 1)], []);
    expect(rows).toEqual([{ del: rows[0].del, add: null }]);
  });
});

describe("buildRows", () => {
  it("emits context rows untouched and pairs the changed block", () => {
    const hunks = parsePatch(
      ["@@ -41,4 +41,4 @@", "   const client = new ApiClient({", "-    timeout: 30_000,", "+    timeout: 60_000,", "     retries: 3,"].join("\n"),
    );
    const rows = buildRows(hunks);
    expect(rows.map((r) => r.kind)).toEqual(["context", "pair", "context"]);
    expect(rows[1].leftSegments?.filter((s) => s.kind === "chg").map((s) => s.text)).toEqual(["3"]);
    expect(rows[1].rightSegments?.filter((s) => s.kind === "chg").map((s) => s.text)).toEqual(["6"]);
  });

  it("leaves segments null on unmatched rows", () => {
    const rows = buildRows(parsePatch("@@ -1,1 +1,1 @@\n-  await legacyQueue.publish(event);\n+  await bus.emit(event.type, event.payload);"));
    expect(rows.map((r) => r.kind)).toEqual(["delete", "insert"]);
    expect(rows[0].leftSegments).toBeNull();
    expect(rows[1].rightSegments).toBeNull();
  });

  it("flags a whitespace-only pair", () => {
    const rows = buildRows(parsePatch("@@ -8,2 +8,2 @@\n-\tif (!session) return null;\n+    if (!session) return null;"));
    expect(rows[0].kind).toBe("pair");
    expect(rows[0].whitespaceOnly).toBe(true);
  });

  it("does not flag a substantive change as whitespace-only", () => {
    const rows = buildRows(parsePatch("@@ -1,1 +1,1 @@\n-a = 1;\n+a = 2;"));
    expect(rows[0].whitespaceOnly).toBe(false);
  });

  it("joins rows across multiple hunks, divided by a gap", () => {
    // Realistic lines, not single characters: `a` and `b` score 0 similarity and
    // correctly refuse to pair, which would make this assert row count rather
    // than concatenation.
    const rows = buildRows(
      parsePatch("@@ -1,1 +1,1 @@\n-  const a = 1;\n+  const a = 2;\n@@ -9,1 +9,1 @@\n-  const c = 3;\n+  const c = 4;"),
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.kind)).toEqual(["pair", "gap", "pair"]);
  });
});

describe("buildRows hunk gaps", () => {
  const TWO_HUNKS = [
    "@@ -1,2 +1,2 @@",
    " const a = 1;",
    "-const b = 2;",
    "+const b = 3;",
    "@@ -500,1 +500,1 @@ function far()",
    "-const y = 1;",
    "+const y = 2;",
  ].join("\n");

  it("emits a gap row between hunks so line 2 does not read as line 500", () => {
    const rows = buildRows(parsePatch(TWO_HUNKS));
    const gapIndexes = rows.map((r, i) => (r.kind === "gap" ? i : -1)).filter((i) => i >= 0);
    expect(gapIndexes).toHaveLength(1);
    expect(gapIndexes[0]).toBeGreaterThan(0);
    expect(rows[gapIndexes[0]].header).toBe("@@ -500,1 +500,1 @@ function far()");
  });

  it("emits no gap before the first hunk", () => {
    const rows = buildRows(parsePatch("@@ -1,1 +1,1 @@\n-a\n+b"));
    expect(rows.some((r) => r.kind === "gap")).toBe(false);
  });
});
