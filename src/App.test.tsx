import { describe, expect, it } from "vitest";
import { refFromHash } from "./App";

describe("refFromHash", () => {
  it("parses a well-formed hash", () => {
    window.location.hash = "#" + encodeURIComponent("o/r#5");
    expect(refFromHash()).toEqual({ owner: "o", repo: "r", number: 5 });
  });

  it("returns null for an empty hash", () => {
    window.location.hash = "";
    expect(refFromHash()).toBeNull();
  });

  it("returns null for junk rather than throwing", () => {
    window.location.hash = "#not-a-pr";
    expect(refFromHash()).toBeNull();
  });

  it("survives a malformed percent escape", () => {
    // decodeURIComponent throws URIError here; a hand-edited address bar must
    // not blank the page.
    window.location.hash = "#%zz";
    expect(refFromHash()).toBeNull();
  });
});
