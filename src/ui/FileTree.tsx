import { useRef } from "react";
import type { RefObject } from "react";

export interface FileTreeEntry {
  path: string;
  additions: number;
  deletions: number;
}

export default function FileTree({
  files,
  viewed,
  activeIndex,
  filter,
  onFilterChange,
  onSelect,
  filterRef,
}: {
  files: FileTreeEntry[];
  viewed: ReadonlySet<string>;
  activeIndex: number;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelect: (index: number) => void;
  filterRef?: RefObject<HTMLInputElement>;
}) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const inputRef = filterRef ?? fallbackRef;
  const needle = filter.toLowerCase();

  return (
    <nav className="file-tree">
      <input
        ref={inputRef}
        type="text"
        className="filter"
        value={filter}
        placeholder="Filter files"
        aria-label="Filter files"
        onChange={(e) => onFilterChange(e.target.value)}
      />
      <ul>
        {files.map((file, index) =>
          needle && !file.path.toLowerCase().includes(needle) ? null : (
            <li
              key={file.path}
              className={[index === activeIndex ? "is-active" : "", viewed.has(file.path) ? "is-viewed" : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <button type="button" onClick={() => onSelect(index)}>
                <span className="path">{file.path}</span>
                <span className="count add-count">+{file.additions}</span>
                <span className="count del-count">−{file.deletions}</span>
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
