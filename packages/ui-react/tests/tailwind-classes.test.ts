import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generate } from "@duydpdev/style-generator";
import * as ds from "design-system-example";
import * as f from "design-system-example/recipes";
import { describe, expect, it } from "vitest";

import { compileScannedCss } from "../../../src/__integration__/compileFixtureCss";
import { options as siteOptions } from "../../../site/src/style-gen.options";
import siteTheme from "../../../site/src/theme/theme.json";
import { presets as sitePresets } from "../../../site/src/ui-presets";
import { tokens as siteTokens } from "../../../site/src/ui-tokens";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_SRC = resolve(PKG, "../../site/src");

interface Roles {
  readonly box?: f.BoxPreset | undefined;
  readonly text?: f.TextPreset | undefined;
  readonly code?: f.CodePreset | undefined;
  readonly button?: f.ButtonPreset | undefined;
  readonly badge?: f.BadgePreset | undefined;
  readonly card?: f.CardPreset | undefined;
  readonly input?: f.InputPreset | undefined;
  readonly select?: f.SelectPreset | undefined;
  readonly dialog?: f.DialogPreset | undefined;
}

const flatten = (value: unknown): string[] => {
  if (typeof value === "string")
    return value.split(/\s+/).filter((c) => c !== "");
  if (Array.isArray(value)) return value.flatMap(flatten);
  return [];
};
const classesOf = (t: f.RecipeTables): string[] => [
  ...flatten(t.base),
  ...Object.values(t.variants).flatMap((options) =>
    Object.values(options).flatMap(flatten),
  ),
  ...(t.compoundVariants ?? []).flatMap((c) => [
    ...flatten(c.class),
    ...flatten(c.className),
  ]),
];

/** Every class `createUi(tokens, roles)` can emit: layout tables always, control tables per role. */
const expectedClasses = (tokens: f.RecipeTokens, roles: Roles): string[] => {
  const tables: f.RecipeTables[] = [
    f.boxTables(tokens, roles.box),
    f.boxTables(tokens),
    f.textTables(tokens, roles.text),
    f.stackTables(),
    f.gridTables(),
    f.containerTables(),
    f.linkTables(tokens),
    f.listTables(),
    f.codeTables(tokens, roles.code),
  ];
  if (roles.button) tables.push(f.buttonTables(tokens, roles.button));
  if (roles.badge) tables.push(f.badgeTables(tokens, roles.badge));
  if (roles.card) tables.push(f.cardTables(tokens, roles.card));
  if (roles.input) tables.push(f.inputTables(tokens, roles.input));
  if (roles.select) tables.push(f.selectTables(tokens, roles.select));
  if (roles.dialog)
    tables.push(
      f.dialogTables(tokens, roles.dialog),
      f.dialogOverlayTables(tokens, roles.dialog),
    );
  const grid: Readonly<Record<string, string>> = f.GRID_COLUMN_CLASSES;
  const cols = ["base", ...tokens.breakpoints].flatMap((bp) => grid[bp] ?? []);
  return [...new Set([...tables.flatMap(classesOf), ...cols])].sort((a, b) =>
    a.localeCompare(b),
  );
};

/** Undo Tailwind's selector escaping (`\:` → `:`, leading digit `\32 xl` → `2xl`). */
const unescape = (css: string): string =>
  css.replace(/\\3(\d) /g, "$1").replaceAll("\\", "");
const escapeRe = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const missing = (css: string, expected: readonly string[]): string[] => {
  const flat = unescape(css);
  return expected.filter(
    (c) => !new RegExp(`\\.${escapeRe(c)}(?=[\\s{:,>.)\\[]|$)`, "m").test(flat),
  );
};

const DS_EXPECTED = expectedClasses(ds.tokens, ds.presets);
const DS_CSS = generate(ds.theme, ds.options).css;
/**
 * ui-react's own test files quote class strings (`hover:opacity-90`), so a plain
 * `@source "./src"` would let them stand in for the recipes. Leave them out.
 */
const UI_SRC = '@source "./src";\n@source not "./src/**/*.test*.tsx";';

describe("Tailwind keeps every class a recipe can emit", () => {
  it("design-system theme, ui-react + design-system @source", async () => {
    const { css } = await compileScannedCss(
      `${DS_CSS}\n${UI_SRC}\n@source "../../examples/design-system/src";`,
      PKG,
    );
    expect(missing(css, DS_EXPECTED)).toEqual([]);
  }, 60_000);

  it("negative control: without the design-system @source, literal recipe classes are missing", async () => {
    const { css } = await compileScannedCss(`${DS_CSS}\n${UI_SRC}`, PKG);
    expect(missing(css, DS_EXPECTED)).toContain("hover:opacity-90");
  }, 60_000);

  it("site theme + site presets + the site's own @source lines", async () => {
    const siteSources = readFileSync(resolve(SITE_SRC, "index.css"), "utf8")
      .split("\n")
      .filter((line) => line.startsWith("@source "));
    expect(siteSources.some((line) => line.includes("recipes/factories"))).toBe(
      true,
    );
    // `@source "./"` stands in for Vite's automatic detection of the site's own files.
    const input = [
      generate(siteTheme, siteOptions).css,
      '@source "./";',
      ...siteSources,
      '@source not "../../packages/ui-react/src/**/*.test*.tsx";',
    ].join("\n");
    const { css } = await compileScannedCss(input, SITE_SRC);
    expect(missing(css, expectedClasses(siteTokens, sitePresets))).toEqual([]);
  }, 60_000);
});
