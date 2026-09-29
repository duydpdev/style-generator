import { z } from "zod";

import { UTILITY_NAME_RE, toKebabCase } from "../shared/helpers";

/**
 * Bare regex source (no anchors) for a single theme record key: must start
 * with an alphanumeric character, then any run of alphanumerics, `_`, `-`.
 * Shared between {@link TokenKey} (key grammar) and {@link ALIAS_VALUE_RE}
 * (alias sigil target grammar) so both accept exactly the same key shape.
 */
const TOKEN_KEY_SOURCE = "[A-Za-z0-9][A-Za-z0-9_-]*";

/**
 * Key grammar shared by every theme record (colors, typography, shadows,
 * backdrop blurs, border radius, border width, font family, theme override
 * names): must start with an alphanumeric character, then any run of
 * alphanumerics, `_`, `-`. Rejects accidental typos like `"colours"` only
 * via `strictObject` unknown key checks — this regex instead guards
 * against structurally unsafe keys (spaces, leading dashes, semicolons,
 * ...) that could otherwise be echoed into `generate().css` as a CSS
 * custom-property name or selector.
 */
export const TokenKey = z
  .string()
  .regex(
    new RegExp(`^${TOKEN_KEY_SOURCE}$`),
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
 * them (e.g. `"Plus Jakarta Sans", system-ui`). A value of the form
 * `"$<TokenKey>"` (see {@link ALIAS_VALUE_RE}) is a valid `TokenValue` too —
 * it is resolved into `var(--<cssVarPrefix>-<key>)` by `flattenByCategory`
 * once `ThemeSchema`'s alias refinement below has proven the reference
 * exists and is acyclic.
 */
export const TokenValue = z
  .string()
  .refine(
    (v) => !/[;{}<@\\\n\r]|\/\*/.test(v) && quotesBalanced(v),
    "Value must not contain `;`, `{`, `}`, `<`, `@`, `\\`, `/*`, or a line break, and quotes must be balanced",
  );

/**
 * Alias sigil grammar: a `"$"` followed by exactly one valid {@link TokenKey}.
 * A category value matching this pattern is resolved to
 * `var(--<cssVarPrefix>-<kebab-target>)` instead of being emitted literally
 * — see `flattenByCategory.ts`.
 */
export const ALIAS_VALUE_RE = new RegExp(`^\\$(${TOKEN_KEY_SOURCE})$`);

/**
 * `TokenValue`, further restricted to reject a leading `$` — the alias
 * sigil (`$<TokenKey>`, see {@link ALIAS_VALUE_RE}) is only resolved by
 * `flattenByCategory.ts` for the CSS-var categories in
 * {@link ThemeCssVarShape}; `typography` has no CSS variable
 * representation of its own (`generateTypographyCss.ts` emits literal
 * property values), so a `$`-prefixed value would leak into the compiled
 * CSS unresolved (e.g. a literal `font-size: $primary;`).
 */
const TypographyValue = TokenValue.refine(
  (v) => !v.startsWith("$"),
  "aliases are not supported in typography",
);

/**
 * A single typography variant. `fontFamily`/`fontStyle` are optional because
 * most variants inherit the base font stack and style; when present they
 * follow the same injection-safe `TypographyValue` grammar as every other
 * value.
 */
export const TypographyStyleSchema = z.strictObject({
  fontSize: TypographyValue,
  lineHeight: TypographyValue,
  fontWeight: z.number(),
  letterSpacing: TypographyValue,
  fontFamily: TypographyValue.optional(),
  fontStyle: TypographyValue.optional(),
});

/**
 * Tailwind's built-in `font-<name>` font-weight utility suffixes. A
 * `theme.fontFamily` key that kebab-cases to one of these would produce a
 * `.font-<name>` class colliding with Tailwind's native font-weight
 * utility of the same name (both font-family and font-weight utilities
 * share the `font-` class prefix).
 */
export const TAILWIND_FONT_WEIGHT_UTILITY_NAMES = [
  "thin",
  "extralight",
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
] as const;

/**
 * Report one `ZodIssue` per pair of keys in `record` whose `toKebabCase`
 * form collides (e.g. `blue500` and `blue-500` both become `blue-500`) —
 * such a collision would silently overwrite one CSS variable/class with
 * another. Shared by every category record (colors, shadows, backdrop
 * blurs, border radius, font family, border width, typography).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, unknown> | undefined} record - Category record to check
 * @param {(string | number)[]} pathPrefix - Path segments to prepend to each issue
 * @returns {void}
 */
const reportKebabCollisions = (
  ctx: z.RefinementCtx,
  record: Record<string, unknown> | undefined,
  pathPrefix: (string | number)[],
): void => {
  if (!record) return;

  const firstKeyByKebab = new Map<string, string>();
  for (const key of Object.keys(record)) {
    const kebab = toKebabCase(key);
    const firstKey = firstKeyByKebab.get(kebab);
    if (firstKey === undefined) {
      firstKeyByKebab.set(kebab, key);
      continue;
    }
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, key],
      message:
        `Key "${key}" and "${firstKey}" both kebab-case to "${kebab}" — ` +
        "rename one so the generated CSS variable/class names don't collide.",
    });
  }
};

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
    reportKebabCollisions(ctx, typography, []);
  });

/**
 * Shared shape of every "CSS-var category" — a theme record that
 * `flattenByCategory`/`generateThemeCss`'s `buildIntermediateVars` turns
 * into `--sg-*` intermediate variables. Single source of truth for both
 * {@link ThemeSchema} and {@link ThemeOverrideSchema}: adding a new
 * CSS-var category (e.g. a future `letterSpacing`) is one line here, one
 * descriptor in `builtInCategories.ts`, and one test — neither schema
 * repeats the category key list.
 */
const ThemeCssVarShape = z.strictObject({
  colors: z.record(TokenKey, TokenValue),
  shadows: z.record(TokenKey, TokenValue).optional(),
  backDropBlurs: z.record(TokenKey, TokenValue).optional(),
  borderRadius: z.record(TokenKey, TokenValue).optional(),
  fontFamily: z.record(TokenKey, TokenValue).optional(),
  borderWidth: z.record(TokenKey, TokenValue).optional(),
});

/**
 * The subset of `ThemeSchema`/`ThemeOverrideSchema` fields that carry
 * `--sg-*` CSS variable data, inferred from {@link ThemeCssVarShape}.
 * `colors` is required on this type (matching `ThemeSchema`) — every call
 * site that only has a `ThemeOverride` (where `colors` is optional) is
 * still structurally assignable *to* a function expecting this type only
 * when read defensively; category `select` accessors instead take the
 * looser {@link ThemeOverride} (see `TokenCategoryDescriptor.ts`).
 */
export type ThemeCssVarSource = z.infer<typeof ThemeCssVarShape>;

/**
 * Every category key with a `--sg-*` CSS variable representation, derived
 * from {@link ThemeCssVarShape} (`.keyof().options`) instead of repeating
 * the key list a second time — adding a category to `ThemeCssVarShape`
 * automatically extends alias/kebab-collision validation to it too.
 */
const ALIAS_CATEGORIES = ThemeCssVarShape.keyof().options;

/**
 * Theme override configuration. Contains partial overrides for every
 * CSS-var category (colors, shadows, backdrop blurs, border radius, font
 * family, border width) — everything but `typography`, matching
 * `generateThemeCss.ts`'s `buildIntermediateVars`. Derived from
 * {@link ThemeCssVarShape} via `.partial()` — no category key list is
 * repeated here.
 */
export const ThemeOverrideSchema = ThemeCssVarShape.partial();

/**
 * Report a `ZodIssue` for every alias value in `ownEntries` that either
 * doesn't match `^\$<TokenKey>$`, or references a key absent from
 * `validKeys`. `ownEntries` is the record the value is actually *declared*
 * in (the base record for the base pass, an override's own record for a
 * per-theme pass) — `validKeys` is the merged key set it may reference
 * (the override's own keys are always a subset of the base keys by the
 * time this runs, since `validateThemeOverride` rejects an override key
 * absent from the base record before reaching this check).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string>} ownEntries - Entries whose own grammar/target is checked
 * @param {ReadonlySet<string>} validKeys - Keys a `$` alias may legally reference
 * @param {(key: string) => (string | number)[]} pathFor - Issue path builder for a given key
 * @returns {void}
 */
const checkAliasGrammarAndTargets = (
  ctx: z.RefinementCtx,
  ownEntries: Record<string, string>,
  validKeys: ReadonlySet<string>,
  pathFor: (key: string) => (string | number)[],
): void => {
  for (const [key, value] of Object.entries(ownEntries)) {
    if (!value.startsWith("$")) continue;

    const target = ALIAS_VALUE_RE.exec(value)?.[1];
    if (target === undefined) {
      ctx.addIssue({
        code: "custom",
        path: pathFor(key),
        message: `Alias value "${value}" must match ^\\$<TokenKey>$ (a "$" followed by a valid key)`,
      });
    } else if (!validKeys.has(target)) {
      ctx.addIssue({
        code: "custom",
        path: pathFor(key),
        message: `Alias "${value}" references unknown key "${target}"`,
      });
    }
  }
};

/**
 * DFS the alias graph of `merged` (every key resolves via `merged[key]`,
 * following `$`-alias chains restricted to `keys`) and return the first
 * cycle found as an ordered chain (e.g. `["a", "b", "a"]`), or `undefined`
 * when the graph is acyclic.
 * @param {Record<string, string>} merged - Full key→value map for this theme/category pass
 * @param {ReadonlySet<string>} keys - Keys participating in the graph (= `Object.keys(merged)`)
 * @returns {string[] | undefined} Ordered cycle chain, or `undefined`
 */
const findAliasCycle = (
  merged: Record<string, string>,
  keys: ReadonlySet<string>,
): string[] | undefined => {
  const visiting = new Set<string>();
  const done = new Set<string>();

  const visit = (
    key: string,
    chain: readonly string[],
  ): string[] | undefined => {
    if (done.has(key)) return undefined;
    if (visiting.has(key)) {
      const cycleStart = chain.indexOf(key);
      return [...chain.slice(cycleStart), key];
    }

    const value = merged[key];
    const target = !value?.startsWith("$")
      ? undefined
      : ALIAS_VALUE_RE.exec(value)?.[1];

    if (target === undefined || !keys.has(target)) {
      done.add(key);
      return undefined;
    }

    visiting.add(key);
    const cycle = visit(target, [...chain, key]);
    visiting.delete(key);
    done.add(key);
    return cycle;
  };

  for (const key of keys) {
    const cycle = visit(key, []);
    if (cycle) return cycle;
  }
  return undefined;
};

/**
 * Validate one category's alias graph for one theme pass (base, or a
 * single `themes.<name>` override merged on top of base): alias
 * grammar/target-existence for `ownEntries`, then a cycle check over the
 * full `merged` graph. Reports at most one cycle issue, anchored at
 * whichever cycle member is actually declared in `ownEntries` (falling
 * back to the first cycle member when none is).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string>} merged - Full key→value map for this pass (base, or base ⊕ override)
 * @param {Record<string, string>} ownEntries - Entries whose own grammar/target is checked (= `merged` for the base pass, the override's own record for a themed pass)
 * @param {(key: string) => (string | number)[]} pathFor - Issue path builder for a given key
 * @returns {void}
 */
const validateCategoryAliasGraph = (
  ctx: z.RefinementCtx,
  merged: Record<string, string>,
  ownEntries: Record<string, string>,
  pathFor: (key: string) => (string | number)[],
): void => {
  const keys = new Set(Object.keys(merged));
  checkAliasGrammarAndTargets(ctx, ownEntries, keys, pathFor);

  const cycle = findAliasCycle(merged, keys);
  if (!cycle) return;

  const anchorKey =
    cycle.find((key) => Object.hasOwn(ownEntries, key)) ?? cycle[0];
  if (anchorKey === undefined) return;

  ctx.addIssue({
    code: "custom",
    path: pathFor(anchorKey),
    message: `Alias cycle detected: ${cycle.join(" → ")}`,
  });
};

/**
 * Reject a `theme.borderWidth` key that also names a `theme.colors` key
 * within the same scope (base theme, or a single `themes.<name>`
 * override) — the two categories' utility classes would otherwise be easy
 * to confuse (e.g. a `borderWidth.primary` alongside `colors.primary`).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} colors - `colors` record for this scope
 * @param {Record<string, string> | undefined} borderWidth - `borderWidth` record for this scope
 * @param {(string | number)[]} pathPrefix - Path segments to prepend (`[]` for base, `["themes", name]` for an override)
 * @returns {void}
 */
const checkBorderWidthColorCollision = (
  ctx: z.RefinementCtx,
  colors: Record<string, string> | undefined,
  borderWidth: Record<string, string> | undefined,
  pathPrefix: (string | number)[],
): void => {
  if (!colors || !borderWidth) return;

  for (const key of Object.keys(borderWidth)) {
    if (!Object.hasOwn(colors, key)) continue;
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, "borderWidth", key],
      message: `borderWidth key "${key}" collides with a colors key of the same name — rename one.`,
    });
  }
};

/**
 * Reject a `fontFamily` key whose kebab-case form matches one of
 * Tailwind's built-in font-weight utility suffixes (see
 * {@link TAILWIND_FONT_WEIGHT_UTILITY_NAMES}).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} fontFamily - `fontFamily` record for this scope
 * @param {(string | number)[]} pathPrefix - Path segments to prepend (`[]` for base, `["themes", name]` for an override)
 * @returns {void}
 */
const checkFontFamilyWeightNames = (
  ctx: z.RefinementCtx,
  fontFamily: Record<string, string> | undefined,
  pathPrefix: (string | number)[],
): void => {
  if (!fontFamily) return;

  const weightNames: readonly string[] = TAILWIND_FONT_WEIGHT_UTILITY_NAMES;
  for (const key of Object.keys(fontFamily)) {
    const kebab = toKebabCase(key);
    if (!weightNames.includes(kebab)) continue;
    ctx.addIssue({
      code: "custom",
      path: [...pathPrefix, "fontFamily", key],
      message: `fontFamily key "${key}" collides with Tailwind's built-in font-weight utility "font-${kebab}" — rename it.`,
    });
  }
};

/**
 * Validate every CSS-var category on the base theme: kebab-key uniqueness
 * and the alias grammar/cycle graph (merged = base only).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {ThemeCssVarSource} theme - Base theme (CSS-var categories only)
 * @returns {void}
 */
const validateBaseCategories = (
  ctx: z.RefinementCtx,
  theme: ThemeCssVarSource,
): void => {
  for (const category of ALIAS_CATEGORIES) {
    const record = theme[category];
    reportKebabCollisions(ctx, record, [category]);
    if (record) {
      validateCategoryAliasGraph(ctx, record, record, (key) => [category, key]);
    }
  }
};

/**
 * Validate a single `themes.<name>` override: kebab-key uniqueness on its
 * own records, that every override key already exists in the matching base
 * record (an override-only key never maps into `@theme inline`/`@utility`
 * output — it produces no class, see `flattenByCategory.ts`/
 * `generateThemeCss.ts`, both of which only ever iterate base keys), the
 * alias grammar/cycle graph merged with the base theme, and the
 * borderWidth/colors collision check scoped to this override.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {ThemeCssVarSource} baseTheme - Base theme (for the alias merge)
 * @param {string} themeName - Override name (`themes.<themeName>`)
 * @param {Partial<ThemeCssVarSource>} override - The override's own records
 * @returns {void}
 */
const validateThemeOverride = (
  ctx: z.RefinementCtx,
  baseTheme: ThemeCssVarSource,
  themeName: string,
  override: Partial<ThemeCssVarSource>,
): void => {
  for (const category of ALIAS_CATEGORIES) {
    const overrideRecord = override[category];
    reportKebabCollisions(ctx, overrideRecord, ["themes", themeName, category]);
    if (!overrideRecord) continue;

    const baseRecord = baseTheme[category];
    for (const key of Object.keys(overrideRecord)) {
      if (baseRecord && Object.hasOwn(baseRecord, key)) continue;
      ctx.addIssue({
        code: "custom",
        path: ["themes", themeName, category, key],
        message:
          `Override key "${key}" has no base value in theme.${category} — ` +
          "it produces no utility; declare it in the base theme instead.",
      });
    }

    const merged = { ...baseTheme[category], ...overrideRecord };
    validateCategoryAliasGraph(ctx, merged, overrideRecord, (key) => [
      "themes",
      themeName,
      category,
      key,
    ]);
  }

  checkBorderWidthColorCollision(ctx, override.colors, override.borderWidth, [
    "themes",
    themeName,
  ]);
  checkFontFamilyWeightNames(ctx, override.fontFamily, ["themes", themeName]);
};

/**
 * Theme configuration — the single source of truth for both JSON and
 * TypeScript theme authoring. `z.strictObject` at every level rejects
 * unknown/typo'd keys (e.g. `colours`, or a stray metadata field) instead
 * of silently stripping them; `.parse()` is the only entry point that
 * produces a value consumers should trust.
 *
 * Cross-field validation (kebab-key uniqueness, `$key` alias grammar/cycle
 * detection, `borderWidth` vs `colors` key collisions, `fontFamily`
 * vs Tailwind font-weight name collisions) runs in the trailing
 * `.superRefine()`, after every individual field has already passed its
 * own `TokenKey`/`TokenValue` grammar check.
 */
export const ThemeSchema = ThemeCssVarShape.extend({
  $schema: z.string().optional(),
  typography: TypographyRecordSchema.optional(),
  themes: z.record(TokenKey, ThemeOverrideSchema).optional(),
}).superRefine((theme, ctx) => {
  validateBaseCategories(ctx, theme);
  checkBorderWidthColorCollision(ctx, theme.colors, theme.borderWidth, []);
  checkFontFamilyWeightNames(ctx, theme.fontFamily, []);

  if (!theme.themes) return;
  for (const [themeName, override] of Object.entries(theme.themes)) {
    validateThemeOverride(
      ctx,
      theme,
      themeName,
      override as Partial<ThemeCssVarSource>,
    );
  }
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
 * print to a terminal or throw as a plain `Error` message — every CLI/Vite
 * consumer that catches a `ZodError` from `ThemeSchema.parse()` funnels it
 * through this instead of dumping the raw (deeply nested) `ZodError` object.
 * @param {z.ZodError} error - The `ZodError` to format
 * @returns {string} One formatted line per issue, joined with `\n`
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
