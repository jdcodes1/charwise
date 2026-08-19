import { useCallback, useEffect, useState } from "react";

function read(key: string): Set<string> {
  const raw = localStorage.getItem(key);
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Per-file viewed marks, keyed by head SHA so a new push clears them.
 */
export function useViewedFiles(headSha: string): {
  viewed: ReadonlySet<string>;
  toggle: (path: string) => void;
} {
  const key = `charwise.viewed.${headSha}`;
  const [viewed, setViewed] = useState<Set<string>>(() => read(key));

  useEffect(() => {
    setViewed(read(key));
  }, [key]);

  const toggle = useCallback(
    (path: string) => {
      setViewed((current) => {
        const next = new Set(current);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        localStorage.setItem(key, JSON.stringify([...next]));
        return next;
      });
    },
    [key],
  );

  return { viewed, toggle };
}
