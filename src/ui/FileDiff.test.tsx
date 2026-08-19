import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FileDiffInput } from "../diff";
import FileDiffPanel from "./FileDiff";

const file: FileDiffInput = {
  path: "src/api/client.ts",
  oldPath: "src/api/client.ts",
  status: "modified",
  additions: 1,
  deletions: 1,
  patch: "@@ -41,1 +41,1 @@\n-    timeout: 30_000,\n+    timeout: 60_000,",
};

function panel(props: Partial<Parameters<typeof FileDiffPanel>[0]> = {}) {
  return render(
    <FileDiffPanel
      input={file}
      layout="split"
      viewed={false}
      expanded
      onToggleViewed={() => {}}
      onToggleExpanded={() => {}}
      {...props}
    />,
  );
}

describe("FileDiffPanel", () => {
  it("shows the path and the change counts", () => {
    panel();
    expect(screen.getByText("src/api/client.ts")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
    expect(screen.getByText("−1")).toBeInTheDocument();
  });

  it("renders the diff rows when expanded and not viewed", () => {
    const { container } = panel();
    expect(container.querySelectorAll("table.diff tr")).toHaveLength(1);
  });

  it("collapses the rows when viewed", () => {
    const { container } = panel({ viewed: true });
    expect(container.querySelector("table.diff")).toBeNull();
  });

  it("builds nothing while collapsed", () => {
    const { container } = panel({ expanded: false });
    expect(container.querySelector("table.diff")).toBeNull();
    expect(screen.getByRole("button", { name: /src\/api\/client\.ts/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onToggleExpanded when the disclosure is clicked", async () => {
    const onToggleExpanded = vi.fn();
    panel({ expanded: false, onToggleExpanded });
    await userEvent.click(screen.getByRole("button", { name: /src\/api\/client\.ts/ }));
    expect(onToggleExpanded).toHaveBeenCalledOnce();
  });

  it("calls onToggleViewed when the checkbox is clicked", async () => {
    const onToggleViewed = vi.fn();
    panel({ onToggleViewed });
    await userEvent.click(screen.getByRole("checkbox", { name: /viewed/i }));
    expect(onToggleViewed).toHaveBeenCalledOnce();
  });

  it("shows a rename as old → new", () => {
    panel({
      input: {
        path: "src/new.ts",
        oldPath: "src/old.ts",
        status: "renamed",
        additions: 0,
        deletions: 0,
        patch: "@@ -1,1 +1,1 @@\n-a\n+b",
      },
    });
    expect(screen.getByText("src/old.ts → src/new.ts")).toBeInTheDocument();
  });

  it("explains an oversized file instead of rendering an empty table", () => {
    panel({ input: { path: "big.json", oldPath: "big.json", status: "modified", additions: 9000, deletions: 9000 } });
    expect(screen.getByText(/diff too large/i)).toBeInTheDocument();
  });
});

// GitHub omits `patch` for binary blobs, pure renames and empty files as well
// as for oversized ones. Calling all of them "too large" is simply false, and
// the reader's only escape hatch is a link to the file itself.
describe("FileDiffPanel without a patch", () => {
  const blobUrl = "https://github.com/o/r/blob/head1/docs/logo.png";

  const renamed: FileDiffInput = {
    path: "src/new.ts",
    oldPath: "src/old.ts",
    status: "renamed",
    additions: 0,
    deletions: 0,
  };
  const unchanged: FileDiffInput = {
    path: "src/empty.ts",
    oldPath: "src/empty.ts",
    status: "modified",
    additions: 0,
    deletions: 0,
  };
  const binary: FileDiffInput = {
    path: "docs/logo.png",
    oldPath: "docs/logo.png",
    status: "modified",
    additions: 0,
    deletions: 0,
  };
  const tooLarge: FileDiffInput = {
    path: "big.json",
    oldPath: "big.json",
    status: "modified",
    additions: 9000,
    deletions: 9000,
  };

  it("calls a pure rename a rename, not an oversized diff", () => {
    panel({ input: renamed, blobUrl });
    expect(screen.getByText(/renamed, no content change/i)).toBeInTheDocument();
    expect(screen.queryByText(/too large/i)).toBeNull();
  });

  it("calls a mode-only or empty change no content change", () => {
    panel({ input: unchanged, blobUrl });
    expect(screen.getByText(/no content change/i)).toBeInTheDocument();
    expect(screen.queryByText(/too large/i)).toBeNull();
  });

  it("calls a binary blob a binary file", () => {
    panel({ input: binary, blobUrl });
    expect(screen.getByText(/binary file/i)).toBeInTheDocument();
    expect(screen.queryByText(/too large/i)).toBeNull();
  });

  it("still calls a genuinely oversized text diff too large", () => {
    panel({ input: tooLarge, blobUrl });
    expect(screen.getByText(/diff too large/i)).toBeInTheDocument();
  });

  it("links every patch-less file to the file on GitHub", () => {
    for (const input of [renamed, unchanged, binary, tooLarge]) {
      const { unmount } = panel({ input, blobUrl });
      expect(screen.getByRole("link", { name: /view .*on github/i })).toHaveAttribute("href", blobUrl);
      unmount();
    }
  });
});
