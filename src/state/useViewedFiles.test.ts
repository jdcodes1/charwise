import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useViewedFiles } from "./useViewedFiles";

beforeEach(() => localStorage.clear());

describe("useViewedFiles", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useViewedFiles("sha1"));
    expect(result.current.viewed.size).toBe(0);
  });

  it("toggles a path on and off", () => {
    const { result } = renderHook(() => useViewedFiles("sha1"));
    act(() => result.current.toggle("a.ts"));
    expect(result.current.viewed.has("a.ts")).toBe(true);
    act(() => result.current.toggle("a.ts"));
    expect(result.current.viewed.has("a.ts")).toBe(false);
  });

  it("persists across remounts of the same sha", () => {
    const first = renderHook(() => useViewedFiles("sha1"));
    act(() => first.result.current.toggle("a.ts"));
    const second = renderHook(() => useViewedFiles("sha1"));
    expect(second.result.current.viewed.has("a.ts")).toBe(true);
  });

  it("starts fresh for a different head sha", () => {
    const first = renderHook(() => useViewedFiles("sha1"));
    act(() => first.result.current.toggle("a.ts"));
    const second = renderHook(() => useViewedFiles("sha2"));
    expect(second.result.current.viewed.size).toBe(0);
  });

  it("restores marks when returning to an earlier sha", () => {
    const first = renderHook(() => useViewedFiles("sha1"));
    act(() => first.result.current.toggle("a.ts"));
    renderHook(() => useViewedFiles("sha2"));
    const back = renderHook(() => useViewedFiles("sha1"));
    expect(back.result.current.viewed.has("a.ts")).toBe(true);
  });

  it("keeps storage bounded, dropping the least recent shas", () => {
    for (let i = 0; i < 25; i++) {
      const { result } = renderHook(() => useViewedFiles(`sha${i}`));
      act(() => result.current.toggle("a.ts"));
    }
    const stored: unknown = JSON.parse(localStorage.getItem("charwise.viewed") ?? "[]");
    expect(Array.isArray(stored) && stored.length).toBe(20);
    // The most recent survives, the oldest is gone.
    expect(renderHook(() => useViewedFiles("sha24")).result.current.viewed.has("a.ts")).toBe(true);
    expect(renderHook(() => useViewedFiles("sha0")).result.current.viewed.size).toBe(0);
  });

  it("uses one storage key rather than one per sha", () => {
    const { result } = renderHook(() => useViewedFiles("sha1"));
    act(() => result.current.toggle("a.ts"));
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("charwise.viewed"));
    expect(keys).toEqual(["charwise.viewed"]);
  });

  it("survives corrupted storage of every shape", () => {
    for (const junk of ["{{{", JSON.stringify({ a: 1 }), JSON.stringify([1, null, "x"])]) {
      localStorage.setItem("charwise.viewed", junk);
      const { result } = renderHook(() => useViewedFiles("sha1"));
      expect(result.current.viewed.size).toBe(0);
    }
  });
});
