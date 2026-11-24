import { z } from "zod";

import { toCamelCase, toKebabCase } from "../shared/helpers";

/**
 * Bare regex source (no anchors) for a single theme record key: must start
 * with an alphanumeric character, then any run of alphanumerics and `-`.
 * `_` is rejected on purpose: `toKebabCase` preserves it (`bg-primary_active`)
 * while the typed tokens camelCase it away (`primaryActive`), so the class a
 * mapper emits would not exist. Relaxing this later is non-breaking.
 * Shared between {@link TokenKey} (key grammar) and {@link ALIAS_VALUE_RE}
 * (alias sigil target grammar) so both accept exactly the same key shape.
 */
const TOKEN_KEY_SOURCE = "[A-Za-z0-9][A-Za-z0-9-]*";
export const TOKEN_KEY_RE = new RegExp(`^${TOKEN_KEY_SOURCE}$`);

/**
 * Key grammar shared by every theme record (colors, typography, shadows,
 * backdrop blurs, border radius, border width, font family, theme override
 * names, theme axis and variant names): must start with an alphanumeric
 * character, then any run of alphanumerics and `-`. Rejects accidental typos like `"colours"` only
 * via `strictObject` unknown key checks — this regex instead guards
 * against structurally unsafe keys (spaces, leading dashes, semicolons,
 * ...) that could otherwise be echoed into `generate().css` as a CSS
 * custom-property name or selector.
 *
 * A key must also keep its class through the typed tokens: the registry
 * emits `toKebabCase(key)` while `createDesignTokens` exposes
 * `toCamelCase(key)`, which `createVariantMapper` kebab-cases again. A
 * leading uppercase run breaks that round trip (`CTA` → `bg-cta`, but token
 * `cTA` → `bg-c-ta`), so such keys are rejected with the rename that keeps
 * the registry class.
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

/**
 * A `"` and `'` are only safe when balanced — an odd count means the value
 * can break out of a quoted CSS/HTML attribute context.
 * @param {string} v - Candidate token value
 * @returns {boolean} `true` when both quote characters appear an even number of times
 */
const quotesBalanced = (v: string): boolean => {
  const doubleQuotes = (v.match(/"/g) ?? []).length;
  const singleQuotes = (v.match(/'/g) ?? []).length;
  return doubleQuotes % 2 === 0 && singleQuotes % 2 === 0;
};

const BRACKET_OPENER: Readonly<Record<string, string>> = { ")": "(", "]": "[" };

/**
 * Find the first unbalanced `(`/`[` in a value, ignoring brackets inside a
 * quoted string (`"Brand (Display", serif` is balanced). An unbalanced
 * bracket otherwise reaches Tailwind as an unclosed block and fails far from
 * the theme key (`Missing closing } at :root`). Unbalanced quotes are left to
 * {@link quotesBalanced}.
 * @param {string} v - Candidate token value
 * @returns {string | undefined} The first problem found, or `undefined` when balanced
 */
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
 * Token value grammar: rejects characters that could inject a new CSS rule,
 * an HTML tag, an at-rule, a comment, or a line break into `generate().css`
 * (`;`, `{`, `}`, `<`, `@`, `\`, `/ *`, `\n`, `\r`), rejects unbalanced
 * quotes, and rejects unbalanced `(`/`[` outside quoted strings
 * ({@link findUnbalancedBracket}). Balanced quotes stay valid because
 * `fontFamily` legitimately needs them (e.g. `"Plus Jakarta Sans",
 * system-ui`). A value of the form `"$<TokenKey>"` (see
 * {@link ALIAS_VALUE_RE}) is a valid `TokenValue` too — it is resolved into
 * `var(--<cssVarPrefix>-<key>)` by `flattenByCategory` once `ThemeSchema`'s
 * alias refinement has proven the reference exists and is acyclic.
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

/**
 * Alias sigil grammar: a `"$"` followed by exactly one valid {@link TokenKey}.
 * A category value matching this pattern is resolved to
 * `var(--<cssVarPrefix>-<kebab-target>)` instead of being emitted literally
 * — see `flattenByCategory.ts`.
 */
const ALIAS_VALUE_RE = new RegExp(`^\\$(${TOKEN_KEY_SOURCE})$`);

/**
 * The key an alias value points at.
 * @param {string} value - A category value, e.g. `"$blue500"`
 * @returns {string | undefined} `"blue500"`, or `undefined` when `value` is not a well-formed alias
 */
export const parseAlias = (value: string): string | undefined =>
  ALIAS_VALUE_RE.exec(value)?.[1];

/**
 * `TokenValue`, further restricted to reject a leading `$` — the alias
 * sigil (`$<TokenKey>`, see {@link ALIAS_VALUE_RE}) is only resolved by
 * `flattenByCategory.ts` for the CSS-var categories (`cssVarCategories`);
 * `typography` has no CSS variable
 * representation of its own (`generateTypographyCss.ts` emits literal
 * property values), so a `$`-prefixed value would leak into the compiled
 * CSS unresolved (e.g. a literal `font-size: $primary;`).
 */
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

/**
 * Whether `value` is one CSS easing function: a keyword,
 * `cubic-bezier(x1, y1, x2, y2)` (x1 and x2 in 0–1) or
 * `steps(n[, position])` (n a positive integer).
 * @param {string} value - Candidate easing
 * @returns {boolean} `true` for a valid easing function
 */
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
      (position === undefined || STEP_POSITIONS.has(position))
    );
  }
  if (args.length !== 4 || !args.every((arg) => SIGNED_NUMBER_RE.test(arg))) {
    return false;
  }
  const [x1, , x2] = args.map(Number);
  return [x1, x2].every((x) => x !== undefined && x >= 0 && x <= 1);
};

/**
 * `motionEasing` value: `linear`, `ease`, `ease-in`, `ease-out`,
 * `ease-in-out`, `step-start`, `step-end`, `cubic-bezier(x1, y1, x2, y2)` or
 * `steps(n[, position])`.
 */
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
