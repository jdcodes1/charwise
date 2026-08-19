import type { FileDiff, Layout } from "../diff";
import DiffRow from "./DiffRow";

export default function FileDiffPanel({
  file,
  layout,
  viewed,
  onToggleViewed,
}: {
  file: FileDiff;
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
      {viewed ? null : file.tooLarge ? (
        <p className="too-large">Diff too large — GitHub did not send a patch for this file.</p>
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
