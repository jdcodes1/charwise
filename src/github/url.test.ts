import { describe, expect, it } from "vitest";
import { blobUrl, parsePrUrl } from "./url";

describe("parsePrUrl", () => {
  it("parses a canonical PR url", () => {
    expect(parsePrUrl("https://github.com/facebook/react/pull/28901")).toEqual({
      owner: "facebook",
      repo: "react",
      number: 28901,
    });
  });

  it("ignores a trailing tab segment", () => {
    expect(parsePrUrl("https://github.com/facebook/react/pull/28901/files")).toMatchObject({ number: 28901 });
  });

  it("ignores a query string and hash", () => {
    expect(parsePrUrl("https://github.com/o/r/pull/7?w=1#diff-abc")).toMatchObject({ number: 7 });
  });

  it("accepts an owner/repo#number shorthand", () => {
    expect(parsePrUrl("facebook/react#28901")).toEqual({ owner: "facebook", repo: "react", number: 28901 });
  });

  it("trims surrounding whitespace", () => {
    expect(parsePrUrl("  https://github.com/o/r/pull/1  ")).toMatchObject({ number: 1 });
  });

  it("returns null for an issue url", () => {
    expect(parsePrUrl("https://github.com/o/r/issues/1")).toBeNull();
  });

  it("returns null for junk", () => {
    expect(parsePrUrl("not a url")).toBeNull();
  });
});

describe("blobUrl", () => {
  const ref = { owner: "o", repo: "r", number: 5 };

  it("points at the file on the PR's head commit", () => {
    expect(blobUrl(ref, "head1", "src/api/client.ts")).toBe("https://github.com/o/r/blob/head1/src/api/client.ts");
  });

  it("encodes each path segment but keeps the separators", () => {
    expect(blobUrl(ref, "head1", "docs/a b/c#d.png")).toBe("https://github.com/o/r/blob/head1/docs/a%20b/c%23d.png");
  });
});
