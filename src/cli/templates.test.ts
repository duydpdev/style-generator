import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getBundlerSnippet, getCssImport } from "./templates";

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
