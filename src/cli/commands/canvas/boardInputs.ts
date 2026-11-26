/**
 * What the board rules read besides the boards: the product's generator
 * options, the CSS its theme compiles to, and how a class candidate splits
 * into variants and a utility.
 */
import { basename } from "node:path";

import { z } from "zod";

import { generateFromParsed } from "../../../core/generateFromParsed";
import type { StyleGeneratorOptions } from "../../../core/Options";
import { prepareGenerate } from "../../../core/prepareGenerate";
import { formatZodError, type ThemeConfig } from "../../../core/themeSchema";
import {
  builtInCategories,
  type BuiltInCategory,
} from "../../../features/registry/builtInCategories";
import {
  StyleGenConfigFileSchema,
  resolveConfig,
  toGeneratorOptions,
} from "../../../node/loadStyleGenConfig";

import { CanvasInputError, readJson } from "./scan";

/**
 * The `generate()` options a `style-gen.config.json` holds, or a `package.json`'s `style-gen` key.
 * @param {string} file - Path to the config file
 * @param {string} label - The path as the user wrote it, for messages
 * @returns {StyleGeneratorOptions} Options without the config-only keys
 * @throws {CanvasInputError} When the file is unreadable or violates the config schema
 */
export function loadGeneratorOptions(
  file: string,
  label: string,
): StyleGeneratorOptions {
  const raw = readJson(file, label);
  const source =
    basename(file) === "package.json"
      ? ((raw as Record<string, unknown> | null)?.["style-gen"] ?? {})
      : raw;
  const parsed = StyleGenConfigFileSchema.safeParse(source);
  if (!parsed.success)
    throw new CanvasInputError(
      `${label}: invalid config (${formatZodError(parsed.error)})`,
    );
  const config: Record<string, unknown> = { ...parsed.data };
  delete config.$schema;
  return toGeneratorOptions(resolveConfig({}, { config }));
}

/** A category whose tokens the theme defines and that feeds Tailwind utilities. */
export type Family = Extract<BuiltInCategory, { themeNamespace: string }>;

const isFamily = (category: BuiltInCategory): category is Family =>
  "themeNamespace" in category;

/**
 * The categories the theme defines with at least one token.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @returns {Family[]} In registry order
 */
export const themeFamilies = (theme: Record<string, unknown>): Family[] =>
  builtInCategories.filter(isFamily).filter((category) => {
    const tokens = theme[category.key];
    return (
      typeof tokens === "object" &&
      tokens !== null &&
      Object.keys(tokens).length > 0
    );
  });

// `--font-*` also holds Tailwind's font weights, so only its three families reset.
const RESETS: Record<string, readonly string[]> = {
  "--font-": ["--font-sans", "--font-serif", "--font-mono"],
};

/**
 * `@theme` block emptying Tailwind's own values in every namespace the theme defines.
 * @param {readonly Family[]} families - From {@link themeFamilies}
 * @returns {string} CSS, empty when nothing resets
 */
export function resetCss(families: readonly Family[]): string {
  const lines = families.flatMap(({ themeNamespace }) =>
    (RESETS[themeNamespace] ?? [`${themeNamespace}*`]).map(
      (name) => `  ${name}: initial;`,
    ),
  );
  return lines.length === 0 ? "" : `@theme {\n${lines.join("\n")}\n}\n`;
}

/**
 * The CSS the theme compiles to, plus the resets, minus `@source inline` lines
 * (they only widen what is generated, they never decide whether a class exists).
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {StyleGeneratorOptions} options - The product's generator options
 * @returns {string} Input for the rule compiler
 * @throws {CanvasInputError} When the theme or options do not generate
 */
export function ruleCss(
  theme: Record<string, unknown>,
  options: StyleGeneratorOptions,
): string {
  let css: string;
  try {
    const { parsed, resolved } = prepareGenerate(theme as ThemeConfig, options);
    css = generateFromParsed(parsed, resolved);
  } catch (error) {
    throw new CanvasInputError(
      `theme cannot be generated for the class check (${
        error instanceof z.ZodError
          ? formatZodError(error)
          : (error as Error).message
      })`,
    );
  }
  const kept = css.split("\n").filter((line) => !line.startsWith("@source "));
  return resetCss(themeFamilies(theme)) + kept.join("\n");
}

/** A class candidate taken apart. */
export interface SplitClass {
  variants: string[];
  /** The utility without `!` or a leading `-`. */
  utility: string;
}

/**
 * Splits `disabled:hover:-mt-1!` into its variants and utility.
 * @param {string} candidate - One class as written
 * @returns {SplitClass} Variants in order and the bare utility
 */
export function splitClass(candidate: string): SplitClass {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) {
      parts.push(candidate.slice(start, i));
      start = i + 1;
    }
  }
  const utility = candidate
    .slice(start)
    .replace(/^!/, "")
    .replace(/!$/, "")
    .replace(/^-/, "");
  return { variants: parts, utility };
}

/** A family a utility belongs to and what follows its prefix. */
export interface FamilyClass {
  family: Family;
  /** `""` for the bare prefix (`rounded`), else the part after `<prefix>-`. */
  value: string;
}

/**
 * The families whose class prefix starts a utility. The longest prefix wins
 * (`border-x` over `border`); families sharing it all match (`border-2` is a
 * colour or a width until its value says which).
 * @param {string} utility - From {@link splitClass}
 * @param {readonly Family[]} families - The families to test
 * @returns {FamilyClass[]} Empty for a utility outside every family
 */
export function familiesOfUtility(
  utility: string,
  families: readonly Family[],
): FamilyClass[] {
  const matches = families.flatMap((family) =>
    family.classPrefixes
      .filter(
        (prefix) => utility === prefix || utility.startsWith(`${prefix}-`),
      )
      .map((prefix) => ({ family, prefix })),
  );
  const longest = Math.max(0, ...matches.map(({ prefix }) => prefix.length));
  return matches
    .filter(({ prefix }) => prefix.length === longest)
    .map(({ family, prefix }) => ({
      family,
      value: utility.slice(prefix.length + 1),
    }));
}
