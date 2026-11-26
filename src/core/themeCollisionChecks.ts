import type { z } from "zod";

import { cssVarCategories } from "../features/registry/builtInCategories";
import { toKebabCase } from "../shared/helpers";

import type { ThemeConfig } from "./themeSchema";

/** Tailwind's `font-<name>` font-weight suffixes, which a `fontFamily` key must not take. */
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
 * Report each key whose kebab-case form repeats an earlier key's (`blue500`/`blue-500`).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, unknown> | undefined} record - Category record to check
 * @param {(string | number)[]} pathPrefix - Path segments to prepend to each issue
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
 * Reject a `borderWidth` key whose `border-<kebab-key>` class a `colors` key also emits.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} colors - Base `colors` record
 * @param {Record<string, string> | undefined} borderWidth - Base `borderWidth` record
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
 * Reject a `colors` key whose `divide-<kebab-key>` is a divider width
 * (`x`, `y-2`, `x-<borderWidth key>`): Tailwind would emit width and color.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} colors - Base `colors` record
 * @param {Record<string, string> | undefined} borderWidth - Base `borderWidth` record
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

// `fontFamily.weightBold` would overwrite Tailwind's `--font-weight-bold` scale.
const FONT_SCALE_NAMESPACE_RE = /^(weight|size)(-|$)/;

/**
 * Reject a `fontFamily` key named like a font weight or starting with `weight`/`size`.
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {Record<string, string> | undefined} fontFamily - Base `fontFamily` record
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
 * Reject a `typography` key equal to another category's class (`textPrimary` vs `colors.primary`).
 * @param {z.RefinementCtx} ctx - Zod refinement context
 * @param {ThemeConfig} theme - Base theme
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
