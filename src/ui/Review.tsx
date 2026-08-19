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

  // Indexes of the files the filter currently leaves on screen. Navigation
  // walks this list, not the full one — stepping onto a hidden file looks to
  // the reader like the keypress did nothing.
  const visible = useMemo(() => {
    const needle = filter.toLowerCase();
    return diffs
      .map((_, index) => index)
      .filter((index) => needle === "" || diffs[index].path.toLowerCase().includes(needle));
  }, [diffs, filter]);

  const step = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      const at = visible.indexOf(activeIndex);
      // If the active file has been filtered away, land on the first visible one.
      const next = at === -1 ? 0 : Math.min(Math.max(at + delta, 0), visible.length - 1);
      select(visible[next]);
    },
    [activeIndex, select, visible],
  );

  // Memoized: useKeyboardNav lists this object in its effect deps, so a fresh
  // literal each render would detach and reattach the document listener on
  // every keystroke.
  const handlers = useMemo(
    () => ({
      onNextFile: () => step(1),
      onPrevFile: () => step(-1),
      onToggleLayout: () => setLayout((l) => (l === "split" ? "unified" : "split")),
      onToggleViewed: () => {
        const path = diffs[activeIndex]?.path;
        if (path) toggle(path);
      },
      onFocusFilter: () => filterRef.current?.focus(),
    }),
    [activeIndex, diffs, step, toggle],
  );

  useKeyboardNav(handlers);

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
