/**
 * `token-unused`: a theme token nothing reads. Reads are the classes of the
 * boards and the preset, `var(--sg-…)` references, aliases, the keys a preset
 * names (a recipe builds classes from them), the siblings a recipe reads for
 * every colour a preset names, and the design-system cover.
 */
import { builtInCategories } from "../../../features/registry/builtInCategories";
import { DS_COVER_KEYS } from "../../../shared/dsTokenNames";
import { toKebabCase } from "../../../shared/helpers";

import { splitClass } from "./boardInputs";
import type { ClassUse } from "./classCandidates";
import type { Reporter } from "./ruleReport";

/** Colour keys a recipe reads next to the colour a preset names. */
const RECIPE_SIBLINGS = [
  "Hover",
  "Active",
  "Subtle",
  "SubtleForeground",
  "Foreground",
];

/** What reads tokens besides the boards' own classes and variables. */
export interface TokenReads {
  uses: readonly ClassUse[];
  /** `--sg-…` names read by variables in boards and stylesheets. */
  vars: ReadonlySet<string>;
  /** Class-shaped words of the preset (`presetCandidates`). */
  presetWords: readonly string[];
  /** The preset's source, for its `var(--sg-…)` text. */
  presetSource: string | undefined;
}

type Tokens = Record<string, unknown>;

const tokensOf = (theme: Record<string, unknown>, key: string): string[] => {
  const value = theme[key];
  return typeof value === "object" && value !== null ? Object.keys(value) : [];
};

// `colors.primary` → the key an alias such as `$primary/50` points to.
const aliasTarget = (value: unknown): string | undefined =>
  typeof value === "string" && value.startsWith("$")
    ? value.slice(1).split("/")[0]
    : undefined;

// Every category and key a `$alias` points to, in the base and in every axis variant.
function aliasReads(theme: Record<string, unknown>, reads: Set<string>): void {
  const scan = (record: Tokens) => {
    for (const category of builtInCategories) {
      const tokens = record[category.key];
      if (typeof tokens !== "object" || tokens === null) continue;
      for (const value of Object.values(tokens)) {
        const target = aliasTarget(value);
        if (target !== undefined) reads.add(`${category.key}.${target}`);
      }
    }
  };
  scan(theme);
  const axes = theme.themeAxes;
  if (typeof axes !== "object" || axes === null) return;
  for (const variants of Object.values(axes as Tokens))
    for (const override of Object.values(variants as Tokens))
      scan(override as Tokens);
}

/** Where each way of naming a token leads: its class, variable and bare key. */
interface TokenIndex {
  all: string[];
  byClass: Map<string, string[]>;
  byVar: Map<string, string>;
  byKey: Map<string, string[]>;
}

function indexTokens(theme: Record<string, unknown>): TokenIndex {
  const index: TokenIndex = {
    all: [],
    byClass: new Map(),
    byVar: new Map(),
    byKey: new Map(),
  };
  const add = (map: Map<string, string[]>, name: string, token: string) => {
    map.set(name, [...(map.get(name) ?? []), token]);
  };
  for (const category of builtInCategories)
    for (const key of tokensOf(theme, category.key)) {
      const token = `${category.key}.${key}`;
      const kebab = toKebabCase(key);
      index.all.push(token);
      add(index.byKey, key, token);
      if ("cssVarPrefix" in category)
        index.byVar.set(`--${category.cssVarPrefix}-${kebab}`, token);
      for (const prefix of category.classPrefixes)
        add(index.byClass, prefix === "" ? kebab : `${prefix}-${kebab}`, token);
    }
  return index;
}

// `bg-primary/50` → `["bg-primary", "50"]`; a `/` inside `[…]` or `(…)` is not a modifier.
function splitModifier(utility: string): [string, string | undefined] {
  let depth = 0;
  for (let i = 0; i < utility.length; i++) {
    const char = utility[i];
    if (char === "[" || char === "(") depth++;
    else if (char === "]" || char === ")") depth--;
    else if (char === "/" && depth === 0)
      return [utility.slice(0, i), utility.slice(i + 1)];
  }
  return [utility, undefined];
}

// Every token something reads: its class, its variable, a preset word, the cover, an alias.
function readTokens(
  theme: Record<string, unknown>,
  input: TokenReads,
  index: TokenIndex,
): Set<string> {
  const reads = new Set<string>();
  const read = (tokens: readonly string[] | string | undefined) => {
    for (const token of typeof tokens === "string" ? [tokens] : (tokens ?? []))
      reads.add(token);
  };
  const readVars = (text: string) => {
    for (const m of text.matchAll(/--sg-[\w-]+/g)) read(index.byVar.get(m[0]));
  };
  for (const use of input.uses) {
    const { utility } = splitClass(use.candidate);
    const [bare, modifier] = splitModifier(utility);
    read(index.byClass.get(bare));
    if (modifier !== undefined)
      read(index.byKey.get(modifier)?.filter((t) => t.startsWith("opacity.")));
    readVars(use.candidate);
  }
  for (const name of input.vars) read(index.byVar.get(name));
  readVars(input.presetSource ?? "");
  for (const word of input.presetWords) {
    read(index.byKey.get(word));
    for (const sibling of RECIPE_SIBLINGS)
      read(index.byKey.get(word + sibling));
  }
  for (const key of DS_COVER_KEYS) read(`colors.${key}`);
  aliasReads(theme, reads);
  return reads;
}

/**
 * Reports a finding for every token nothing reads, except a `reserved` one.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {TokenReads} input - What reads tokens
 * @param {Record<string, unknown> | undefined} reserved - `reserved` of the standard, keyed `<category>.<key>`
 * @param {Reporter} reporter - Receives the findings
 * @param {string} path - Where the theme is, for the finding lines
 */
export function unusedTokens(
  theme: Record<string, unknown>,
  input: TokenReads,
  reserved: Record<string, unknown> | undefined,
  reporter: Reporter,
  path: string,
): void {
  const index = indexTokens(theme);
  const reads = readTokens(theme, input, index);
  for (const token of index.all) {
    if (reads.has(token) || reserved?.[token] !== undefined) continue;
    reporter.finding(
      path,
      `${token} is read by no board, preset or variable`,
      "token-unused",
      token,
    );
  }
}
