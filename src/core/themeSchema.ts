import { z } from "zod";

import { UTILITY_NAME_RE, toKebabCase } from "../shared/helpers";

/**
 * Key grammar shared by every theme record (colors, typography, shadows,
 * backdrop blurs, border radius, border, theme override names): must start
 * with an alphanumeric character, then any run of alphanumerics, `_`, `-`.
 * Rejects accidental typos like `"colours"` only via `strictObject` unknown
 * key checks — this regex instead guards against structurally unsafe keys
 * (spaces, leading dashes, semicolons, ...) that could otherwise be echoed
 * into `generate().css` as a CSS custom-property name or selector.
 */
export const TokenKey = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
    "Key must start with a letter/digit and contain only letters, digits, `_`, `-`",
  );

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

/**
 * Token value grammar: rejects characters that could inject a new CSS rule,
 * an HTML tag, an at-rule, a comment, or a line break into `generate().css`
 * (`;`, `{`, `}`, `<`, `@`, `\`, `/ *`, `\n`, `\r`), and rejects unbalanced
 * quotes. Balanced quotes stay valid because `fontFamily` legitimately needs
 * them (e.g. `"Plus Jakarta Sans", system-ui`).
 */
export const TokenValue = z
  .string()
  .refine(
    (v) => !/[;{}<@\\\n\r]|\/\*/.test(v) && quotesBalanced(v),
    "Value must not contain `;`, `{`, `}`, `<`, `@`, `\\`, `/*`, or a line break, and quotes must be balanced",
  );

/**
 * A single typography variant. `fontFamily`/`fontStyle` are optional because
 * most variants inherit the base font stack and style; when present they
 * follow the same injection-safe `TokenValue` grammar as every other value.
 */
export const TypographyStyleSchema = z.strictObject({
  fontSize: TokenValue,
  lineHeight: TokenValue,
  fontWeight: z.number(),
  letterSpacing: TokenValue,
  fontFamily: TokenValue.optional(),
  fontStyle: TokenValue.optional(),
});

/**
 * `theme.typography` keys become Tailwind v4 `@utility` names via
 * `toKebabCase` (see `generateTypographyCss.ts`) — a key whose kebab-case
 * form doesn't match `UTILITY_NAME_RE` (e.g. starts with a digit or a dash)
 * would otherwise only fail at CSS-generation time. Rejecting it here, at
 * parse time, surfaces a `ZodError` with the offending key in its `path`.
 */
const TypographyRecordSchema = z
  .record(TokenKey, TypographyStyleSchema)
  .superRefine((typography, ctx) => {
    for (const key of Object.keys(typography)) {
      const utilityName = toKebabCase(key);
      if (UTILITY_NAME_RE.test(utilityName)) continue;

      ctx.addIssue({
        code: "custom",
        path: [key],
        message:
          `Typography key "${key}" kebab-cases to "@utility ${utilityName}", ` +
          `which is not a valid Tailwind v4 @utility name (must match ` +
          `${UTILITY_NAME_RE.source}) — rename the key so its kebab-case ` +
          "form doesn't start with a digit or a dash.",
      });
    }
  });

/**
 * Theme override configuration. Contains partial overrides for colors,
 * shadows, backdrop blurs, and border radius — everything but `border` and
 * `typography`, matching `generateThemeCss.ts`'s `buildIntermediateVars`.
 */
export const ThemeOverrideSchema = z.strictObject({
  colors: z.record(TokenKey, TokenValue).optional(),
  shadows: z.record(TokenKey, TokenValue).optional(),
  backDropBlurs: z.record(TokenKey, TokenValue).optional(),
  borderRadius: z.record(TokenKey, TokenValue).optional(),
});

/**
 * Theme configuration — the single source of truth for both JSON and
 * TypeScript theme authoring. `z.strictObject` at every level rejects
 * unknown/typo'd keys (e.g. `colours`, or a stray metadata field) instead
 * of silently stripping them; `.parse()` is the only entry point that
 * produces a value consumers should trust.
 */
export const ThemeSchema = z.strictObject({
  $schema: z.string().optional(),
  colors: z.record(TokenKey, TokenValue),
  typography: TypographyRecordSchema.optional(),
  shadows: z.record(TokenKey, TokenValue).optional(),
  backDropBlurs: z.record(TokenKey, TokenValue).optional(),
  borderRadius: z.record(TokenKey, TokenValue).optional(),
  border: z.record(TokenKey, TokenValue).optional(),
  themes: z.record(TokenKey, ThemeOverrideSchema).optional(),
});

/**
 * Configuration for the theme, inferred from {@link ThemeSchema}.
 * Only `colors` is required; every other field is optional and the library
 * handles `undefined` gracefully.
 */
export type ThemeConfig = z.infer<typeof ThemeSchema>;

/**
 * Theme override configuration, inferred from {@link ThemeOverrideSchema}.
 */
export type ThemeOverride = z.infer<typeof ThemeOverrideSchema>;

/**
 * Configuration for a single typography variant, inferred from
 * {@link TypographyStyleSchema}.
 */
export type TypographyConfig = z.infer<typeof TypographyStyleSchema>;

/**
 * Format every issue in a `ZodError` as one `"path → message"` line, safe to
 * print in a terminal (CLI `doctor`) or surface via a bundler plugin error
 * (`this.error`). `unrecognized_keys` issues carry the offending key names
 * in `issue.keys` rather than `issue.path` — expand each into its own line
 * so a typo like `colours` is named explicitly instead of reporting the
 * unhelpful `(root)`.
 * @param {z.ZodError} error - The Zod validation error to format
 * @returns {string} One formatted line per issue, joined by newlines
 */
export const formatZodError = (error: z.ZodError): string =>
  error.issues
    .flatMap((issue) =>
      issue.code === "unrecognized_keys"
        ? issue.keys.map(
            (key) => `${[...issue.path, key].join(".")} → ${issue.message}`,
          )
        : [
            `${issue.path.length > 0 ? issue.path.join(".") : "(root)"} → ${issue.message}`,
          ],
    )
    .join("\n");
