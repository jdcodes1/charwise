import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Demo from "./Demo";

describe("Demo", () => {
  it("renders every case through the real engine", () => {
    const { container } = render(<Demo />);
    expect(container.querySelectorAll(".demo-case")).toHaveLength(4);
    expect(container.querySelectorAll("table.diff")).toHaveLength(4);
  });

  it("narrows the headline case to the single changed digit", () => {
    const { container } = render(<Demo />);
    const firstCase = container.querySelectorAll(".demo-case")[0];
    const highlights = [...firstCase.querySelectorAll(".chg")].map((n) => n.textContent);
    expect(highlights).toEqual(["3", "6"]);
  });

  it("shows whole-line highlighting when switched to GitHub's rendering", async () => {
    const { container } = render(<Demo />);
    await userEvent.click(screen.getByRole("button", { name: /github/i }));
    const firstCase = container.querySelectorAll(".demo-case")[0];
    const highlights = [...firstCase.querySelectorAll(".chg")].map((n) => n.textContent);
    // The contrast the landing page exists to make: the same edit, whole lines.
    expect(highlights).toEqual(["    timeout: 30_000,", "    timeout: 60_000,"]);
  });

  it("switches the demo between split and unified", async () => {
    const { container } = render(<Demo />);
    expect(container.querySelectorAll("tr.split").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /unified/i }));
    expect(container.querySelectorAll("tr.split")).toHaveLength(0);
  });
});
