import { useCallback, useMemo, useRef, useState } from "react";
import type { FileDiffInput, Layout } from "../diff";
import type { GhPr } from "../github/types";
import { blobUrl } from "../github/url";
import { useKeyboardNav } from "../state/useKeyboardNav";
import { useViewedFiles } from "../state/useViewedFiles";
import FileDiffPanel from "./FileDiff";
import FileTree from "./FileTree";

export default function Review({ pr }: { pr: GhPr }) {
  const [layout, setLayout] = useState<Layout>("split");
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Panels start collapsed and nothing is parsed until one is opened. See the
  // useMemo in FileDiffPanel.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set<string>());
  const filterRef = useRef<HTMLInputElement>(null);
  const { viewed, toggle } = useViewedFiles(pr.headSha);

  // Metadata only — a rename, a count and a path. The file tree, the filter,
  // navigation and the viewed marks all work from this without any file's
  // patch ever being parsed.
  const inputs = useMemo<FileDiffInput[]>(
    () =>
      pr.files.map((file) => ({
        path: file.filename,
        oldPath: file.previousFilename ?? file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
      })),
    [pr.files],
  );

  const toggleExpanded = useCallback((path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const select = useCallback(
    (index: number) => {
      setActiveIndex(index);
      document.getElementById(`file-${inputs[index]?.path}`)?.scrollIntoView({ block: "start" });
    },
    [inputs],
  );

  // Indexes of the files the filter currently leaves on screen. Navigation
  // walks this list, not the full one — stepping onto a hidden file looks to
  // the reader like the keypress did nothing.
  const visible = useMemo(() => {
    const needle = filter.toLowerCase();
    return inputs
      .map((_, index) => index)
      .filter((index) => needle === "" || inputs[index].path.toLowerCase().includes(needle));
  }, [inputs, filter]);

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
        const path = inputs[activeIndex]?.path;
        if (path) toggle(path);
      },
      onFocusFilter: () => filterRef.current?.focus(),
    }),
    [activeIndex, inputs, step, toggle],
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
          files={inputs.map((f) => ({ path: f.path, additions: f.additions, deletions: f.deletions }))}
          viewed={viewed}
          activeIndex={activeIndex}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={select}
          filterRef={filterRef}
        />
        <div className="files">
          {inputs.length === 0 ? (
            <p className="empty">No files changed in this pull request.</p>
          ) : (
            inputs.map((input) => (
              <FileDiffPanel
                key={input.path}
                input={input}
                blobUrl={blobUrl(pr.ref, pr.headSha, input.path)}
                layout={layout}
                viewed={viewed.has(input.path)}
                expanded={expanded.has(input.path)}
                onToggleViewed={() => toggle(input.path)}
                onToggleExpanded={() => toggleExpanded(input.path)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
