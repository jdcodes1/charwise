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
});
