import { useCallback, useEffect, useState } from "react";

const KEY = "charwise.viewed";

/**
 * How many head SHAs keep their marks. One key per SHA would grow without
 * bound — a daily reviewer would leave thousands of dead entries behind and
 * eventually hit the origin's storage quota. Entries are held most-recent
 * first and the tail is dropped.
 */
const MAX_SHAS = 20;

interface Entry {
  sha: string;
  paths: string[];
}

function readAll(): Entry[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is Entry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Entry).sha === "string" &&
        Array.isArray((e as Entry).paths) &&
        (e as Entry).paths.every((p) => typeof p === "string"),
    );
  } catch {
    return [];
  }
}

function readOne(sha: string): Set<string> {
  return new Set(readAll().find((e) => e.sha === sha)?.paths ?? []);
}

function writeOne(sha: string, paths: Set<string>): void {
  const rest = readAll().filter((e) => e.sha !== sha);
  const next: Entry[] = [{ sha, paths: [...paths] }, ...rest].slice(0, MAX_SHAS);
  localStorage.setItem(KEY, JSON.stringify(next));
}

/**
 * Per-file viewed marks, kept per head SHA so a new push to the branch clears
 * them — the same behaviour GitHub has.
 */
export function useViewedFiles(headSha: string): {
  viewed: ReadonlySet<string>;
  toggle: (path: string) => void;
} {
  const [viewed, setViewed] = useState<Set<string>>(() => readOne(headSha));

  useEffect(() => {
    setViewed(readOne(headSha));
  }, [headSha]);

  const toggle = useCallback(
    (path: string) => {
      setViewed((current) => {
        const next = new Set(current);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        writeOne(headSha, next);
        return next;
      });
    },
    [headSha],
  );

  return { viewed, toggle };
}
