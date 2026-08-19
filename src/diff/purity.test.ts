import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("src/diff purity", () => {
  it("imports nothing outside src/diff", () => {
    const dir = join(process.cwd(), "src/diff");
    const offenders: string[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
      const source = readFileSync(join(dir, file), "utf8");
      for (const match of source.matchAll(/from\s+"([^"]+)"/g)) {
        if (!match[1].startsWith("./")) offenders.push(`${file} -> ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
