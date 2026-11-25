import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  getBundlerSnippet,
  getCssImport,
  themeTemplate,
  themeTemplateDark,
} from "./templates";

/**
 * The bodies of the `ts` code fences in a repository doc.
 * @param {string} repoPath - Repo-relative path of the doc
 * @returns {string[]} The block bodies in document order
 */
const tsBlocks = (repoPath: string): string[] =>
  [
    ...readFileSync(
      new URL(`../../${repoPath}`, import.meta.url),
      "utf8",
    ).matchAll(/^```ts\n([\s\S]*?)\n```$/gm),
  ].map((match) => match[1] ?? "");

describe("getBundlerSnippet matches the documented quickstarts", () => {
  it.each([
    ["README.md", { stack: "vite", configFile: "vite.config.ts" }],
    [
      "documents/reference/cli.md",
      { stack: "next", configFile: "next.config.ts" },
    ],
    [
      "documents/reference/cli.md",
      { stack: "nuxt", configFile: "nuxt.config.ts" },
    ],
  ] as const)("%s shows the %o snippet byte for byte", (doc, detected) => {
    const snippet = getBundlerSnippet(detected);
    expect(tsBlocks(doc)).toContain(snippet);
  });
});

describe("getCssImport", () => {
  const cwd = "/project";

  it("prints the Tailwind and theme imports without an exclude", () => {
    expect(getCssImport(cwd, "src/index.css", "src/styles/theme.css")).toBe(
      '@import "tailwindcss";\n@import "./styles/theme.css";',
    );
  });

  it.each([
    ["app/globals.css", "app/theme.css", "../.claude"],
    ["src/app/globals.css", "src/styles/theme.css", "../../.claude"],
    ["app/assets/css/main.css", "app/assets/css/theme.css", "../../../.claude"],
  ])("excludes .claude relative to %s", (entry, output, excluded) => {
    expect(getCssImport(cwd, entry, output, ".claude").split("\n")[2]).toBe(
      `@source not "${excluded}";`,
    );
  });
});

describe("starter colour pairs", () => {
  interface Starter {
    colors: Record<string, string>;
    themeAxes?: { theme: { dark: { colors: Record<string, string> } } };
  }
  /**
   * WCAG relative luminance of a `#RRGGBB` colour.
   * @param {string} hex - The colour
   * @returns {number} 0 (black) to 1 (white)
   */
  const luminance = (hex: string): number => {
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  /**
   * @param {Record<string, string>} colors - Colours with `$` aliases
   * @param {string} key - A key to resolve
   * @returns {string} Its literal
   */
  const literal = (colors: Record<string, string>, key: string): string => {
    const value = colors[key] ?? "";
    return value.startsWith("$") ? literal(colors, value.slice(1)) : value;
  };
  const dark = JSON.parse(themeTemplateDark) as Starter;
  const variants = [
    ["light", (JSON.parse(themeTemplate) as Starter).colors],
    ["dark", { ...dark.colors, ...dark.themeAxes?.theme.dark.colors }],
  ] as const;

  it.each(
    variants.flatMap(([name, colors]) =>
      ["muted", "primary"].map((fill) => [name, fill, colors] as const),
    ),
  )("%s: the %s pair reaches 4.5:1", (_name, fill, colors) => {
    const [a, b] = [fill, `${fill}Foreground`].map((k) =>
      luminance(literal(colors, k)),
    );
    const ratio =
      (Math.max(a ?? 0, b ?? 0) + 0.05) / (Math.min(a ?? 0, b ?? 0) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
