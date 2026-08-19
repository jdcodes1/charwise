import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildFileDiff } from "../diff";
import FileDiffPanel from "./FileDiff";

const file = buildFileDiff({
  path: "src/api/client.ts",
  oldPath: "src/api/client.ts",
  status: "modified",
  additions: 1,
  deletions: 1,
  patch: "@@ -41,1 +41,1 @@\n-    timeout: 30_000,\n+    timeout: 60_000,",
});

describe("FileDiffPanel", () => {
  it("shows the path and the change counts", () => {
    render(<FileDiffPanel file={file} layout="split" viewed={false} onToggleViewed={() => {}} />);
    expect(screen.getByText("src/api/client.ts")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("−1")).toBeInTheDocument();
  });

  it("renders the diff rows when not viewed", () => {
    const { container } = render(<FileDiffPanel file={file} layout="split" viewed={false} onToggleViewed={() => {}} />);
    expect(container.querySelectorAll("table.diff tr")).toHaveLength(1);
  });

  it("collapses the rows when viewed", () => {
    const { container } = render(<FileDiffPanel file={file} layout="split" viewed onToggleViewed={() => {}} />);
    expect(container.querySelector("table.diff")).toBeNull();
  });

  it("calls onToggleViewed when the checkbox is clicked", async () => {
    const onToggleViewed = vi.fn();
    render(<FileDiffPanel file={file} layout="split" viewed={false} onToggleViewed={onToggleViewed} />);
    await userEvent.click(screen.getByRole("checkbox", { name: /viewed/i }));
    expect(onToggleViewed).toHaveBeenCalledOnce();
  });

  it("shows a rename as old → new", () => {
    const renamed = buildFileDiff({
      path: "src/new.ts",
      oldPath: "src/old.ts",
      status: "renamed",
      additions: 0,
      deletions: 0,
      patch: "@@ -1,1 +1,1 @@\n-a\n+b",
    });
    render(<FileDiffPanel file={renamed} layout="split" viewed={false} onToggleViewed={() => {}} />);
    expect(screen.getByText("src/old.ts → src/new.ts")).toBeInTheDocument();
  });

  it("explains an oversized file instead of rendering an empty table", () => {
    const big = buildFileDiff({ path: "big.json", oldPath: "big.json", status: "modified", additions: 9000, deletions: 9000 });
    render(<FileDiffPanel file={big} layout="split" viewed={false} onToggleViewed={() => {}} />);
    expect(screen.getByText(/diff too large/i)).toBeInTheDocument();
  });
});
