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
  // Panels start collapsed so a 300-file PR does not freeze the tab.
  await page.locator("button.disclosure").first().click();
  await expect(page.locator(".chg")).toHaveText(["3", "6"]);
});

test("toggles to unified layout", async ({ page }) => {
  await page.goto("/#" + encodeURIComponent("o/r#5"));
  await page.evaluate(() => sessionStorage.setItem("charwise.token", "ghp_test"));
  await page.reload();

  await page.locator("button.disclosure").first().click();
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
  await page.locator("button.disclosure").first().click();
  await page.waitForSelector("table.diff");

  expect(foreign).toEqual([]);
});

test("forgets the token when the tab closes unless remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Pull request URL").fill("https://github.com/o/r/pull/5");
  await page.getByLabel("GitHub token").fill("ghp_test");
  await page.getByRole("button", { name: "Open diff" }).click();
  await page.waitForSelector("button.disclosure");

  const stored = await page.evaluate(() => ({
    session: sessionStorage.getItem("charwise.token"),
    local: localStorage.getItem("charwise.token"),
  }));
  expect(stored.session).toBe("ghp_test");
  expect(stored.local).toBeNull();
});
