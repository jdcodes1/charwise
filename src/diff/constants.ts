/** Minimum similarity for a deleted line to pair with an inserted line. */
export const PAIR_THRESHOLD = 0.5;

/** Minimum similarity for a changed run to be refined to character level. */
export const REFINE_THRESHOLD = 0.3;

/** An unchanged run shorter than this, between two changes, is absorbed. */
export const ISLAND_MAX = 3;

/** Lines longer than this are truncated before the similarity DP runs. */
export const SIMILARITY_MAX_LEN = 1000;
