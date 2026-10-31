import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";
import { z } from "zod";

import { generateThemeCss } from "../features/theme-css/generateThemeCss";

import { generate } from "./generate";
import type { StyleGeneratorOptions } from "./Options";
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

const injectionCases: { label: string; path: string; theme: ThemeConfig }[] = [
  {
    label: "key closes a rule and opens a selector (x}body{)",
    path: "colors.x}body{",
    theme: { colors: { "x}body{": "red" } },
  },
  {
    label: "key starting with -- (custom-property syntax)",
    path: "colors.--x",
    theme: { colors: { "--x": "red" } },
  },
  {
    label: "value closes the rule then @imports an external resource",
    path: "colors.primary",
    theme: { colors: { primary: "red;}@import url(evil.css);" } },
  },
  {
    label: "value closes the rule then injects an @plugin at-rule",
    path: "colors.primary",
    theme: { colors: { primary: 'red}\n@plugin "x"' } },
  },
  {
    label: "value breaks out of the declaration into a script tag",
    path: "colors.primary",
    theme: { colors: { primary: "</style><script>" } },
  },
  {
    label: "empty axis name inside themeAxes",
    path: "themeAxes.",
    theme: {
      colors: { primary: "#fff" },
      themeAxes: { "": { dark: { colors: { primary: "#000" } } } },
    },
  },
];

/**
 * Run `fn` and return the issue paths of the `ZodError` it throws; fails the
 * test when it throws anything else or nothing at all.
 * @param {() => unknown} fn - Call expected to throw a `ZodError`
 * @returns {string[]} The issue paths, joined with `.`
 */
const zodIssuePaths = (fn: () => unknown): string[] => {
  let error: unknown;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(z.ZodError);
  return (error as z.ZodError).issues.map((i) => i.path.join("."));
};

const optionInjectionCases: {
  label: string;
  path: string;
  options: StyleGeneratorOptions;
}[] = [
  {
    label: "screens value closes @theme then @imports an external resource",
    path: "screens.md",
    options: { screens: { md: "1px;}@import url(evil.css);" } },
  },
  {
    label: "screens key closes the declaration",
    path: 'screens.x:1}@plugin "x"{',
    options: { screens: { 'x:1}@plugin "x"{': "1px" } },
  },
  {
    label: "spacing.properties CSS property injects an @plugin at-rule",
    path: "spacing.properties.p.0",
    options: {
      spacing: {
        properties: { p: ['padding:0}@plugin "x";a{b'] },
      },
    },
  },
  {
    label: "spacing.properties key breaks out of the @utility name",
    path: "spacing.properties.p{}@plugin x;",
    options: {
      spacing: { properties: { "p{}@plugin x;": ["padding"] } },
    },
  },
  {
    label: "breakpoint key injects an @plugin at-rule into the spacing vars",
    path: "breakpoints.0",
    options: { breakpoints: ['md,x){}@plugin "x";'] },
  },
];

describe("generate() — CSS injection guard", () => {
  it.each(injectionCases)("rejects: $label", ({ theme, path }) => {
    expect(zodIssuePaths(() => generate(theme))).toContain(path);
  });

  it.each(injectionCases)(
    "generateThemeCss() rejects it too: $label",
    ({ theme, path }) => {
      expect(zodIssuePaths(() => generateThemeCss(theme))).toContain(path);
    },
  );

  it.each(optionInjectionCases)(
    "rejects option: $label",
    ({ options, path }) => {
      expect(
        zodIssuePaths(() => generate({ colors: { primary: "#fff" } }, options)),
      ).toContain(path);
    },
  );

  it.each(workspaceThemeFiles)(
    "%s: generate().css never emits an at-rule that loads an external resource",
    (file) => {
      const theme = ThemeSchema.parse(JSON.parse(readFileSync(file, "utf8")));
      const { css } = generate(theme);
      expect(css).not.toMatch(/@(plugin|config|import)\b/);
    },
  );
});
