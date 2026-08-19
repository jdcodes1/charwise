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

// GitHub omits `patch` for binary blobs, pure renames and empty files as well
// as for oversized ones. Calling all of them "too large" is simply false, and
// the reader's only escape hatch is a link to the file itself.
describe("FileDiffPanel without a patch", () => {
  const blobUrl = "https://github.com/o/r/blob/head1/docs/logo.png";

  function renderNoPatch(input: Parameters<typeof buildFileDiff>[0]) {
    return render(
      <FileDiffPanel
        file={buildFileDiff(input)}
        blobUrl={blobUrl}
        layout="split"
        viewed={false}
        onToggleViewed={() => {}}
      />,
    );
  }

  it("calls a pure rename a rename, not an oversized diff", () => {
    renderNoPatch({ path: "src/new.ts", oldPath: "src/old.ts", status: "renamed", additions: 0, deletions: 0 });
    expect(screen.getByText(/renamed, no content change/i)).toBeInTheDocument();
    expect(screen.queryByText(/too large/i)).toBeNull();
  });

  it("calls a mode-only or empty change no content change", () => {
    renderNoPatch({ path: "src/empty.ts", oldPath: "src/empty.ts", status: "modified", additions: 0, deletions: 0 });
    expect(screen.getByText(/no content change/i)).toBeInTheDocument();
    expect(screen.queryByText(/too large/i)).toBeNull();
  });

  it("calls a binary blob a binary file", () => {
    renderNoPatch({ path: "docs/logo.png", oldPath: "docs/logo.png", status: "modified", additions: 0, deletions: 0 });
    expect(screen.getByText(/binary file/i)).toBeInTheDocument();
    expect(screen.queryByText(/too large/i)).toBeNull();
  });

  it("still calls a genuinely oversized text diff too large", () => {
    renderNoPatch({ path: "big.json", oldPath: "big.json", status: "modified", additions: 9000, deletions: 9000 });
    expect(screen.getByText(/diff too large/i)).toBeInTheDocument();
  });

  it("links every patch-less file to the file on GitHub", () => {
    for (const input of [
      { path: "src/new.ts", oldPath: "src/old.ts", status: "renamed", additions: 0, deletions: 0 },
      { path: "src/empty.ts", oldPath: "src/empty.ts", status: "modified", additions: 0, deletions: 0 },
      { path: "docs/logo.png", oldPath: "docs/logo.png", status: "modified", additions: 0, deletions: 0 },
      { path: "big.json", oldPath: "big.json", status: "modified", additions: 9000, deletions: 9000 },
    ]) {
      const { unmount } = renderNoPatch(input);
      expect(screen.getByRole("link", { name: /view .*on github/i })).toHaveAttribute("href", blobUrl);
      unmount();
    }
  });
});
