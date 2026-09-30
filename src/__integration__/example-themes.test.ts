import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { ThemeSchema } from "../core/themeSchema";

const repoRoot = join(__dirname, "..", "..");

/**
 * Recursively collect every `theme.json` under `dir` (mirrors the spec's
 * `examples/**\/theme.json` glob without adding a glob dependency).
 * @param {string} dir - Directory to walk
 * @returns {string[]} Absolute paths of every `theme.json` found
 */
const findThemeJsonFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") return [];
      return findThemeJsonFiles(full);
    }
    return entry.name === "theme.json" ? [full] : [];
  });
};

const themeFiles = [
  ...findThemeJsonFiles(join(repoRoot, "examples")),
  join(repoRoot, "examples", "theme.json"),
  join(repoRoot, "examples", "shadcn-theme.json"),
  join(repoRoot, "site", "src", "theme", "theme.json"),
]
  // findThemeJsonFiles(examples) already picks up examples/theme.json and
  // every nested `theme.json` — dedupe against the explicit entries above.
  .filter((path, index, all) => all.indexOf(path) === index);

describe("integration: workspace theme.json files parse via ThemeSchema", () => {
  it("found at least the known example/site theme files", () => {
    expect(themeFiles.length).toBeGreaterThanOrEqual(6);
  });

  it.each(themeFiles)("%s parses successfully", (file) => {
    const json: unknown = JSON.parse(readFileSync(file, "utf8"));
    const result = ThemeSchema.safeParse(json);
    if (!result.success) {
      throw new Error(
        `${file} failed ThemeSchema.parse:\n${result.error.issues
          .map((issue) => `  - [${issue.path.join(".")}] ${issue.message}`)
          .join("\n")}`,
      );
    }
    expect(result.success).toBe(true);
  });
});
