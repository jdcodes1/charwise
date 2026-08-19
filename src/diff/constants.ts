/**
 * Minimum similarity for a deleted line to pair with an inserted line.
 * Normalized LCS over raw characters is inflated by shared indentation and
 * punctuation, so 0.5 pairs unrelated statements (measured 0.506 on the
 * legacyQueue/bus.emit case in lcs.test.ts). 0.6 keeps them apart.
 */
export const PAIR_THRESHOLD = 0.6;

/** Minimum similarity for a changed run to be refined to character level. */
export const REFINE_THRESHOLD = 0.3;

/** An unchanged run shorter than this, between two changes, is absorbed. */
export const ISLAND_MAX = 3;

/** Lines longer than this are truncated before the similarity DP runs. */
export const SIMILARITY_MAX_LEN = 1000;

/**
 * Above this many deletion x insertion comparisons, `pairBlock` stops
 * considering every insertion for every deletion and looks only within
 * PAIR_WINDOW of the deletion's own index. A 200x200 changed block is 40,000
 * similarity DPs — around a second of synchronous work before the UI paints.
 */
export const PAIR_MAX_COMPARISONS = 10_000;

/** How far from its own index a deletion looks for a partner, once capped. */
export const PAIR_WINDOW = 25;

/**
 * Longest line `refinePair` will diff. Both the token DP and the character DP
 * are O(n*m) in time and memory, so a minified or generated line would allocate
 * gigabytes and hang the tab. Past this length the pair degrades to whole-line
 * highlighting, which is what GitHub shows anyway.
 */
export const REFINE_MAX_LINE = 2000;
