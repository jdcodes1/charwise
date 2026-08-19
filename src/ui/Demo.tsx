import { useMemo, useState } from "react";
import { buildFileDiff } from "../diff";
import type { Layout, Row } from "../diff";
import DiffRow from "./DiffRow";

interface Case {
  title: string;
  note: string;
  file: string;
  patch: string;
}

/**
 * Real patches run through the real engine. Nothing here is a screenshot or a
 * mock — the page is the product, which is also the fastest way to be believed.
 */
const CASES: Case[] = [
  {
    title: "One character",
    file: "src/api/client.ts",
    note: "The whole reason this exists. GitHub paints both lines end to end; the change is one digit.",
    patch: [
      "@@ -41,4 +41,4 @@ export function makeClient() {",
      "   const client = new ApiClient({",
      "-    timeout: 30_000,",
      "+    timeout: 60_000,",
      "     retries: 3,",
    ].join("\n"),
  },
  {
    title: "A rename inside a long signature",
    file: "src/prefs/resolve.ts",
    note: "Only the substring that moved is lit. The sixty identical characters around it stay quiet.",
    patch: [
      "@@ -12,2 +12,2 @@",
      "-export function resolveUserPreferences(userId, { includeDefaults = true } = {}) {",
      "+export function resolveViewerPreferences(viewerId, { includeDefaults = true } = {}) {",
    ].join("\n"),
  },
  {
    title: "Reordered and edited together",
    file: "src/cache/loader.ts",
    note: "Lines are paired by similarity, not position. GitHub would line up the wrong two and paint both.",
    patch: [
      "@@ -28,4 +28,4 @@",
      '-  logger.debug("cache miss", { key });',
      "-  const value = await loader.load(key);",
      "+  const value = await loader.loadMany([key]);",
      '+  logger.debug("cache miss", { key });',
    ].join("\n"),
  },
  {
    title: "Whitespace only",
    file: "src/auth/session.ts",
    note: "Identical after trimming, so the whitespace itself is tinted — and copying the line still yields the real tab.",
    patch: [
      "@@ -8,3 +8,3 @@ function currentSession(req) {",
      "-\tif (!session) return null;",
      "+    if (!session) return null;",
      "   return session;",
    ].join("\n"),
  },
];

/** Collapse a row's segments to whole-line changes, the way GitHub renders. */
function asLineLevel(row: Row): Row {
  if (row.kind !== "pair" || !row.del || !row.add) return row;
  return {
    ...row,
    leftSegments: [{ kind: "chg", text: row.del.text }],
    rightSegments: [{ kind: "chg", text: row.add.text }],
    whitespaceOnly: false,
  };
}

export default function Demo() {
  const [layout, setLayout] = useState<Layout>("split");
  const [lineLevel, setLineLevel] = useState(false);

  const built = useMemo(
    () =>
      CASES.map((c) => ({
        ...c,
        rows: buildFileDiff({
          path: c.file,
          oldPath: c.file,
          status: "modified",
          additions: 1,
          deletions: 1,
          patch: c.patch,
        }).rows,
      })),
    [],
  );

  return (
    <section className="demo">
      <div className="demo-head">
        <h2>Four diffs, rendered by the engine on this page</h2>
        <div className="demo-controls">
          <div className="seg" role="group" aria-label="Layout">
            <button type="button" aria-pressed={layout === "split"} onClick={() => setLayout("split")}>
              Split
            </button>
            <button type="button" aria-pressed={layout === "unified"} onClick={() => setLayout("unified")}>
              Unified
            </button>
          </div>
          <button
            type="button"
            className="switch"
            aria-pressed={lineLevel}
            onClick={() => setLineLevel((v) => !v)}
          >
            <span className="dot" aria-hidden="true" />
            Show it GitHub&rsquo;s way
          </button>
        </div>
      </div>

      {built.map((c) => (
        <article className="demo-case" key={c.title}>
          <h3>{c.title}</h3>
          <p>{c.note}</p>
          <div className="panel">
            <div className="panel-bar">
              <span className="path">{c.file}</span>
              <span className={`tag${lineLevel ? "" : " on"}`}>{lineLevel ? "GitHub" : "Charwise"}</span>
            </div>
            <div className="scroll">
              <table className="diff">
                <tbody>
                  {c.rows.map((row, index) => (
                    <DiffRow row={lineLevel ? asLineLevel(row) : row} layout={layout} key={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
