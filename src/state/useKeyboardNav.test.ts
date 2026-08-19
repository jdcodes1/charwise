import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardNav } from "./useKeyboardNav";

const handlers = () => ({
  onNextFile: vi.fn(),
  onPrevFile: vi.fn(),
  onToggleLayout: vi.fn(),
  onToggleViewed: vi.fn(),
  onFocusFilter: vi.fn(),
});

const press = (key: string, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

describe("useKeyboardNav", () => {
  it("maps ] and [ to file navigation", () => {
    const h = handlers();
    renderHook(() => useKeyboardNav(h));
    press("]");
    press("[");
    expect(h.onNextFile).toHaveBeenCalledOnce();
    expect(h.onPrevFile).toHaveBeenCalledOnce();
  });

  it("maps u to the layout toggle and v to viewed", () => {
    const h = handlers();
    renderHook(() => useKeyboardNav(h));
    press("u");
    press("v");
    expect(h.onToggleLayout).toHaveBeenCalledOnce();
    expect(h.onToggleViewed).toHaveBeenCalledOnce();
  });

  it("maps / to the filter", () => {
    const h = handlers();
    renderHook(() => useKeyboardNav(h));
    press("/");
    expect(h.onFocusFilter).toHaveBeenCalledOnce();
  });

  it("ignores keys typed into an input", () => {
    const h = handlers();
    renderHook(() => useKeyboardNav(h));
    const input = document.createElement("input");
    document.body.appendChild(input);
    press("u", input);
    expect(h.onToggleLayout).not.toHaveBeenCalled();
    input.remove();
  });

  it("detaches its listener on unmount", () => {
    const h = handlers();
    const { unmount } = renderHook(() => useKeyboardNav(h));
    unmount();
    press("u");
    expect(h.onToggleLayout).not.toHaveBeenCalled();
  });
});
