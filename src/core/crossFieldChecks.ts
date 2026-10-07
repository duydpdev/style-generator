import type { z } from "zod";

import { cssVarCategories } from "../features/registry/builtInCategories";
import { toKebabCase } from "../shared/helpers";

import type { ThemeCssVarSource } from "./themeSchema";

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
export const reportKebabCollisions = (
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
 * Reject a `theme.borderWidth` key that also names a `theme.colors` key —
 * both emit `border-<kebab-key>`, so the two utilities would share a class
 * (e.g. `borderWidth.primary` alongside `colors.primary`). Keys are
 * compared by kebab-case form, the class they emit: `thinLine` and
 * `thin-line` collide.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} colors - Base `colors` record
 * @param {Record<string, string> | undefined} borderWidth - Base `borderWidth` record
 * @returns {void}
 */
export const checkBorderWidthColorCollision = (
  ctx: z.RefinementCtx,
  colors: Record<string, string> | undefined,
  borderWidth: Record<string, string> | undefined,
): void => {
  if (!colors || !borderWidth) return;

  const colorClasses = new Set(Object.keys(colors).map(toKebabCase));
  for (const key of Object.keys(borderWidth)) {
    if (!colorClasses.has(toKebabCase(key))) continue;
    ctx.addIssue({
      code: "custom",
      path: ["borderWidth", key],
      message: `borderWidth key "${key}" collides with a colors key emitting the same class "border-${toKebabCase(key)}" — rename one.`,
    });
  }
};

/**
 * Reject a `fontFamily` key whose kebab-case form matches one of
 * Tailwind's built-in font-weight utility suffixes (see
 * {@link TAILWIND_FONT_WEIGHT_UTILITY_NAMES}).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} fontFamily - Base `fontFamily` record
 * @returns {void}
 */
export const checkFontFamilyWeightNames = (
  ctx: z.RefinementCtx,
  fontFamily: Record<string, string> | undefined,
): void => {
  if (!fontFamily) return;

  const weightNames: readonly string[] = TAILWIND_FONT_WEIGHT_UTILITY_NAMES;
  for (const key of Object.keys(fontFamily)) {
    const kebab = toKebabCase(key);
    if (!weightNames.includes(kebab)) continue;
    ctx.addIssue({
      code: "custom",
      path: ["fontFamily", key],
      message: `fontFamily key "${key}" collides with Tailwind's built-in font-weight utility "font-${kebab}" — rename it.`,
    });
  }
};

/**
 * Variable-name prefixes no theme key may produce: the spacing utilities own
 * `--sg-sp-<key>[-<bp>]` (see `generateSpacingCss.ts`), so a color such as
 * `spP` (→ `--sg-sp-p`) would silently redefine a spacing variable.
 */
const RESERVED_CSS_VAR_PREFIXES = ["--sg-sp-"] as const;

/** Where a `--sg-*` variable was first produced. */
interface CssVarOwner {
  category: string;
  key: string;
}

/**
 * Why `owner` may not produce `varName`, or `undefined` when it may.
 * @param {string} varName - The `--<cssVarPrefix>-<kebab-key>` variable
 * @param {CssVarOwner} owner - The category and key producing it
 * @param {CssVarOwner | undefined} prev - The first owner of the same variable, if any
 * @returns {string | undefined} The issue message, or `undefined`
 */
const cssVarCollisionMessage = (
  varName: string,
  owner: CssVarOwner,
  prev: CssVarOwner | undefined,
): string | undefined => {
  if (RESERVED_CSS_VAR_PREFIXES.some((p) => varName.startsWith(p))) {
    return `${owner.category}.${owner.key} produces ${varName}, which is reserved for the spacing utilities (--sg-sp-*); rename the key`;
  }
  if (prev && prev.category !== owner.category) {
    return `${owner.category}.${owner.key} and ${prev.category}.${prev.key} both produce the CSS variable ${varName}; the later one silently overwrites the earlier — rename one of them`;
  }
  return undefined;
};

/**
 * Reject two keys from different CSS-var categories that produce the same
 * `--<cssVarPrefix>-<kebab-key>` variable (e.g. `colors.shadowPrimary` and
 * `shadows.primary` both give `--sg-shadow-primary`; the later declaration
 * silently overwrites the earlier one in `:root`), and any key whose
 * variable falls in {@link RESERVED_CSS_VAR_PREFIXES}. Variable names come
 * from the registry's `cssVarPrefix` descriptors, so a prefix rename flows
 * in automatically. Same-category duplicates are left to
 * {@link reportKebabCollisions}. Runs on the base theme only: every
 * `themeAxes` override key must already exist in the base record, so the
 * base pass covers it.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {ThemeCssVarSource} theme - Base theme (CSS-var categories only)
 * @returns {void}
 */
export const checkCssVarCollisions = (
  ctx: z.RefinementCtx,
  theme: ThemeCssVarSource,
): void => {
  const seen = new Map<string, CssVarOwner>();
  for (const category of cssVarCategories) {
    for (const key of Object.keys(theme[category.key] ?? {})) {
      const varName = `--${category.cssVarPrefix}-${toKebabCase(key)}`;
      const owner = { category: category.key, key };
      const prev = seen.get(varName);
      const message = cssVarCollisionMessage(varName, owner, prev);
      if (message) {
        ctx.addIssue({ code: "custom", path: [owner.category, key], message });
      } else if (!prev) {
        seen.set(varName, owner);
      }
    }
  }
};
