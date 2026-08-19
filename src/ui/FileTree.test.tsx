import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FileTree from "./FileTree";

const files = [
  { path: "src/a.ts", additions: 3, deletions: 1 },
  { path: "src/b.ts", additions: 0, deletions: 7 },
];

describe("FileTree", () => {
  it("lists every file with its counts", () => {
    render(<FileTree files={files} viewed={new Set()} activeIndex={0} filter="" onFilterChange={() => {}} onSelect={() => {}} />);
    expect(screen.getByText("src/a.ts")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText("−7")).toBeInTheDocument();
  });

  it("marks a viewed file", () => {
    const { container } = render(
      <FileTree files={files} viewed={new Set(["src/a.ts"])} activeIndex={0} filter="" onFilterChange={() => {}} onSelect={() => {}} />,
    );
    expect(container.querySelectorAll("li.is-viewed")).toHaveLength(1);
  });

  it("marks the active file", () => {
    const { container } = render(
      <FileTree files={files} viewed={new Set()} activeIndex={1} filter="" onFilterChange={() => {}} onSelect={() => {}} />,
    );
    expect(container.querySelectorAll("li.is-active")).toHaveLength(1);
  });

  it("filters by substring", () => {
    render(<FileTree files={files} viewed={new Set()} activeIndex={0} filter="b.ts" onFilterChange={() => {}} onSelect={() => {}} />);
    expect(screen.queryByText("src/a.ts")).not.toBeInTheDocument();
    expect(screen.getByText("src/b.ts")).toBeInTheDocument();
  });

  it("calls onSelect with the index in the full list", async () => {
    const onSelect = vi.fn();
    render(<FileTree files={files} viewed={new Set()} activeIndex={0} filter="" onFilterChange={() => {}} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("src/b.ts"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
