import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { generate } from "./generate";
import { ThemeSchema, type ThemeConfig } from "./themeSchema";

const repoRoot = join(__dirname, "..", "..");

/**
 * Recursively collect every `theme.json` under `dir` (mirrors the spec's
 * `examples/**\/theme.json` glob without adding a glob dependency). Kept
 * local rather than shared with `example-themes.test.ts` — that suite
 * asserts schema parity, this one asserts CSS-injection safety.
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

const workspaceThemeFiles = [
  ...findThemeJsonFiles(join(repoRoot, "examples")),
  join(repoRoot, "examples", "theme.json"),
  join(repoRoot, "examples", "shadcn-theme.json"),
  join(repoRoot, "site", "src", "theme", "theme.json"),
].filter((path, index, all) => all.indexOf(path) === index);

const injectionCases: { label: string; theme: ThemeConfig }[] = [
  {
    label: "key closes a rule and opens a selector (x}body{)",
    theme: { colors: { "x}body{": "red" } },
  },
  {
    label: "key starting with -- (custom-property syntax)",
    theme: { colors: { "--x": "red" } },
  },
  {
    label: "value closes the rule then @imports an external resource",
    theme: { colors: { primary: "red;}@import url(evil.css);" } },
  },
  {
    label: "value closes the rule then injects an @plugin at-rule",
    theme: { colors: { primary: 'red}\n@plugin "x"' } },
  },
  {
    label: "value breaks out of the declaration into a script tag",
    theme: { colors: { primary: "</style><script>" } },
  },
  {
    label: "empty axis-key inside themes",
    theme: {
      colors: { primary: "#fff" },
      themes: { "": { colors: { primary: "#000" } } },
    },
  },
];

describe("generate() — CSS injection guard", () => {
  it.each(injectionCases)("rejects: $label", ({ theme }) => {
    expect(() => generate(theme)).toThrow();
  });

  it.each(workspaceThemeFiles)(
    "%s: generate().css never emits an at-rule that loads an external resource",
    (file) => {
      const theme = ThemeSchema.parse(JSON.parse(readFileSync(file, "utf8")));
      const { css } = generate(theme);
      expect(css).not.toMatch(/@(plugin|config|import)\b/);
    },
  );
});
