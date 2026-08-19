import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { buildRows, parsePatch } from "../diff";
import DiffRow from "./DiffRow";

const rowsFor = (patch: string) => buildRows(parsePatch(patch));

const table = (ui: ReactNode) => render(<table><tbody>{ui}</tbody></table>);

describe("DiffRow", () => {
  it("highlights only the changed character in split layout", () => {
    const [row] = rowsFor("@@ -1,1 +1,1 @@\n-    timeout: 30_000,\n+    timeout: 60_000,");
    const { container } = table(<DiffRow row={row} layout="split" />);
    const highlights = [...container.querySelectorAll(".chg")].map((n) => n.textContent);
    expect(highlights).toEqual(["3", "6"]);
  });

  it("renders both sides of a pair in one row when split", () => {
    const [row] = rowsFor("@@ -1,1 +1,1 @@\n-a = 1;\n+a = 2;");
    const { container } = table(<DiffRow row={row} layout="split" />);
    expect(container.querySelectorAll("tr")).toHaveLength(1);
    expect(container.querySelectorAll("td.code")).toHaveLength(2);
  });

  it("renders a pair as two stacked rows when unified", () => {
    const [row] = rowsFor("@@ -1,1 +1,1 @@\n-a = 1;\n+a = 2;");
    const { container } = table(<DiffRow row={row} layout="unified" />);
    expect(container.querySelectorAll("tr")).toHaveLength(2);
  });

  it("shows an empty cell opposite an unmatched insertion", () => {
    const rows = rowsFor("@@ -1,1 +1,1 @@\n-  await legacyQueue.publish(event);\n+  await bus.emit(event.type, event.payload);");
    const { container } = table(<DiffRow row={rows[1]} layout="split" />);
    expect(container.querySelector("td.code.empty")).not.toBeNull();
  });

  it("makes whitespace visible on a whitespace-only change", () => {
    const [row] = rowsFor("@@ -1,1 +1,1 @@\n-\tif (x) return;\n+    if (x) return;");
    const { container } = table(<DiffRow row={row} layout="split" />);
    expect(container.querySelectorAll(".ws").length).toBeGreaterThan(0);
  });

  it("keeps the real characters when marking whitespace", () => {
    const [row] = rowsFor("@@ -1,1 +1,1 @@\n-\tif (x) return;\n+    if (x) return;");
    const { container } = table(<DiffRow row={row} layout="split" />);
    // Selecting and copying these cells must yield the original code, not the
    // markers. textContent is exactly what the clipboard receives.
    const cells = [...container.querySelectorAll("td.code")].map((c) => c.textContent);
    expect(cells).toEqual(["\tif (x) return;", "    if (x) return;"]);
  });

  it("does not mark whitespace on an ordinary change", () => {
    const [row] = rowsFor("@@ -1,1 +1,1 @@\n-  a = 1;\n+  a = 2;");
    const { container } = table(<DiffRow row={row} layout="split" />);
    expect(container.querySelector(".ws")).toBeNull();
  });

  it("renders a context line with no highlight on either side", () => {
    const rows = rowsFor("@@ -1,2 +1,2 @@\n   ok;\n-a\n+b");
    const { container } = table(<DiffRow row={rows[0]} layout="split" />);
    expect(container.querySelector(".chg")).toBeNull();
    // Assert on textContent, not getAllByText: Testing Library trims the DOM
    // text before comparing but not the query string, so a query with leading
    // whitespace can never match — and leading whitespace is exactly what a
    // diff must preserve.
    const cells = [...container.querySelectorAll("td.code")].map((c) => c.textContent);
    expect(cells).toEqual(["  ok;", "  ok;"]);
  });

  it("shows the line number on each side", () => {
    const [row] = rowsFor("@@ -41,1 +41,1 @@\n-a = 1;\n+a = 2;");
    const { container } = table(<DiffRow row={row} layout="split" />);
    expect([...container.querySelectorAll("td.gutter")].map((n) => n.textContent)).toEqual(["41", "41"]);
  });
});
