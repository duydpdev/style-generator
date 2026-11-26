import { z } from "zod";

import { builtInCategories } from "../features/registry/builtInCategories";
import type { TokenCategoryDescriptor } from "../features/registry/TokenCategoryDescriptor";
import { UTILITY_NAME_RE, toKebabCase } from "../shared/helpers";

import {
  validateCategoryAliasGraph,
  validateCrossAxisAliasCycles,
} from "./aliasGraph";
import {
  checkBorderWidthColorCollision,
  checkDivideColorCollision,
  checkFontFamilyWeightNames,
  checkTypographyClassCollisions,
  reportKebabCollisions,
} from "./themeCollisionChecks";
import { forEachAxisVariant } from "./forEachAxisVariant";
import {
  DurationValue,
  EasingValue,
  OpacityValue,
  SizeValue,
  TokenKey,
  TokenValue,
  TypographyValue,
  ZIndexValue,
} from "./tokenGrammar";

/** A single typography variant; an absent optional field emits no declaration, so inherited values stay. */
export const TypographyStyleSchema = z.strictObject({
  fontSize: TypographyValue,
  lineHeight: TypographyValue,
  // CSS Fonts 4 allows fractional weights (variable fonts), so no `.int()`.
  fontWeight: z.number().min(1).max(1000),
  letterSpacing: TypographyValue.optional(),
  fontFamily: TypographyValue.optional(),
  fontStyle: TypographyValue.optional(),
});

/** Utility families a typography `@utility` would shadow: `sp-*` and `font-*`. */
const SHADOWED_UTILITY_FAMILIES = /^(sp|font)-/;

// Typography keys become `@utility <kebab-key>`: reject invalid utility names
// at parse time, and `sp-*`/`font-*` names that shadow generated utilities.
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

// CSS-var categories that accept `$` aliases. A new category is one line here
// plus a descriptor in `builtInCategories.ts` (pinned by its `.test-d.ts`).
const ThemeAliasShape = z.strictObject({
  colors: z.record(TokenKey, TokenValue),
  shadows: z.record(TokenKey, TokenValue).optional(),
  backdropBlurs: z.record(TokenKey, TokenValue).optional(),
  borderRadius: z.record(TokenKey, TokenValue).optional(),
  fontFamily: z.record(TokenKey, TokenValue).optional(),
  borderWidth: z.record(TokenKey, TokenValue).optional(),
});

// A digit-only opacity key would replace the colour `/<n>` modifier step.
const OpacityKey = TokenKey.regex(
  // A pattern (not a refine) reaches the JSON Schema; no lookahead for RE2.
  /\D/,
  "A digit-only opacity key would replace the colour modifier step of the same number (bg-primary/50 reads --opacity-50); name it by role (disabled, muted)",
);

const ThemeScaleShape = z.strictObject({
  motionDuration: z.record(TokenKey, DurationValue).optional(),
  motionEasing: z.record(TokenKey, EasingValue).optional(),
  controlHeight: z.record(TokenKey, SizeValue).optional(),
  iconSize: z.record(TokenKey, SizeValue).optional(),
  opacity: z.record(OpacityKey, OpacityValue).optional(),
  zIndex: z.record(TokenKey, ZIndexValue).optional(),
});

const ThemeCssVarShape = ThemeAliasShape.extend(ThemeScaleShape.shape);

/** The theme fields that carry `--sg-*` CSS variable data. */
export type ThemeCssVarSource = z.infer<typeof ThemeCssVarShape>;

const CSS_VAR_CATEGORIES = ThemeCssVarShape.keyof().options;

const ALIAS_CATEGORIES = ThemeAliasShape.keyof().options;

const allowsAlpha = (category: string): boolean =>
  builtInCategories.some(
    (descriptor: TokenCategoryDescriptor) =>
      descriptor.key === category && descriptor.opacityModifier === true,
  );

/** A `themeAxes` variant override: every CSS-var category, partial (no `typography`). */
export const ThemeOverrideSchema = ThemeCssVarShape.partial();

const validateBaseCategories = (
  ctx: z.RefinementCtx,
  theme: ThemeCssVarSource,
): void => {
  for (const category of CSS_VAR_CATEGORIES) {
    reportKebabCollisions(ctx, theme[category], [category]);
  }
  for (const category of ALIAS_CATEGORIES) {
    const record = theme[category];
    if (record) {
      validateCategoryAliasGraph(
        ctx,
        record,
        record,
        allowsAlpha(category),
        (key) => [category, key],
      );
    }
  }
};

// One override: every key must exist in the base record, and its aliases are
// checked merged over the base.
// Rationale: documents/architecture.md#validatethemeoverride-why-override-keys-skip-the-collision-checks
const validateThemeOverride = (
  ctx: z.RefinementCtx,
  baseTheme: ThemeCssVarSource,
  pathPrefix: (string | number)[],
  override: z.infer<typeof ThemeOverrideSchema>,
): void => {
  for (const category of CSS_VAR_CATEGORIES) {
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
  }
  for (const category of ALIAS_CATEGORIES) {
    const overrideRecord = override[category];
    if (!overrideRecord) continue;
    const merged = { ...baseTheme[category], ...overrideRecord };
    validateCategoryAliasGraph(
      ctx,
      merged,
      overrideRecord,
      allowsAlpha(category),
      (key) => [...pathPrefix, category, key],
    );
  }
};

// Rationale: documents/architecture.md#themeaxesschema-why-integer-like-axis-and-variant-names-are-rejected
const INTEGER_LIKE_NAME_RE = /^(0|[1-9]\d*)$/;

const integerLikeNameMessage = (kind: "axis" | "variant", name: string) =>
  `themeAxes ${kind} name "${name}" is a canonical integer; JS object key order puts integer-like keys first (ascending) regardless of declaration order, which would silently break the "last declared wins" precedence — rename it (e.g. "contrast${name}" or "c${name}")`;

// "base" means "no override" in `ThemeAxesState`, so a variant of that name
// could never be switched on; an axis named `base` is fine.
const RESERVED_VARIANT_NAME = "base";

const reservedVariantMessage = () =>
  `themeAxes variant name "${RESERVED_VARIANT_NAME}" is reserved: ThemeAxesState and themeAxisAttributes() read "${RESERVED_VARIANT_NAME}" as "no override" on the axis, so this variant could never be switched on — rename it (e.g. "default" or "standard"). The base theme already is what an axis shows without an override.`;

// `axis → variant → override`, each variant emitted as one
// `html[data-<axis>="<variant>"]` block in declaration order.
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

// root → themeAxes → axis → variant → category; bounds the walk on cyclic input.
const MAX_KEY_SCAN_DEPTH = 4;

// Report every own `__proto__` key of the RAW input at its exact path.
// Rationale: documents/architecture.md#rejectprotokeys-why-prototype-key-names-are-scanned-on-the-raw-input
const rejectProtoKeys = (
  node: unknown,
  path: (string | number)[],
  ctx: z.RefinementCtx,
  depth = 0,
): void => {
  if (node === null || typeof node !== "object" || depth > MAX_KEY_SCAN_DEPTH) {
    return;
  }
  if (Object.hasOwn(node, "__proto__")) {
    ctx.addIssue({
      code: "custom",
      path: [...path, "__proto__"],
      message: '"__proto__" is not a valid token name',
    });
  }
  for (const [key, child] of Object.entries(node)) {
    rejectProtoKeys(child, [...path, key], ctx, depth + 1);
  }
};

const checkRawTheme = (raw: unknown, ctx: z.RefinementCtx): unknown => {
  rejectProtoKeys(raw, [], ctx);
  return raw;
};

// Strict at every level; cross-field checks run in `.superRefine()` after
// every field passed its own grammar.
const ThemeSchemaShape = ThemeCssVarShape.extend({
  $schema: z.string().optional(),
  typography: TypographyRecordSchema.optional(),
  themeAxes: ThemeAxesSchema.optional(),
}).superRefine((theme, ctx) => {
  validateBaseCategories(ctx, theme);
  checkBorderWidthColorCollision(ctx, theme.colors, theme.borderWidth);
  checkDivideColorCollision(ctx, theme.colors, theme.borderWidth);
  checkFontFamilyWeightNames(ctx, theme.fontFamily);
  checkTypographyClassCollisions(ctx, theme);

  if (!theme.themeAxes) return;
  forEachAxisVariant(theme.themeAxes, (axisName, variantName, override) => {
    validateThemeOverride(
      ctx,
      theme,
      ["themeAxes", axisName, variantName],
      override,
    );
  });

  for (const category of ALIAS_CATEGORIES) {
    const projected: Record<
      string,
      Record<string, Record<string, string> | undefined>
    > = {};
    forEachAxisVariant(theme.themeAxes, (axisName, variantName, override) => {
      const variants = (projected[axisName] ??= {});
      variants[variantName] = override[category];
    });
    validateCrossAxisAliasCycles(ctx, theme[category], projected, category);
  }
});

/** Theme configuration schema, the single source of truth for JSON and TypeScript themes. */
export const ThemeSchema = z.preprocess(checkRawTheme, ThemeSchemaShape);

// Rationale: documents/architecture.md#parsetheme-why-the-cast-to-the-callers-type-is-safe
/**
 * Validate `config` against `ThemeSchema` and return it typed as the caller's `T`.
 * @template T
 * @param {T} config - Theme config object
 * @returns {T} The validated theme, structurally identical to `config`
 * @throws {z.ZodError} On unknown keys or CSS-injection-unsafe values
 */
export const parseTheme = <T extends ThemeConfig>(config: T): T =>
  ThemeSchema.parse(config) as T;

/** Theme configuration; only `colors` is required. */
export type ThemeConfig = z.infer<typeof ThemeSchema>;

/** One `themeAxes` variant override. */
export type ThemeOverride = z.infer<typeof ThemeOverrideSchema>;

/** A single typography variant. */
export type TypographyConfig = z.infer<typeof TypographyStyleSchema>;

/**
 * Format every issue in a `ZodError` as one `"path → message"` line. Nested
 * `invalid_key` issues are surfaced instead of Zod's generic record-key message.
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
