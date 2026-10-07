import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ThemeConfig } from "../../core/themeSchema";

import { findLegacyColorVarRefs } from "./legacyColorVars";

const theme: ThemeConfig = {
  colors: { primary: "#000", blue500: "#00f", textMuted: "#888" },
};

describe("findLegacyColorVarRefs", () => {
  let tmp: string;

  const write = (rel: string, content: string): void => {
    const abs = path.join(tmp, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  };
  const scan = (t: ThemeConfig = theme, output = "styles/theme.css") =>
    findLegacyColorVarRefs(tmp, t, { output });

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-legacy-"));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("flags a var() reference and a bare declaration with their file:line", () => {
    write(
      "src/a.css",
      [
        ".a {",
        "  color: var(--sg-primary);",
        "}",
        'html[data-palette="x"] {',
        "  --sg-primary: #111;",
        "}",
      ].join("\n"),
    );

    expect(scan()).toEqual([
      "src/a.css:2: --sg-primary was renamed to --sg-color-primary in 5.0",
      "src/a.css:5: --sg-primary was renamed to --sg-color-primary in 5.0",
    ]);
  });

  it("matches kebab-cased keys (letter→digit boundary) and reports CRLF files by line", () => {
    write("src/b.css", ".x {\r\n  color: var(--sg-blue-500);\r\n}\r\n");

    expect(scan()).toEqual([
      "src/b.css:2: --sg-blue-500 was renamed to --sg-color-blue-500 in 5.0",
    ]);
  });

  it("flags references from every scanned source extension", () => {
    const ref = 'const v = "var(--sg-primary)";\n';
    const exts = ["ts", "tsx", "mts", "js", "jsx", "mjs", "cjs", "vue"];
    const all = [...exts, "scss", "less", "svelte", "astro", "html"];
    for (const ext of all) write(`src/f.${ext}`, ref);

    const flagged = scan().map((w) => w.slice(0, w.indexOf(":", 4)));
    const byName = (a: string, b: string): number => a.localeCompare(b);
    const expected = all.map((ext) => `src/f.${ext}`);
    expect([...flagged].sort(byName)).toEqual([...expected].sort(byName));
  });

  it("flags a color key that starts with another category's prefix", () => {
    // 4.x emitted `--sg-shadow-primary` for colors.shadowPrimary; 5.0 emits
    // `--sg-color-shadow-primary`, so the old reference points at nothing.
    write("src/a.css", ".a { color: var(--sg-shadow-primary); }\n");

    expect(scan({ colors: { shadowPrimary: "#000" } })).toEqual([
      "src/a.css:1: --sg-shadow-primary was renamed to --sg-color-shadow-primary in 5.0",
    ]);
  });

  it("says when the legacy name now belongs to another token", () => {
    // colors.colorPrimary was `--sg-color-primary` in 4.x; in 5.0 that name
    // is colors.primary, so the old reference silently shows the wrong color.
    write("src/a.css", ".a { color: var(--sg-color-primary); }\n");

    expect(scan({ colors: { colorPrimary: "#111", primary: "#222" } })).toEqual(
      [
        "src/a.css:1: --sg-color-primary was renamed to --sg-color-color-primary in 5.0; in 5.0 --sg-color-primary is colors.primary, a different token",
      ],
    );
  });

  it("does not flag already-migrated names, non-color keys or lookalike names", () => {
    write(
      "src/ok.css",
      [
        "a { color: var(--sg-color-primary); }",
        "a { box-shadow: var(--sg-shadow-primary); }",
        "a { padding: var(--sg-sp-p); }",
        "a { border-width: var(--sg-border-width-primary); }",
        "a { color: var(--sg-foo); }",
        "a { color: var(--sg-primary-hover); }",
        "a { color: var(--my--sg-primary); }",
        "a { color: var(--primary); }",
      ].join("\n"),
    );

    expect(scan()).toEqual([]);
  });

  it("skips dependency, VCS and build-output directories and unscanned extensions", () => {
    const ref = ".a { color: var(--sg-primary); }\n";
    const dirs = [
      "node_modules/pkg",
      "dist",
      "build",
      "out",
      "coverage",
      ".git",
      ".next",
      ".nuxt",
      ".output",
      ".svelte-kit",
      ".turbo",
      ".vercel",
      "storybook-static",
    ];
    for (const dir of dirs) write(`${dir}/x.css`, ref);
    write("notes.md", ref);
    write("data.json", ref);

    expect(scan()).toEqual([]);
  });

  it("skips the configured output file but not other files with the same name", () => {
    const ref = ".a { --sg-primary: #000; }\n";
    write("generated/out.css", ref);
    write("src/out.css", ref);

    expect(scan(theme, "generated/out.css")).toEqual([
      "src/out.css:1: --sg-primary was renamed to --sg-color-primary in 5.0",
    ]);
  });

  it("skips files over 1 MiB", () => {
    write(
      "src/big.css",
      `${" ".repeat(1024 * 1024)}\n.a { color: var(--sg-primary); }\n`,
    );

    expect(scan()).toEqual([]);
  });
});
