import { z } from "zod";

import type { ResolvedOptions } from "./resolveOptions";
import type { ThemeConfig } from "./themeSchema";

interface OptionsIssue {
  code: "custom";
  path: (string | number)[];
  message: string;
}

interface OptionsIssueCtx {
  addIssue: (issue: OptionsIssue) => void;
}

/**
 * Each cleared Tailwind namespace needs a non-empty theme record to replace it
 * (`ThemeSchema` accepts `colors: {}`).
 * @param {OptionsIssueCtx} ctx - Issue collector
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {ResolvedOptions["resetTailwindDefaults"]} reset - Resolved `resetTailwindDefaults`
 */
export const checkResetTailwindDefaults = (
  ctx: OptionsIssueCtx,
  theme: ThemeConfig,
  reset: ResolvedOptions["resetTailwindDefaults"],
): void => {
  const needs = [
    ["colors", "colors"],
    ["radius", "borderRadius"],
    ["shadow", "shadows"],
  ] as const;
  for (const [name, category] of needs) {
    const index = reset.indexOf(name);
    if (index === -1) continue;
    if (Object.keys(theme[category] ?? {}).length > 0) continue;
    ctx.addIssue({
      code: "custom",
      path: ["resetTailwindDefaults", index],
      message: `resetTailwindDefaults "${name}" clears Tailwind's default ${name} values but the theme declares no "${category}" to replace them — add "${category}" or drop "${name}".`,
    });
  }
};

/**
 * Every opacity group `keys` entry must be a `theme.colors` key.
 * @param {OptionsIssueCtx} ctx - Issue collector
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {ResolvedOptions["coverage"]} coverage - Resolved `coverage`
 */
export const checkOpacityGroupKeys = (
  ctx: OptionsIssueCtx,
  theme: ThemeConfig,
  coverage: ResolvedOptions["coverage"],
): void => {
  const colorKeys = new Set(Object.keys(theme.colors));
  for (const group of coverage.colors?.opacityGroups ?? []) {
    group.keys?.forEach((key, index) => {
      if (colorKeys.has(key)) return;
      ctx.addIssue({
        code: "custom",
        path: ["coverage", "colors", "opacities", group.index, "keys", index],
        message: `Unknown color key "${key}" in an opacity group`,
      });
    });
  }
};

/**
 * Run every theme × options check and throw all issues as one `ZodError`.
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {Pick<ResolvedOptions, "resetTailwindDefaults" | "coverage">} resolved - Resolved options
 * @throws {z.ZodError} on a reset with no theme replacement or an unknown opacity group key
 */
export const assertThemeOptions = (
  theme: ThemeConfig,
  resolved: Pick<ResolvedOptions, "resetTailwindDefaults" | "coverage">,
): void => {
  const issues: z.core.$ZodIssue[] = [];
  const ctx: OptionsIssueCtx = { addIssue: (issue) => issues.push(issue) };
  checkResetTailwindDefaults(ctx, theme, resolved.resetTailwindDefaults);
  checkOpacityGroupKeys(ctx, theme, resolved.coverage);
  if (issues.length > 0) throw new z.ZodError(issues);
};
