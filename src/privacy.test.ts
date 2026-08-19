import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx|css)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      out.push(path);
    }
  }
  return out;
}

// api.github.com is the only host we call; github.com appears only in link text
// and placeholders. Anything else is a privacy regression.
const ALLOWED_HOSTS = ["api.github.com", "github.com"];

describe("privacy", () => {
  it("references no host other than github", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(/https?:\/\/([^\s"'`/)]+)/g)) {
        if (!ALLOWED_HOSTS.includes(match[1])) offenders.push(`${path}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("passes a host other than api.github.com to no fetch call", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      for (const match of readFileSync(path, "utf8").matchAll(/fetch\w*\(\s*[`"']([^`"']+)/g)) {
        if (/^https?:\/\//.test(match[1]) && !match[1].startsWith("https://api.github.com")) {
          offenders.push(`${path}: ${match[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("loads no remote stylesheet or font", () => {
    const css = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
    expect(css).not.toMatch(/@import/);
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    expect(html).not.toMatch(/<link[^>]+href="http/);
  });

  it("never puts the token in a URL", () => {
    for (const path of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/[?&](access_token|token)=/);
    }
  });
});
