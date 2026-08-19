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
