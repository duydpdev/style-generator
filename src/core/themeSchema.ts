import { z } from "zod";

import { UTILITY_NAME_RE, toKebabCase } from "../shared/helpers";

import {
  validateCategoryAliasGraph,
  validateCrossAxisAliasCycles,
} from "./aliasGraph";
import {
  checkBorderWidthColorCollision,
  checkFontFamilyWeightNames,
  checkTypographyClassCollisions,
  reportKebabCollisions,
} from "./crossFieldChecks";
import { TokenKey, TokenValue, TypographyValue } from "./tokenGrammar";

/**
 * A single typography variant. `letterSpacing`, `fontFamily` and
 * `fontStyle` are optional because most variants inherit the base tracking,
 * font stack and style; an absent `letterSpacing` emits no declaration, so
 * inherited tracking is not reset. When present they follow the same
 * injection-safe `TypographyValue` grammar as every other value.
 */
export const TypographyStyleSchema = z.strictObject({
  fontSize: TypographyValue,
  lineHeight: TypographyValue,
  // CSS Fonts 4: `font-weight` is a <number [1,1000]>; fractions are legal
  // (variable fonts), so no `.int()`.
  fontWeight: z.number().min(1).max(1000),
  letterSpacing: TypographyValue.optional(),
  fontFamily: TypographyValue.optional(),
  fontStyle: TypographyValue.optional(),
});

/** Utility families a typography `@utility` would shadow: `sp-*` and `font-*`. */
const SHADOWED_UTILITY_FAMILIES = /^(sp|font)-/;

/**
 * `theme.typography` keys become Tailwind v4 `@utility` names via
 * `toKebabCase` (see `generateTypographyCss.ts`) — a key whose kebab-case
 * form doesn't match `UTILITY_NAME_RE` (e.g. starts with a digit or a dash)
 * would otherwise only fail at CSS-generation time. Rejecting it here, at
 * parse time, surfaces a `ZodError` with the offending key in its `path`.
 * Keys kebab-casing to `sp-*` or `font-*` are rejected too: they would
 * shadow the generated spacing and font utilities.
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
    for (const key of Object.keys(typography)) {
      const family = SHADOWED_UTILITY_FAMILIES.exec(toKebabCase(key))?.[1];
      if (family === undefined) continue;
      ctx.addIssue({
        code: "custom",
        path: [key],
        message:
          `Typography key "${key}" kebab-cases to "${toKebabCase(key)}", ` +
          `which shadows the generated ${family}-* utilities ` +
          `(${family === "sp" ? "spacing" : "font-family and font-weight"}) ` +
          `— rename the key so it does not start with "${family}-".`,
      });
    }
  });

/**
 * Shared shape of every "CSS-var category" — a theme record that
 * `flattenByCategory`/`generateThemeCss`'s `buildIntermediateVars` turns
 * into `--sg-*` intermediate variables. Single source of truth for both
 * {@link ThemeSchema} and {@link ThemeOverrideSchema}. Adding a new
 * CSS-var category (e.g. a future `letterSpacing`) is one line here and one
 * descriptor in `builtInCategories.ts`; `builtInCategories.test-d.ts` fails
 * the type check when the two disagree.
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
 * Validate a single `themeAxes.<axis>.<variant>` override: that every
 * override key already exists in the matching base record (an override-only
 * key never maps into `@theme inline`/`@utility` output — it produces no
 * class, see `flattenByCategory.ts`/`generateThemeCss.ts`, both of which
 * only ever iterate base keys), and the alias grammar/cycle graph merged
 * with the base theme.
 *
 * The kebab-key, `borderWidth`/`colors` and `fontFamily` weight-name checks
 * are deliberately NOT repeated here: they run on the base theme, and since
 * every override key must exist in the base record (rejected above
 * otherwise), any collision between override keys is a collision between
 * base keys that the base pass already reports.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {ThemeCssVarSource} baseTheme - Base theme (for the alias merge)
 * @param {(string | number)[]} pathPrefix - Issue path prefix for this override (`["themeAxes", axisName, variantName]`)
 * @param {Partial<ThemeCssVarSource>} override - The override's own records
 * @returns {void}
 */
const validateThemeOverride = (
  ctx: z.RefinementCtx,
  baseTheme: ThemeCssVarSource,
  pathPrefix: (string | number)[],
  override: z.infer<typeof ThemeOverrideSchema>,
): void => {
  for (const category of ALIAS_CATEGORIES) {
    const overrideRecord = override[category];
    if (!overrideRecord) continue;

    const baseRecord = baseTheme[category];
    for (const key of Object.keys(overrideRecord)) {
      if (baseRecord && Object.hasOwn(baseRecord, key)) continue;
      ctx.addIssue({
        code: "custom",
        path: [...pathPrefix, category, key],
        message:
          `Override key "${key}" has no base value in theme.${category} — ` +
          "it produces no utility; declare it in the base theme instead.",
      });
    }

    const merged = { ...baseTheme[category], ...overrideRecord };
    validateCategoryAliasGraph(ctx, merged, overrideRecord, (key) => [
      ...pathPrefix,
      category,
      key,
    ]);
  }
};

/**
 * Canonical array-index-like names (`0`, `7`, `100`, `2024` — no leading
 * zero, digits only). JS engines enumerate these own keys FIRST in
 * ascending numeric order, ahead of every string key regardless of the
 * order they were written in the JSON file, so they can't honour the
 * declaration-order precedence `themeAxes` relies on.
 */
const INTEGER_LIKE_NAME_RE = /^(0|[1-9]\d*)$/;

const integerLikeNameMessage = (kind: "axis" | "variant", name: string) =>
  `themeAxes ${kind} name "${name}" is a canonical integer; JS object key order puts integer-like keys first (ascending) regardless of declaration order, which would silently break the "last declared wins" precedence — rename it (e.g. "contrast${name}" or "c${name}")`;

/**
 * `"base"` is the "no override" sentinel of `ThemeAxesState` and
 * `themeAxisAttributes()`: a variant of that name could never be switched on
 * (it would emit no `data-<axis>` attribute), so it is rejected rather than
 * left as a block nothing can activate. An AXIS named `base` is fine: it is
 * only a key of the state object, and its own variants are not affected.
 */
const RESERVED_VARIANT_NAME = "base";

const reservedVariantMessage = () =>
  `themeAxes variant name "${RESERVED_VARIANT_NAME}" is reserved: ThemeAxesState and themeAxisAttributes() read "${RESERVED_VARIANT_NAME}" as "no override" on the axis, so this variant could never be switched on — rename it (e.g. "default" or "standard"). The base theme already is what an axis shows without an override.`;

/**
 * `themeAxes` — replaces the single-axis `themes` field. Outer key is the
 * axis name (e.g. `"theme"`, `"palette"`), inner key is the variant name
 * within that axis (e.g. `"dark"`, `"forest"`) — both use the
 * {@link TokenKey} grammar, so neither can inject an unsafe
 * selector/attribute-value character. Multiple axes can be declared and
 * toggled independently (`html[data-theme]` + `html[data-palette]`, ...);
 * `generateThemeCss.ts` emits one `html[data-<axis-kebab>="<variant-kebab>"]`
 * block per variant, in declaration order, after `:root` — with the default
 * `axes.scope: "root"` and no `axes.attribute` rename (`options.axes` changes
 * the attribute name and, for `"element"`, drops the `html` anchor).
 *
 * Axis and variant names that are canonical integers (`/^(0|[1-9]\d*)$/`)
 * are rejected: `JSON.parse`/object enumeration hoists them ahead of all
 * other keys, so declaration order — and with it the emit-order precedence
 * contract — would be lost before this library ever sees the object.
 *
 * A variant named `base` is rejected too (see {@link RESERVED_VARIANT_NAME}).
 */
const ThemeAxesSchema = z
  .record(TokenKey, z.record(TokenKey, ThemeOverrideSchema))
  .superRefine((axes, ctx) => {
    for (const [axisName, variants] of Object.entries(axes)) {
      if (INTEGER_LIKE_NAME_RE.test(axisName)) {
        ctx.addIssue({
          code: "custom",
          path: [axisName],
          message: integerLikeNameMessage("axis", axisName),
        });
      }
      for (const variantName of Object.keys(variants)) {
        if (variantName === RESERVED_VARIANT_NAME) {
          ctx.addIssue({
            code: "custom",
            path: [axisName, variantName],
            message: reservedVariantMessage(),
          });
        }
        if (INTEGER_LIKE_NAME_RE.test(variantName)) {
          ctx.addIssue({
            code: "custom",
            path: [axisName, variantName],
            message: integerLikeNameMessage("variant", variantName),
          });
        }
      }
      reportKebabCollisions(ctx, variants, [axisName]);
    }
  });

/**
 * Detect the removed `themes` key (single-axis, pre-DEV.6) on the RAW
 * input, before the strict object shape check runs, and replace the
 * generic `unrecognized_keys` issue it would otherwise produce with a
 * rename hint. Runs as a `z.preprocess` step ahead of `ThemeSchemaShape` —
 * `ZodPipe` skips the right-hand schema once the left-hand transform has
 * added an issue, so a `themes` key never *also* triggers
 * `unrecognized_keys` for itself.
 *
 * Side effect: while `themes` is present this SUPPRESSES every other
 * validation issue (missing `colors`, typos, bad values, ...) — none of
 * them surface until the key is renamed, so expect a second wave of
 * errors after the rename.
 * @param {unknown} raw - Raw (pre-Zod) input
 * @param {z.RefinementCtx} ctx - Refinement context, for `ctx.addIssue`
 * @returns {unknown} `raw`, unchanged
 */
const rejectLegacyThemesKey = (raw: unknown, ctx: z.RefinementCtx): unknown => {
  if (raw !== null && typeof raw === "object" && "themes" in raw) {
    ctx.addIssue({
      code: "custom",
      path: ["themes"],
      message:
        '"themes" was renamed to "themeAxes"; move themes.<name> to themeAxes.theme.<name>',
    });
  }
  return raw;
};

/**
 * Theme configuration — the single source of truth for both JSON and
 * TypeScript theme authoring. `z.strictObject` at every level rejects
 * unknown/typo'd keys (e.g. `colours`, or a stray metadata field) instead
 * of silently stripping them; `.parse()` is the only entry point that
 * produces a value consumers should trust.
 *
 * Cross-field validation (kebab-key uniqueness, `$key` alias grammar/cycle
 * detection, `borderWidth` vs `colors` key collisions, `fontFamily` vs
 * Tailwind font-weight name collisions, per-axis-variant override
 * validation) runs in the trailing `.superRefine()`, after every
 * individual field has already passed its own `TokenKey`/`TokenValue`
 * grammar check. The checks themselves live in `crossFieldChecks.ts` and
 * `aliasGraph.ts`.
 */
const ThemeSchemaShape = ThemeCssVarShape.extend({
  $schema: z.string().optional(),
  typography: TypographyRecordSchema.optional(),
  themeAxes: ThemeAxesSchema.optional(),
}).superRefine((theme, ctx) => {
  validateBaseCategories(ctx, theme);
  checkBorderWidthColorCollision(ctx, theme.colors, theme.borderWidth);
  checkFontFamilyWeightNames(ctx, theme.fontFamily);
  checkTypographyClassCollisions(ctx, theme);

  if (!theme.themeAxes) return;
  for (const [axisName, variants] of Object.entries(theme.themeAxes)) {
    for (const [variantName, override] of Object.entries(variants)) {
      validateThemeOverride(
        ctx,
        theme,
        ["themeAxes", axisName, variantName],
        override,
      );
    }
  }

  for (const category of ALIAS_CATEGORIES) {
    validateCrossAxisAliasCycles(
      ctx,
      theme[category],
      Object.fromEntries(
        Object.entries(theme.themeAxes).map(([axisName, variants]) => [
          axisName,
          Object.fromEntries(
            Object.entries(variants).map(([variantName, override]) => [
              variantName,
              override[category],
            ]),
          ),
        ]),
      ),
      category,
    );
  }
});

/**
 * Wraps {@link ThemeSchemaShape} in `z.preprocess` ({@link rejectLegacyThemesKey})
 * so a theme still using the removed `themes` key gets a rename hint
 * instead of a generic unrecognized-key error — see that function's doc
 * for why the rename issue also suppresses every other issue on the same
 * input while `themes` is present.
 */
export const ThemeSchema = z.preprocess(
  rejectLegacyThemesKey,
  ThemeSchemaShape,
);

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
 * Record-key grammar failures arrive as `invalid_key` wrappers whose useful
 * message (e.g. the `_` hint) lives in the nested issues, so those are
 * surfaced instead of Zod's generic "Invalid key in record".
 * @param {z.ZodError} error - The `ZodError` to format
 * @returns {string} One formatted line per issue, joined with `\n`
 */
export const formatZodError = (error: z.ZodError): string =>
  error.issues
    .flatMap((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      if (issue.code === "unrecognized_keys") {
        return issue.keys.map(
          (key) => `${[...issue.path, key].join(".")} → ${issue.message}`,
        );
      }
      if (issue.code === "invalid_key" && issue.issues.length > 0) {
        return issue.issues.map((inner) => `${path} → ${inner.message}`);
      }
      return [`${path} → ${issue.message}`];
    })
    .join("\n");
