import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { FILES_AUTO_EXPAND } from "../diff/constants";
import type { GhPr } from "../github/types";
import Review from "./Review";

const pr: GhPr = {
  ref: { owner: "o", repo: "r", number: 5 },
  title: "Raise the timeout",
  headSha: "head1",
  files: [
    {
      filename: "src/api/client.ts",
      previousFilename: null,
      status: "modified",
      additions: 1,
      deletions: 1,
      patch: "@@ -41,1 +41,1 @@\n-    timeout: 30_000,\n+    timeout: 60_000,",
    },
  ],
};

beforeEach(() => localStorage.clear());

describe("Review", () => {
  it("shows the PR title and file", () => {
    render(<Review pr={pr} />);
    expect(screen.getByText(/Raise the timeout/)).toBeInTheDocument();
    expect(screen.getAllByText("src/api/client.ts").length).toBeGreaterThan(0);
  });

  it("renders character-level highlights", () => {
    const { container } = render(<Review pr={pr} />);
    expect([...container.querySelectorAll(".chg")].map((n) => n.textContent)).toEqual(["3", "6"]);
  });

  it("skips files the filter has hidden when navigating", async () => {
    const many: GhPr = {
      ...pr,
      files: ["src/alpha.ts", "src/beta.ts", "src/gamma.ts"].map((filename) => ({
        filename,
        previousFilename: null,
        status: "modified",
        additions: 1,
        deletions: 1,
        patch: "@@ -1,1 +1,1 @@\n-  const a = 1;\n+  const a = 2;",
      })),
    };
    const { container } = render(<Review pr={many} />);
    await userEvent.type(screen.getByLabelText(/filter files/i), "gamma");
    // Focus must leave the filter or the shortcut is correctly suppressed.
    await userEvent.click(container.querySelector(".files") as HTMLElement);
    await userEvent.keyboard("j");
    const active = container.querySelector("li.is-active .path");
    expect(active?.textContent).toBe("src/gamma.ts");
  });

  it("starts in split layout and switches to unified", async () => {
    const { container } = render(<Review pr={pr} />);
    expect(container.querySelectorAll("tr.split")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /unified/i }));
    expect(container.querySelectorAll("tr.split")).toHaveLength(0);
    expect(container.querySelectorAll("table.diff tr")).toHaveLength(2);
  });
});

function prWith(fileCount: number): GhPr {
  return {
    ...pr,
    files: Array.from({ length: fileCount }, (_, i) => ({
      filename: `src/module${i}.ts`,
      previousFilename: null,
      status: "modified",
      additions: 1,
      deletions: 1,
      patch: "@@ -1,1 +1,1 @@\n-  const a = 1;\n+  const a = 2;",
    })),
  };
}

describe("Review above the auto-expand cap", () => {
  const many = prWith(FILES_AUTO_EXPAND + 5);

  // Building every file's rows during render blocked the main thread for
  // seconds on a 300-file PR, with isPending already false so nothing on
  // screen said anything was happening.
  it("builds rows for no file until one is expanded", async () => {
    const { container } = render(<Review pr={many} />);
    expect(container.querySelectorAll("table.diff")).toHaveLength(0);

    await userEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    expect(container.querySelectorAll("table.diff")).toHaveLength(1);

    await userEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    expect(container.querySelectorAll("table.diff")).toHaveLength(2);
  });

  it("lists every file in the tree without building any rows", () => {
    const { container } = render(<Review pr={many} />);
    expect(container.querySelectorAll(".file-tree li")).toHaveLength(FILES_AUTO_EXPAND + 5);
    expect(container.querySelectorAll("table.diff")).toHaveLength(0);
  });
});

describe("Review at or below the auto-expand cap", () => {
  // The common case. A PR this size costs a few hundred milliseconds to build
  // in full, which is not worth a click per file to avoid.
  it("builds every file's rows on mount", () => {
    const { container } = render(<Review pr={prWith(FILES_AUTO_EXPAND)} />);
    expect(container.querySelectorAll("table.diff")).toHaveLength(FILES_AUTO_EXPAND);
    expect(screen.queryAllByRole("button", { expanded: false })).toHaveLength(0);
  });

  it("still lets a file be collapsed by hand", async () => {
    const { container } = render(<Review pr={prWith(3)} />);
    expect(container.querySelectorAll("table.diff")).toHaveLength(3);
    await userEvent.click(screen.getAllByRole("button", { expanded: true })[0]);
    expect(container.querySelectorAll("table.diff")).toHaveLength(2);
  });
});

describe("Review with no files", () => {
  it("says so instead of rendering a bare header", () => {
    render(<Review pr={{ ...pr, files: [] }} />);
    expect(screen.getByText(/no files changed/i)).toBeInTheDocument();
  });
});
