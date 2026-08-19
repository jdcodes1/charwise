import { useEffect } from "react";

export interface NavHandlers {
  onNextFile: () => void;
  onPrevFile: () => void;
  onToggleLayout: () => void;
  onToggleViewed: () => void;
  onFocusFilter: () => void;
}

/** Global single-key shortcuts, suppressed while a text field has focus. */
export function useKeyboardNav(handlers: NavHandlers): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      // A checkbox is an INPUT but swallows no typing, and the Viewed control
      // keeps focus after a click — so suppressing on it stopped j/k until the
      // reader clicked somewhere else.
      const typing =
        target !== null &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) &&
        !(target instanceof HTMLInputElement && target.type === "checkbox");
      if (typing) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case "]":
        case "j":
          handlers.onNextFile();
          break;
        case "[":
        case "k":
          handlers.onPrevFile();
          break;
        case "u":
          handlers.onToggleLayout();
          break;
        case "v":
          handlers.onToggleViewed();
          break;
        case "/":
          event.preventDefault();
          handlers.onFocusFilter();
          break;
        default:
          return;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
