import { useCallback, useMemo, useRef, useState } from "react";
import { buildFileDiff } from "../diff";
import type { Layout } from "../diff";
import type { GhPr } from "../github/types";
import { useKeyboardNav } from "../state/useKeyboardNav";
import { useViewedFiles } from "../state/useViewedFiles";
import FileDiffPanel from "./FileDiff";
import FileTree from "./FileTree";

export default function Review({ pr }: { pr: GhPr }) {
  const [layout, setLayout] = useState<Layout>("split");
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const filterRef = useRef<HTMLInputElement>(null);
  const { viewed, toggle } = useViewedFiles(pr.headSha);

  const diffs = useMemo(
    () =>
      pr.files.map((file) =>
        buildFileDiff({
          path: file.filename,
          oldPath: file.previousFilename ?? file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
        }),
      ),
    [pr.files],
  );

  const select = useCallback(
    (index: number) => {
      setActiveIndex(index);
      document.getElementById(`file-${diffs[index]?.path}`)?.scrollIntoView({ block: "start" });
    },
    [diffs],
  );

  useKeyboardNav({
    onNextFile: useCallback(() => select(Math.min(activeIndex + 1, diffs.length - 1)), [activeIndex, diffs.length, select]),
    onPrevFile: useCallback(() => select(Math.max(activeIndex - 1, 0)), [activeIndex, select]),
    onToggleLayout: useCallback(() => setLayout((l) => (l === "split" ? "unified" : "split")), []),
    onToggleViewed: useCallback(() => {
      const path = diffs[activeIndex]?.path;
      if (path) toggle(path);
    }, [activeIndex, diffs, toggle]),
    onFocusFilter: useCallback(() => filterRef.current?.focus(), []),
  });

  return (
    <div className="review">
      <header className="review-bar">
        <span className="pr-title">
          {pr.ref.owner}/{pr.ref.repo}#{pr.ref.number} · {pr.title}
        </span>
        <div className="seg" role="group" aria-label="Layout">
          <button type="button" aria-pressed={layout === "split"} onClick={() => setLayout("split")}>
            Split
          </button>
          <button type="button" aria-pressed={layout === "unified"} onClick={() => setLayout("unified")}>
            Unified
          </button>
        </div>
      </header>
      <div className="review-body">
        <FileTree
          files={diffs.map((d) => ({ path: d.path, additions: d.additions, deletions: d.deletions }))}
          viewed={viewed}
          activeIndex={activeIndex}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={select}
          filterRef={filterRef}
        />
        <div className="files">
          {diffs.map((file) => (
            <FileDiffPanel
              key={file.path}
              file={file}
              layout={layout}
              viewed={viewed.has(file.path)}
              onToggleViewed={() => toggle(file.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
