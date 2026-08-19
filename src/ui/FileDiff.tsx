import type { FileDiff, Layout, NoPatchReason } from "../diff";
import DiffRow from "./DiffRow";

const NO_PATCH_MESSAGE: Record<NoPatchReason, string> = {
  renamed: "Renamed, no content change.",
  unchanged: "No content change.",
  binary: "Binary file.",
  "too-large": "Diff too large — GitHub did not send a patch for this file.",
};

export default function FileDiffPanel({
  file,
  blobUrl,
  layout,
  viewed,
  onToggleViewed,
}: {
  file: FileDiff;
  /** The file on GitHub — the only way to read a file we cannot diff. */
  blobUrl?: string;
  layout: Layout;
  viewed: boolean;
  onToggleViewed: () => void;
}) {
  const label = file.oldPath !== file.path ? `${file.oldPath} → ${file.path}` : file.path;

  return (
    <section className="panel" id={`file-${file.path}`}>
      <div className="panel-bar">
        <span className="path">{label}</span>
        <span className="count add-count">+{file.additions}</span>
        <span className="count del-count">−{file.deletions}</span>
        <label className="viewed">
          <input type="checkbox" checked={viewed} onChange={onToggleViewed} />
          Viewed
        </label>
      </div>
      {viewed ? null : file.noPatch ? (
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
