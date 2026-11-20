import { z } from "zod";

import type { ResolvedOptions } from "./resolveOptions";
import type { ThemeConfig } from "./themeSchema";

/** The one issue shape the theme × options checks report. */
interface OptionsIssue {
  code: "custom";
  path: (string | number)[];
  message: string;
}

/** Where the checks report to: the plain collector `assertThemeOptions` uses. */
interface OptionsIssueCtx {
  addIssue: (issue: OptionsIssue) => void;
}

/**
 * Check `resetTailwindDefaults` against the theme: clearing Tailwind's
 * `--color-*`, `--radius-*` or `--shadow-*` defaults while the theme declares
 * no replacement would leave `bg-red-500`/`rounded-md`/`shadow-md` compiling
 * to nothing with no theme value to take over. `ThemeSchema` accepts
 * `colors: {}`, so `"colors"` needs a non-empty record like the others.
 * @param {OptionsIssueCtx} ctx - Issue collector
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {ResolvedOptions["resetTailwindDefaults"]} reset - Resolved `resetTailwindDefaults`
 * @returns {void}
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
 * Check every `coverage.colors.opacities` group `keys` entry against the
 * theme's `colors`: a key that is not one would emit a class no theme token
 * produces, so a typo is reported at its own path instead of dropped.
 * @param {OptionsIssueCtx} ctx - Issue collector
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {ResolvedOptions["coverage"]} coverage - Resolved `coverage`
 * @returns {void}
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
 * Run every check that needs both the theme and the options and throw every
 * issue as one `ZodError`, like the other `generate()` option and theme
 * failures: today {@link checkResetTailwindDefaults} and
 * {@link checkOpacityGroupKeys}.
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {Pick<ResolvedOptions, "resetTailwindDefaults" | "coverage">} resolved - Resolved options
 * @returns {void}
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
