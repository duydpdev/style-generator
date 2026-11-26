import { z } from "zod";

import { toCamelCase, toKebabCase } from "../shared/helpers";

// Shared by `TokenKey` and the alias target so both accept the same key shape.
const TOKEN_KEY_SOURCE = "[A-Za-z0-9][A-Za-z0-9-]*";
export const TOKEN_KEY_RE = new RegExp(`^${TOKEN_KEY_SOURCE}$`);

/**
 * Key grammar of every theme record, axis and variant name: no character that
 * could be echoed unsafely into the CSS, and a class that survives the typed-token round trip.
 * Rationale: documents/architecture.md#tokenkey-why-underscores-and-leading-uppercase-runs-are-rejected
 */
export const TokenKey = z
  .string()
  .regex(
    TOKEN_KEY_RE,
    "Key must start with a letter/digit and contain only letters, digits, `-` (`_` is not allowed: use camelCase, e.g. `primaryActive`, or kebab-case, e.g. `primary-active`)",
  )
  .superRefine((key, ctx) => {
    if (!TOKEN_KEY_RE.test(key)) return;
    const registryClass = toKebabCase(key);
    const mapperClass = toKebabCase(toCamelCase(key));
    if (mapperClass !== registryClass) {
      ctx.addIssue({
        code: "custom",
        message: `Key "${key}" yields class "${registryClass}" in the CSS but "${mapperClass}" through the typed tokens; rename it to "${toCamelCase(registryClass)}" (a leading uppercase run is not round-trip safe)`,
      });
    }
  });

const quotesBalanced = (v: string): boolean => {
  const doubleQuotes = (v.match(/"/g) ?? []).length;
  const singleQuotes = (v.match(/'/g) ?? []).length;
  return doubleQuotes % 2 === 0 && singleQuotes % 2 === 0;
};

const BRACKET_OPENER: Readonly<Record<string, string>> = { ")": "(", "]": "[" };

// First unbalanced `(`/`[` outside quoted strings, or `undefined`.
const findUnbalancedBracket = (v: string): string | undefined => {
  const stack: string[] = [];
  let quote: string | undefined;
  for (const ch of v) {
    if (quote) {
      if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(" || ch === "[") {
      stack.push(ch);
    } else if (
      (ch === ")" || ch === "]") &&
      stack.pop() !== BRACKET_OPENER[ch]
    ) {
      return `unexpected \`${ch}\` without a matching opener`;
    }
  }
  const open = stack.at(-1);
  return open === undefined ? undefined : `unclosed \`${open}\``;
};

/**
 * Token value grammar: no CSS/HTML injection characters, balanced quotes and
 * balanced `(`/`[`. A `"$<key>"` alias is a valid value too.
 * Rationale: documents/architecture.md#tokenvalue-what-the-value-grammar-blocks-and-why-quotes-stay-legal
 */
export const TokenValue = z
  .string()
  .refine(
    (v) => !/[;{}<@\\\n\r]|\/\*/.test(v) && quotesBalanced(v),
    "Value must not contain `;`, `{`, `}`, `<`, `@`, `\\`, `/*`, or a line break, and quotes must be balanced",
  )
  .superRefine((v, ctx) => {
    const problem = findUnbalancedBracket(v);
    if (problem) {
      ctx.addIssue({
        code: "custom",
        message: `Value has ${problem}: parentheses and brackets must be balanced`,
      });
    }
  });

// `$<key>`, optionally `/<n>` with n an integer percent 1–100.
const ALIAS_VALUE_RE = new RegExp(
  `^\\$(${TOKEN_KEY_SOURCE})(?:/(100|[1-9]\\d?))?$`,
);

/** A parsed alias value: the target key and the optional percent. */
export interface AliasRef {
  key: string;
  alpha?: number;
}

/**
 * Split an alias value into its target key and optional percent.
 * @param {string} value - A category value, e.g. `"$blue500/8"`
 * @returns {AliasRef | undefined} `{ key: "blue500", alpha: 8 }`, or `undefined` when `value` is not a well-formed alias
 */
export const parseAliasRef = (value: string): AliasRef | undefined => {
  const match = ALIAS_VALUE_RE.exec(value);
  if (match?.[1] === undefined) return undefined;
  return match[2] === undefined
    ? { key: match[1] }
    : { key: match[1], alpha: Number(match[2]) };
};

/**
 * The key an alias value points at (the `/<n>` percent is dropped).
 * @param {string} value - A category value, e.g. `"$blue500"`
 * @returns {string | undefined} `"blue500"`, or `undefined` when `value` is not a well-formed alias
 */
export const parseAlias = (value: string): string | undefined =>
  parseAliasRef(value)?.key;

/** `TokenValue` without a leading `$`: typography emits literal values, so an alias would leak unresolved. */
export const TypographyValue = TokenValue.refine(
  (v) => !v.startsWith("$"),
  "aliases are not supported in typography",
);

/** A non-negative CSS number without a sign or exponent (`150`, `0.2`, `.5`). */
const CSS_NUMBER_SOURCE = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const SIGNED_NUMBER_RE = new RegExp(`^-?${CSS_NUMBER_SOURCE}$`);
const TIME_RE = new RegExp(`^${CSS_NUMBER_SOURCE}(?:ms|s)$`);
const LENGTH_RE = new RegExp(`^${CSS_NUMBER_SOURCE}(?:px|rem)$`);

/** `motionDuration` value: one CSS time in `ms` or `s` (`150ms`, `0.2s`). */
export const DurationValue = z
  .string()
  .regex(TIME_RE, "Duration must be one time in ms or s (e.g. 150ms, 0.2s)");

/** `controlHeight` / `iconSize` value: one length in `px` or `rem`. */
export const SizeValue = z
  .string()
  .regex(LENGTH_RE, "Size must be one length in px or rem (e.g. 40px, 2.5rem)");

const EASING_KEYWORDS = new Set([
  "linear",
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "step-start",
  "step-end",
]);
const STEP_POSITIONS = new Set([
  "jump-start",
  "jump-end",
  "jump-none",
  "jump-both",
  "start",
  "end",
]);

// CSS Easing requires at least 2 steps with `jump-none`.
const isEasing = (value: string): boolean => {
  if (EASING_KEYWORDS.has(value)) return true;
  const call = /^(cubic-bezier|steps)\(([^()]*)\)$/.exec(value);
  if (!call) return false;
  const args = (call[2] ?? "").split(",").map((arg) => arg.trim());
  if (call[1] === "steps") {
    const [count, position, ...rest] = args;
    return (
      rest.length === 0 &&
      /^[1-9]\d*$/.test(count ?? "") &&
      (position === undefined || STEP_POSITIONS.has(position)) &&
      !(position === "jump-none" && count === "1")
    );
  }
  if (args.length !== 4 || !args.every((arg) => SIGNED_NUMBER_RE.test(arg))) {
    return false;
  }
  const [x1, , x2] = args.map(Number);
  return [x1, x2].every((x) => x !== undefined && x >= 0 && x <= 1);
};

/** `motionEasing` value: a keyword, `cubic-bezier(…)` or `steps(…)`. */
export const EasingValue = z
  .string()
  .refine(
    isEasing,
    "Easing must be linear, ease, ease-in, ease-out, ease-in-out, step-start, step-end, cubic-bezier(x1, y1, x2, y2) with x1 and x2 in 0–1, or steps(n[, position])",
  );

/** `opacity` value: a JSON number from 0 to 1. */
export const OpacityValue = z.number().min(0).max(1);

/** `zIndex` value: a JSON integer. */
export const ZIndexValue = z.number().int();
