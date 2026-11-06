import type { z } from "zod";

import { cssVarCategories } from "../features/registry/builtInCategories";
import { toKebabCase } from "../shared/helpers";

import type { ThemeConfig } from "./themeSchema";

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
 * Reject a `theme.colors` key whose `divide-<kebab-key>` color class is
 * also one of Tailwind's divider-width utilities: `x`/`y` (`divide-x`),
 * `x-<n>`/`y-<n>` for any integer `n` (`divide-x-2`) and `x-<k>`/`y-<k>`
 * for a `borderWidth` key `k` (`divide-x-thin`). Tailwind would emit the
 * width and the color for that one class.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} colors - Base `colors` record
 * @param {Record<string, string> | undefined} borderWidth - Base `borderWidth` record
 * @returns {void}
 */
export const checkDivideColorCollision = (
  ctx: z.RefinementCtx,
  colors: Record<string, string> | undefined,
  borderWidth: Record<string, string> | undefined,
): void => {
  if (!colors) return;
  const widths = new Set(Object.keys(borderWidth ?? {}).map(toKebabCase));
  for (const key of Object.keys(colors)) {
    const kebab = toKebabCase(key);
    const match = /^[xy](?:-(.+))?$/.exec(kebab);
    if (!match) continue;
    const rest = match[1];
    if (rest !== undefined && !/^\d+$/.test(rest) && !widths.has(rest)) {
      continue;
    }
    ctx.addIssue({
      code: "custom",
      path: ["colors", key],
      message: `colors key "${key}" collides with Tailwind's divider utility "divide-${kebab}" (borderWidth divide-x/y scale) — rename it.`,
    });
  }
};

/**
 * `--font-weight-*` and `--font-size-*` live in the `--font-` theme
 * namespace Tailwind reads for font families, but it ignores them as
 * families and instead reads them as the weight/size scale — a
 * `fontFamily` key `weightBold` would overwrite `--font-weight-bold`
 * (`font-bold`) and `sizeLg` the `font-size-lg` variable.
 */
const FONT_SCALE_NAMESPACE_RE = /^(weight|size)(-|$)/;

/**
 * Reject a `fontFamily` key whose kebab-case form matches one of
 * Tailwind's built-in font-weight utility suffixes (see
 * {@link TAILWIND_FONT_WEIGHT_UTILITY_NAMES}), or that starts with the
 * `weight`/`size` segment of Tailwind's `--font-weight-*`/`--font-size-*`
 * theme variables.
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
    if (weightNames.includes(kebab)) {
      ctx.addIssue({
        code: "custom",
        path: ["fontFamily", key],
        message: `fontFamily key "${key}" collides with Tailwind's built-in font-weight utility "font-${kebab}" — rename it.`,
      });
    } else if (FONT_SCALE_NAMESPACE_RE.test(kebab)) {
      ctx.addIssue({
        code: "custom",
        path: ["fontFamily", key],
        message: `fontFamily key "${key}" emits "--font-${kebab}", which is Tailwind's font-weight/font-size theme namespace (--font-weight-*, --font-size-*): it is not a font family and would overwrite that scale — rename it so it does not start with "weight" or "size".`,
      });
    }
  }
};

/**
 * Map every class a CSS-var category emits (`<prefix>-<kebab key>`) to the
 * `category.key` that owns it.
 * @param {ThemeConfig} theme - Base theme
 * @returns {Map<string, string>} Class name → first owning `category.key`
 */
const classOwners = (theme: ThemeConfig): Map<string, string> => {
  const owner = new Map<string, string>();
  for (const descriptor of cssVarCategories) {
    for (const key of Object.keys(theme[descriptor.key] ?? {})) {
      for (const prefix of descriptor.classPrefixes ?? []) {
        const className = `${prefix}-${toKebabCase(key)}`;
        if (!owner.has(className)) {
          owner.set(className, `${descriptor.key}.${key}`);
        }
      }
    }
  }
  return owner;
};

/**
 * Reject a `typography` key whose kebab-case form equals the class another
 * category emits (`<prefix>-<kebab key>`, e.g. `colors.primary` →
 * `text-primary`, so `typography.textPrimary` → `@utility text-primary`
 * would collide). Typography emits the bare `@utility <kebab-key>`, so its
 * class set is just its keys; state classes are not considered.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {ThemeConfig} theme - Base theme
 * @returns {void}
 */
export const checkTypographyClassCollisions = (
  ctx: z.RefinementCtx,
  theme: ThemeConfig,
): void => {
  if (!theme.typography) return;

  const owner = classOwners(theme);

  for (const key of Object.keys(theme.typography)) {
    const className = toKebabCase(key);
    const other = owner.get(className);
    if (other === undefined) continue;
    ctx.addIssue({
      code: "custom",
      path: ["typography", key],
      message: `typography key "${key}" emits "@utility ${className}", the same class theme.${other} emits — rename one.`,
    });
  }
};
