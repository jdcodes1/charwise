import { expect, test } from "@playwright/test";

const PR = { title: "Raise the timeout", head: { sha: "head1" } };

const FILES = [
  {
    filename: "src/api/client.ts",
    status: "modified",
    additions: 1,
    deletions: 1,
    patch: "@@ -41,1 +41,1 @@\n-    timeout: 30_000,\n+    timeout: 60_000,",
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api.github.com/repos/o/r/pulls/5/files*", (route) =>
    route.fulfill({ json: FILES }),
  );
  await page.route("**/api.github.com/repos/o/r/pulls/5", (route) => route.fulfill({ json: PR }));
});

test("loads a PR and highlights one character", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Pull request URL").fill("https://github.com/o/r/pull/5");
  await page.getByLabel("GitHub token").fill("ghp_test");
  await page.getByRole("button", { name: "Open diff" }).click();

  await expect(page.getByText("Raise the timeout")).toBeVisible();
  await expect(page.locator(".chg")).toHaveText(["3", "6"]);
});

test("toggles to unified layout", async ({ page }) => {
  await page.goto("/#" + encodeURIComponent("o/r#5"));
  await page.evaluate(() => sessionStorage.setItem("charwise.token", "ghp_test"));
  await page.reload();

  await page.waitForSelector("table.diff");
  await expect(page.locator("tr.split")).toHaveCount(1);
  await page.getByRole("button", { name: "Unified" }).click();
  await expect(page.locator("tr.split")).toHaveCount(0);
});

test("contacts no host other than api.github.com", async ({ page }) => {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).host;
    if (!/^(api\.github\.com|localhost:5273|127\.0\.0\.1:5273)$/.test(host)) foreign.push(request.url());
  });

  await page.goto("/");
  await page.getByLabel("Pull request URL").fill("https://github.com/o/r/pull/5");
  await page.getByLabel("GitHub token").fill("ghp_test");
  await page.getByRole("button", { name: "Open diff" }).click();
  await page.waitForSelector("table.diff");

  expect(foreign).toEqual([]);
});

test("forgets the token when the tab closes unless remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Pull request URL").fill("https://github.com/o/r/pull/5");
  await page.getByLabel("GitHub token").fill("ghp_test");
  await page.getByRole("button", { name: "Open diff" }).click();
  await page.waitForSelector("table.diff");

  const stored = await page.evaluate(() => ({
    session: sessionStorage.getItem("charwise.token"),
    local: localStorage.getItem("charwise.token"),
  }));
  expect(stored.session).toBe("ghp_test");
  expect(stored.local).toBeNull();
});

test("a many-file PR renders full-height panels, not squashed strips", async ({ page }) => {
  // Regression: `.files` is a scrolling flex column, and flex items shrink by
  // default. Every panel was squeezed toward zero height and `.panel`'s
  // `overflow: hidden` clipped the diff away, so a 46-file PR rendered as 46
  // empty strips. No jsdom test could catch it — jsdom does no layout — so the
  // guard has to live in a real browser.
  const many = Array.from({ length: 30 }, (_, i) => ({
    filename: `src/module${i}.ts`,
    status: "modified",
    additions: 1,
    deletions: 1,
    patch: "@@ -1,1 +1,1 @@\n-  const timeout = 30_000;\n+  const timeout = 60_000;",
  }));
  await page.route("**/api.github.com/repos/o/r/pulls/9/files*", (route) => route.fulfill({ json: many }));
  await page.route("**/api.github.com/repos/o/r/pulls/9", (route) =>
    route.fulfill({ json: { title: "Many files", head: { sha: "head9" } } }),
  );

  await page.goto("/");
  await page.getByLabel("Pull request URL").fill("https://github.com/o/r/pull/9");
  await page.getByLabel("GitHub token").fill("ghp_test");
  await page.getByRole("button", { name: "Open diff" }).click();
  await page.waitForSelector("table.diff");

  const panels = page.locator("section.panel");
  await expect(panels).toHaveCount(30);

  // The precise invariant: a panel must be at least as tall as the header and
  // table it contains. Squashed, it was 2px around 60px of content.
  const clipped = await panels.evaluateAll((els) =>
    els
      .map((panel) => {
        const bar = panel.querySelector(".panel-bar")?.getBoundingClientRect().height ?? 0;
        const table = panel.querySelector("table.diff")?.getBoundingClientRect().height ?? 0;
        return { panel: panel.getBoundingClientRect().height, content: bar + table };
      })
      .filter((m) => m.panel < m.content - 1),
  );
  expect(clipped).toEqual([]);

  // And the diff itself must actually be on screen, not merely in the DOM.
  const firstCell = page.locator("td.code").first();
  await expect(firstCell).toBeVisible();
  const cellHeight = await firstCell.evaluate((e) => e.getBoundingClientRect().height);
  expect(cellHeight).toBeGreaterThan(8);
});
