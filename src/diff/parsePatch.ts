import type { DiffLine, Hunk } from "./types";

const HEADER_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Parse a GitHub unified `patch` string into hunks with per-side line numbers.
 * Content before the first @@ header is ignored.
 */
export function parsePatch(patch: string): Hunk[] {
  const hunks: Hunk[] = [];
  let current: Hunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const raw of patch.split("\n")) {
    const header = HEADER_RE.exec(raw);
    if (header) {
      oldNo = Number(header[1]);
      newNo = Number(header[2]);
      current = { oldStart: oldNo, newStart: newNo, header: raw, lines: [] };
      hunks.push(current);
      continue;
    }
    if (!current) continue;
    if (raw.startsWith("\\")) continue;

    const marker = raw[0] ?? " ";
    const text = raw.length > 0 ? raw.slice(1) : "";

    let line: DiffLine;
    if (marker === "-") {
      line = { type: "del", oldNumber: oldNo++, newNumber: null, text };
    } else if (marker === "+") {
      line = { type: "add", oldNumber: null, newNumber: newNo++, text };
    } else {
      line = { type: "ctx", oldNumber: oldNo++, newNumber: newNo++, text };
    }
    current.lines.push(line);
  }

  return hunks;
}
