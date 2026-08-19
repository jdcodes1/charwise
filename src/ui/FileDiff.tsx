import { useMemo } from "react";
import { buildFileDiff } from "../diff";
import type { FileDiffInput, Layout, NoPatchReason } from "../diff";
import DiffRow from "./DiffRow";

const NO_PATCH_MESSAGE: Record<NoPatchReason, string> = {
  renamed: "Renamed, no content change.",
  unchanged: "No content change.",
  binary: "Binary file.",
  "too-large": "Diff too large — GitHub did not send a patch for this file.",
};

export default function FileDiffPanel({
  input,
  blobUrl,
  layout,
  viewed,
  expanded,
  onToggleViewed,
  onToggleExpanded,
}: {
  /** Raw metadata and patch. Rows are built here, only once expanded. */
  input: FileDiffInput;
  /** The file on GitHub — the only way to read a file we cannot diff. */
  blobUrl?: string;
  layout: Layout;
  viewed: boolean;
  expanded: boolean;
  onToggleViewed: () => void;
  onToggleExpanded: () => void;
}) {
  const label = input.oldPath !== input.path ? `${input.oldPath} → ${input.path}` : input.path;
  const open = expanded && !viewed;

  // The whole point of the disclosure: parsing, pairing and refining one file
  // is tens of milliseconds, and doing all 300 of them inside one render blocked
  // the main thread for seconds with no spinner, because the query had already
  // resolved. Nothing is computed for a file the reader has not opened.
  const file = useMemo(() => (open ? buildFileDiff(input) : null), [input, open]);

  return (
    <section className="panel" id={`file-${input.path}`}>
      <div className="panel-bar">
        <button type="button" className="disclosure" aria-expanded={expanded} onClick={onToggleExpanded}>
          <span className="caret" aria-hidden="true">
            {expanded ? "▾" : "▸"}
          </span>
          <span className="path">{label}</span>
        </button>
        <span className="count add-count">+{input.additions}</span>
        <span className="count del-count">−{input.deletions}</span>
        <label className="viewed">
          <input type="checkbox" checked={viewed} onChange={onToggleViewed} />
          Viewed
        </label>
      </div>
      {!expanded && !viewed && (
        // A bare caret was not enough of an affordance: a 46-file PR opened as
        // a wall of headers and read as an app that had failed to load.
        <button type="button" className="show-diff" onClick={onToggleExpanded}>
          Show diff
        </button>
      )}
      {!file ? null : file.noPatch ? (
        <p className="no-patch">
          <span>{NO_PATCH_MESSAGE[file.noPatch]}</span>{" "}
          {blobUrl && (
            <a className="blob-link" href={blobUrl} target="_blank" rel="noreferrer noopener">
              View file on GitHub
            </a>
          )}
        </p>
      ) : (
        <div className="scroll">
          <table className="diff">
            <tbody>
              {file.rows.map((row, index) => (
                <DiffRow row={row} layout={layout} key={index} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
