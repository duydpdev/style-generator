/**
 * Rules over one scanned file: variables, blob links, font declarations,
 * button intents and, with `--naming`, inline weights, hand-written values
 * and primitive colour variables.
 */
import { cssVarCategories } from "../../../features/registry/builtInCategories";
import { toKebabCase } from "../../../shared/helpers";

import type { HandValue, Located, Occurrence, ScannedFile } from "./scan";

/** Where a violation is. */
type Where = Pick<Located, "file" | "line">;

/** Custom properties that are not a second token namespace. */
const ALLOWED_VAR = /^--(?:sg-|tw-|layout-)|^--spacing$/;

/**
 * Theme category → the `--<prefix>-<key>` its tokens are emitted under:
 * every registry category with a CSS variable.
 */
const CATEGORY_PREFIXES = cssVarCategories.map(
  (descriptor) => [descriptor.key, descriptor.cssVarPrefix] as const,
);

/**
 * The `--sg-*` variable names a theme file produces (spacing aside).
 * @param {unknown} theme - Parsed theme JSON
 * @returns {Set<string>} Variable names, `--` included
 */
export function themeVariableNames(theme: unknown): Set<string> {
  const names = new Set<string>();
  if (typeof theme !== "object" || theme === null) return names;
  const record = theme as Record<string, unknown>;
  for (const [category, prefix] of CATEGORY_PREFIXES) {
    const tokens = record[category];
    if (typeof tokens !== "object" || tokens === null) continue;
    for (const key of Object.keys(tokens))
      names.add(`--${prefix}-${toKebabCase(key)}`);
  }
  return names;
}

export interface FileRules {
  known: Set<string>;
  intents: readonly string[] | undefined;
  naming: boolean;
  primitiveVars: Set<string>;
  primitiveBoards: readonly string[];
}

/**
 * What is wrong with one occurrence, if anything.
 * @param {Occurrence} o - A variable, `--bl-` text or blob reference
 * @param {Set<string>} known - `themeVariableNames(theme)`
 * @returns {string | null} The message, without its location
 */
function occurrenceViolation(o: Occurrence, known: Set<string>): string | null {
  switch (o.kind) {
    case "var":
      return ALLOWED_VAR.test(o.value)
        ? null
        : `second token namespace ${o.value}`;
    case "varText":
      return `parallel token text ${o.value}`;
    case "blobLink":
      return `unchecked stylesheet /_blob/${o.value}`;
    case "blobRef":
      return `unchecked blob link /_blob/${o.value}`;
    default:
      return o.value.startsWith("--sg-sp-") || known.has(o.value)
        ? null
        : `unknown token ${o.value}`;
  }
}

/**
 * Violations of one scanned file, each `<file>:<line> <message>`.
 * @param {ScannedFile} s - From `scanText`
 * @param {FileRules} rules - What to check
 * @returns {string[]} In check order
 */
export function fileViolations(s: ScannedFile, rules: FileRules): string[] {
  const { known, intents } = rules;
  const out: string[] = [];
  /**
   * @param {Where} where - Location
   * @param {string} message - What is wrong
   */
  const report = (where: Where, message: string) => {
    out.push(`${where.file}:${String(where.line)} ${message}`);
  };
  for (const o of s.occurrences) {
    const message = occurrenceViolation(o, known);
    if (message !== null) report(o, message);
  }
  for (const f of s.fontSizes.filter((x) => x.value !== "inherit"))
    report(f, `font-size ${f.value} (use a typography class)`);
  for (const f of s.fontShorthands.filter((x) => x.value !== "inherit"))
    report(f, "font shorthand (use a typography class)");
  if (rules.naming)
    for (const [where, message] of namingFileViolations(s, rules))
      report(where, message);
  for (const i of intents ? s.intents : [])
    if (!intents?.includes(i.value)) report(i, `unknown intent ${i.value}`);
  return out;
}

/**
 * The `--naming` rules of one scanned file: inline `font-weight`, hand-written
 * `border-radius`/`line-height`/`font-family`, and a primitive colour variable
 * outside the manifest's `primitiveBoards`.
 * @param {ScannedFile} s - From `scanText`
 * @param {FileRules} rules - Primitive variables and the boards allowed to read them
 * @returns {[Where, string][]} Location and message pairs
 */
function namingFileViolations(
  s: ScannedFile,
  rules: FileRules,
): [Where, string][] {
  const out: [Where, string][] = s.fontWeights
    .filter((x) => x.value !== "inherit")
    .map((f) => [f, `font-weight ${f.value} (use a typography class)`]);
  for (const h of s.handValues) {
    const message = handValueMessage(h);
    if (message !== null) out.push([h, message]);
  }
  if (rules.primitiveBoards.includes(s.file)) return out;
  for (const o of s.occurrences)
    if (o.kind === "sgVar" && rules.primitiveVars.has(o.value))
      out.push([o, `primitive token ${o.value} (use a semantic key)`]);
  return out;
}

/** Values a hand-written declaration may hold, by property. */
const HAND_VALUE_RULES = [
  [
    /-radius$/,
    /^(?:0|inherit|var\(--sg-radius-[a-z0-9-]+\))$/,
    "(use var(--sg-radius-*) or a rounded-* class)",
  ],
  [/^line-height$/, /^inherit$/, "(use a typography class)"],
  [
    /^font-family$/,
    /^(?:inherit|var\(--sg-font-[a-z0-9-]+\))$/,
    "(use a font-* class)",
  ],
] as const;

/**
 * @param {HandValue} h - A hand-written declaration
 * @returns {string | null} The message, or null when the value is allowed
 */
function handValueMessage(h: HandValue): string | null {
  const rule = HAND_VALUE_RULES.find(([property]) => property.test(h.property));
  if (!rule || rule[1].test(h.value)) return null;
  return `${h.property} ${h.value} ${rule[2]}`;
}
