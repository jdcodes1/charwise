import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenize";

describe("tokenize", () => {
  it("splits identifiers, punctuation, and whitespace", () => {
    expect(tokenize("a.b(c)")).toEqual(["a", ".", "b", "(", "c", ")"]);
  });

  it("keeps a whitespace run as one token", () => {
    expect(tokenize("  a")).toEqual(["  ", "a"]);
  });

  it("keeps a numeric literal with separators whole", () => {
    expect(tokenize("timeout: 30_000,")).toEqual(["timeout", ":", " ", "30_000", ","]);
  });

  it("treats $ and _ as identifier characters", () => {
    expect(tokenize("$_a1")).toEqual(["$_a1"]);
  });

  it("round-trips any input", () => {
    const line = '\tconst x = fn("a b", 1.5); // note';
    expect(tokenize(line).join("")).toBe(line);
  });

  it("returns an empty array for an empty line", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("keeps an emoji as one token rather than two surrogate halves", () => {
    expect(tokenize('x = "🎉";')).toEqual(["x", " ", "=", " ", '"', "🎉", '"', ";"]);
  });

  it("keeps two emoji that share a high surrogate separate and whole", () => {
    expect(tokenize("😀😃")).toEqual(["😀", "😃"]);
  });
});
