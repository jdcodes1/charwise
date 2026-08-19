import { beforeEach, describe, expect, it } from "vitest";
import { addRecentPr, clearAllLocalData, clearToken, getRecentPrs, getToken, isTokenRemembered, setToken } from "./token";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("token storage", () => {
  it("returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("keeps a non-remembered token in sessionStorage only", () => {
    setToken("ghp_example", false);
    expect(getToken()).toBe("ghp_example");
    expect(sessionStorage.getItem("charwise.token")).toBe("ghp_example");
    expect(localStorage.getItem("charwise.token")).toBeNull();
  });

  it("keeps a remembered token in localStorage only", () => {
    setToken("ghp_example", true);
    expect(getToken()).toBe("ghp_example");
    expect(localStorage.getItem("charwise.token")).toBe("ghp_example");
    expect(sessionStorage.getItem("charwise.token")).toBeNull();
  });

  it("moves the token when the user stops remembering it", () => {
    setToken("ghp_example", true);
    setToken("ghp_example", false);
    expect(localStorage.getItem("charwise.token")).toBeNull();
    expect(getToken()).toBe("ghp_example");
  });

  it("reports whether the token is remembered", () => {
    setToken("ghp_example", false);
    expect(isTokenRemembered()).toBe(false);
    setToken("ghp_example", true);
    expect(isTokenRemembered()).toBe(true);
  });

  it("clears both stores", () => {
    setToken("ghp_example", true);
    clearToken();
    expect(getToken()).toBeNull();
    expect(sessionStorage.getItem("charwise.token")).toBeNull();
    expect(localStorage.getItem("charwise.token")).toBeNull();
  });
});

describe("recent PRs", () => {
  it("starts empty", () => {
    expect(getRecentPrs()).toEqual([]);
  });

  it("records the most recent first", () => {
    addRecentPr({ owner: "o", repo: "r", number: 1 }, "First");
    addRecentPr({ owner: "o", repo: "r", number: 2 }, "Second");
    expect(getRecentPrs()[0].label).toBe("o/r#2 Second");
  });

  it("stores only the ref, never a token or diff content", () => {
    addRecentPr({ owner: "o", repo: "r", number: 1 }, "First");
    expect(getRecentPrs()[0].ref).toEqual({ owner: "o", repo: "r", number: 1 });
  });

  it("de-duplicates by ref", () => {
    addRecentPr({ owner: "o", repo: "r", number: 1 }, "First");
    addRecentPr({ owner: "o", repo: "r", number: 1 }, "First again");
    expect(getRecentPrs()).toHaveLength(1);
  });

  it("keeps at most ten entries", () => {
    for (let n = 1; n <= 12; n++) addRecentPr({ owner: "o", repo: "r", number: n }, "x");
    expect(getRecentPrs()).toHaveLength(10);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("charwise.recent", "{{{");
    expect(getRecentPrs()).toEqual([]);
  });
});

describe("clearAllLocalData", () => {
  it("removes every charwise key from both stores", () => {
    setToken("ghp_example", true);
    addRecentPr({ owner: "o", repo: "r", number: 1 }, "First");
    localStorage.setItem("charwise.viewed.sha1", JSON.stringify(["a.ts"]));
    localStorage.setItem("unrelated", "keep me");

    clearAllLocalData();

    expect(getToken()).toBeNull();
    expect(getRecentPrs()).toEqual([]);
    expect(localStorage.getItem("charwise.viewed.sha1")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep me");
  });
});
