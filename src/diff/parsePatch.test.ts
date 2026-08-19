import { describe, expect, it } from "vitest";
import { parsePatch } from "./parsePatch";

const PATCH = [
  "@@ -41,4 +41,4 @@ export function makeClient() {",
  "   const client = new ApiClient({",
  "-    timeout: 30_000,",
  "+    timeout: 60_000,",
  "     retries: 3,",
  "   });",
].join("\n");

describe("parsePatch", () => {
  it("returns one hunk with its header and start lines", () => {
    const hunks = parsePatch(PATCH);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].oldStart).toBe(41);
    expect(hunks[0].newStart).toBe(41);
    expect(hunks[0].header).toBe("@@ -41,4 +41,4 @@ export function makeClient() {");
  });

  it("types each line and strips the marker", () => {
    const { lines } = parsePatch(PATCH)[0];
    expect(lines.map((l) => l.type)).toEqual(["ctx", "del", "add", "ctx", "ctx"]);
    expect(lines[1].text).toBe("    timeout: 30_000,");
    expect(lines[2].text).toBe("    timeout: 60_000,");
  });

  it("numbers old and new sides independently", () => {
    const { lines } = parsePatch(PATCH)[0];
    expect(lines[0]).toMatchObject({ oldNumber: 41, newNumber: 41 });
    expect(lines[1]).toMatchObject({ oldNumber: 42, newNumber: null });
    expect(lines[2]).toMatchObject({ oldNumber: null, newNumber: 42 });
    expect(lines[3]).toMatchObject({ oldNumber: 43, newNumber: 43 });
  });

  it("parses a header without line counts", () => {
    const hunks = parsePatch("@@ -1 +1 @@\n-a\n+b");
    expect(hunks[0].oldStart).toBe(1);
    expect(hunks[0].newStart).toBe(1);
  });

  it("parses multiple hunks", () => {
    const hunks = parsePatch("@@ -1,1 +1,1 @@\n-a\n+b\n@@ -10,1 +10,1 @@\n-c\n+d");
    expect(hunks).toHaveLength(2);
    expect(hunks[1].oldStart).toBe(10);
    expect(hunks[1].lines.map((l) => l.text)).toEqual(["c", "d"]);
  });

  it("drops no-newline metadata lines", () => {
    const hunks = parsePatch("@@ -1,1 +1,1 @@\n-a\n\\ No newline at end of file\n+b");
    expect(hunks[0].lines.map((l) => l.type)).toEqual(["del", "add"]);
  });

  it("treats a bare empty line as empty context", () => {
    const hunks = parsePatch("@@ -1,2 +1,2 @@\n\n-a\n+b");
    expect(hunks[0].lines[0]).toMatchObject({ type: "ctx", text: "" });
  });

  it("returns no hunks for an empty patch", () => {
    expect(parsePatch("")).toEqual([]);
  });

  it("ignores content before the first hunk header", () => {
    expect(parsePatch("index abc..def 100644\n@@ -1,1 +1,1 @@\n-a\n+b")).toHaveLength(1);
  });
});

describe("parsePatch line endings", () => {
  // A CRLF→LF change used to leave a bare carriage return in `text`, which
  // refine then highlighted: two identical-looking lines marked changed with
  // nothing visibly highlighted — the exact invisible change this app exists
  // to surface.
  it("strips the trailing carriage return and records it on the line", () => {
    const [hunk] = parsePatch("@@ -1,1 +1,1 @@\n-const a = 1;\r\n+const a = 1;");
    expect(hunk.lines[0].text).toBe("const a = 1;");
    expect(hunk.lines[0].crlf).toBe(true);
    expect(hunk.lines[1].text).toBe("const a = 1;");
    expect(hunk.lines[1].crlf).toBe(false);
  });

  it("leaves a carriage return that is not at the end of the line alone", () => {
    const [hunk] = parsePatch('@@ -1,1 +1,1 @@\n-const a = "x\ry";\n+const a = "z";');
    expect(hunk.lines[0].text).toBe('const a = "x\ry";');
    expect(hunk.lines[0].crlf).toBe(false);
  });
});
