# Charwise — project context

Local web app that renders GitHub PR diffs with character-level highlighting.

## Why it exists

GitHub highlights whole lines. A one-character change lights up two entire lines,
and GitHub pairs deleted to inserted lines by position, so reordered code shows
as two fully-highlighted lines that share almost everything.

## Privacy contract

This is the constraint the whole design serves. Breaking any line of it is a bug,
not a tradeoff:

- **No backend exists.** The browser calls `api.github.com` directly. Nothing is
  proxied, logged, or persisted anywhere but this device.
- **api.github.com is the only host contacted.** No analytics, telemetry, error
  reporting, CDN, or remote fonts. `src/privacy.test.ts` fails the build on any
  other absolute URL in `src/`, and an end-to-end test asserts no foreign request
  during a real load.
- **Diff computation is local.** Patch text is parsed, paired, and refined in the
  tab that renders it.
- **The token defaults to `sessionStorage`** and dies with the tab. "Remember on
  this device" moves it to `localStorage`; "Clear local data" wipes both plus
  every `charwise.*` key.
- **The token travels in the `Authorization` header only** — never a URL, never
  the hash.
- **The URL hash holds `owner/repo#number`.** Browser history learns which PR was
  opened, never its contents.

## Architecture

Static SPA, no backend. Read-only — nothing in this codebase writes to GitHub.

`src/diff/` is the product: pure TypeScript, no React, no DOM, no dependencies.
`src/diff/purity.test.ts` enforces that. Dependency order within it is strict:

`constants` → `lcs` → `tokenize` → `refine` → `parsePatch` → `pairLines` → `index`

The pipeline is fetch → parse → pair → refine:

1. **Parse** a GitHub unified `patch` into hunks with per-side line numbers.
2. **Pair** deletions to insertions by normalized LCS similarity above the pair
   threshold — not by position. This is what makes reordered code readable.
3. **Refine** each pair: token diff, then character diff inside any changed run
   whose two sides score above the refine threshold. Unchanged runs shorter than
   the island cap, between two changes, are absorbed so a change reads as one
   span.

## Thresholds

All live in `src/diff/constants.ts` and nowhere else. Changing any of them
changes the look of every diff — the tests in `src/diff/refine.test.ts` and
`src/diff/pairLines.test.ts` encode current output.

- **`PAIR_THRESHOLD` = 0.6.** Minimum similarity for a deleted line to pair with
  an inserted line. Raised from 0.5: normalized LCS over raw characters is
  inflated by shared indentation and punctuation, so 0.5 paired unrelated
  statements (measured 0.506 on the `legacyQueue`/`bus.emit` case in
  `lcs.test.ts`). 0.6 keeps them apart.
- **`REFINE_THRESHOLD` = 0.3.** Minimum similarity for a changed run to be
  refined to character level; below it the pair renders as whole-line
  highlighting instead of a misleading scatter of tiny matches.
- **`ISLAND_MAX` = 3.** An unchanged run shorter than this, sitting between two
  changes, is absorbed into the surrounding change. Without this cap, a change
  like `foo` → `bar` inside a longer identifier renders as three separate
  spans instead of reading as one edit.
- **`SIMILARITY_MAX_LEN` = 1000.** Lines longer than this are truncated before
  the similarity DP runs, so one minified or generated line can't blow up the
  pairing cost.
- **`REFINE_MAX_LINE` = 2000.** Longest line `refinePair` will diff. Both the
  token DP and the character DP are O(n·m) in time and memory, so a minified or
  generated line past this length would allocate gigabytes and hang the tab.
  Past this length the pair degrades to whole-line highlighting, which is what
  GitHub shows anyway.
- **`PAIR_MAX_COMPARISONS` = 10,000.** Above this many deletion × insertion
  comparisons, `pairBlock` stops considering every insertion for every deletion.
  Every comparison is an O(n·m) DP, so a 200×200 changed block is 40,000
  similarity DPs — around a second of synchronous work before the UI paints.
- **`PAIR_WINDOW` = 25.** Once the comparison cap is exceeded, a deletion only
  looks within this many lines of its own index for a partner. Reordering
  within the window still pairs; a move past it degrades to unpaired rather
  than a wrong pairing.

## Rendering cost

`buildFileDiff` runs per file, not per PR. Each panel parses its own patch
inside its own `useMemo`, and only while it is expanded.

**`FILES_AUTO_EXPAND` = 20** (`src/diff/constants.ts`) is the line between the
two behaviours. At or below it every file opens expanded — the common case,
where building the whole PR costs a few hundred milliseconds (measured: a
20-file PR mounts in 426 ms with all 900 rows). Above it the PR opens collapsed
and each file is built when the reader opens it, because building all 300 files
at GitHub's cap during one render measured 3,504 ms of blocked main thread and
13,500 mounted rows, with `isPending` already false so nothing on screen said
the tab was working. Collapsed, the same 300-file PR mounts in 117 ms with no
rows built, and expanding one file costs about 78 ms.

The cap exists because the cost is per-PR and the fix is not free either way: a
click per file is the wrong price to pay on a 30-file PR that was never slow,
and a frozen tab is the wrong price to pay on a 300-file one.

The file tree, the filter, keyboard navigation and the viewed marks all run off
metadata and force no build, so none of them expand anything.

There is no virtualizer: a single very long file still mounts all its rows.

## Cost

Zero infrastructure. GitHub's API allows 5,000 authenticated requests per hour;
one PR costs 1 + ceil(files / 100) requests, and results are cached 5 minutes.

## Deliberately not built

- Clearing the token field after a 401. `PrLoader.open` stores the token before
  the request is made, so a rejected token is still in the field when the error
  comes back. Considered and kept: a rejected token is usually a typo or a
  stale-by-one-character paste, and leaving the value visible lets it be
  corrected instead of retyped. The error names the field and the cursor is put
  there, so nothing suggests the token was accepted.
- Posting comments, approving, merging — review is still submitted on GitHub
- Syntax highlighting
- Local git repos, pasted diffs, file uploads
- Blob fallback for files GitHub omits a patch for. The panel says *why* there
  is no diff (renamed, no content change, binary, or genuinely too large) and
  links to the file on GitHub, but does not fetch the blob.
- Hunk-level `j`/`k`; today those keys move between files
- Unlimited viewed-mark history — marks are kept for the 20 most recent head
  SHAs only (`MAX_SHAS` in `src/state/useViewedFiles.ts`). One key per SHA
  forever would leave a daily reviewer with thousands of dead localStorage
  entries and eventually hit the origin's storage quota; older SHAs are dropped
  in favor of a bounded, most-recent-first list.
- A globally optimal line pairing. `pairBlock` is greedy: each deletion, in
  scan order, claims the best unclaimed insertion above threshold. In an
  adversarial ordering this can leave a matchable line unpaired even though a
  different assignment would have paired it. It never produces a *wrong*
  pairing — worst case it degrades to no pairing, same as if the lines were
  unrelated.
- Exhaustive pairing on huge changed blocks. Above `PAIR_MAX_COMPARISONS`,
  pairing only looks within `PAIR_WINDOW` lines of a deletion's own index, so a
  line moved very far within a huge changed block renders unpaired rather than
  paired to its actual match elsewhere in the block.
