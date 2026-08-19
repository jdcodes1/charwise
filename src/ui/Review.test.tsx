import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { GhPr } from "../github/types";
import Review from "./Review";

const pr: GhPr = {
  ref: { owner: "o", repo: "r", number: 5 },
  title: "Raise the timeout",
  headSha: "head1",
  baseSha: "base1",
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

  it("starts in split layout and switches to unified", async () => {
    const { container } = render(<Review pr={pr} />);
    expect(container.querySelectorAll("tr.split")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /unified/i }));
    expect(container.querySelectorAll("tr.split")).toHaveLength(0);
    expect(container.querySelectorAll("table.diff tr")).toHaveLength(2);
  });
});
