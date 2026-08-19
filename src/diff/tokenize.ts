const TOKEN_RE = /[A-Za-z_$][\w$]*|\d[\d_.]*|\s+|[^\s\w]/g;

/**
 * Split a line into diff tokens. Concatenating the result reproduces the input.
 */
export function tokenize(line: string): string[] {
  return line.match(TOKEN_RE) ?? [];
}
