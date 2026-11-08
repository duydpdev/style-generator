import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { getBundlerSnippet } from "./templates";

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
    const snippet = getBundlerSnippet(detected, {
      theme: "app/assets/css/theme.json",
      outDir: "app/assets/css",
    });
    expect(tsBlocks(doc)).toContain(snippet);
  });
});
