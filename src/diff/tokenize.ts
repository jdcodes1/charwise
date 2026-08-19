// The surrogate-pair alternative comes before the catch-all so an emoji stays
// one token. Without it a diff can highlight half a character, and the DOM ends
// up holding a lone unpaired surrogate.
const TOKEN_RE = /[A-Za-z_$][\w$]*|\d[\d_.]*|\s+|[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\s\w]/g;

/**
 * Split a line into diff tokens. Concatenating the result reproduces the input.
 */
export function tokenize(line: string): string[] {
  return line.match(TOKEN_RE) ?? [];
}
