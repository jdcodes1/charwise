import { SIMILARITY_MAX_LEN } from "./constants";

export type Op<T> = { op: "=" | "-" | "+"; v: T };

/**
 * Longest-common-subsequence diff over two arrays.
 * Within a replacement, deletions are emitted before insertions.
 */
export function lcsDiff<T>(a: readonly T[], b: readonly T[]): Op<T>[] {
  const n = a.length;
  const m = b.length;
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: Op<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ op: "=", v: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ op: "-", v: a[i] });
      i++;
    } else {
      ops.push({ op: "+", v: b[j] });
      j++;
    }
  }
  while (i < n) ops.push({ op: "-", v: a[i++] });
  while (j < m) ops.push({ op: "+", v: b[j++] });
  return ops;
}

/**
 * Normalized LCS similarity in [0, 1]: 2 * shared / (len(a) + len(b)).
 * Long strings are truncated so the O(n*m) table stays bounded.
 */
export function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const left = a.length > SIMILARITY_MAX_LEN ? a.slice(0, SIMILARITY_MAX_LEN) : a;
  const right = b.length > SIMILARITY_MAX_LEN ? b.slice(0, SIMILARITY_MAX_LEN) : b;
  const ops = lcsDiff([...left], [...right]);
  let shared = 0;
  for (const op of ops) if (op.op === "=") shared++;
  return (2 * shared) / (left.length + right.length);
}
