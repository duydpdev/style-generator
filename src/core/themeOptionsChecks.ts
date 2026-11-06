import { z } from "zod";

import { axisAttributeName } from "../shared/axisAttributeName";

import type { AxesIssueCtx } from "./elementScopeAliases";
import { checkElementScopeAliases } from "./elementScopeAliases";
import type { ResolvedOptions } from "./resolveOptions";
import type { ThemeConfig } from "./themeSchema";

/**
 * Check `axes.attribute` against the theme's axes, whatever the scope: every
 * key must name a `themeAxes` axis, and no two axes may resolve to the same
 * attribute name (their variant blocks would answer to one attribute). Both
 * are reported at `["axes", "attribute", axis]` — for a clash, at the axis
 * that has an explicit entry (else the later one). Attribute names are
 * lowercase by the schema, and so are the `data-<kebab>` defaults, so a plain
 * string comparison is enough.
 * @param {AxesIssueCtx} ctx - Where issues are reported
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {Readonly<Record<string, string>>} attribute - Resolved `axes.attribute` map
 * @returns {void}
 */
export const checkAxesAttribute = (
  ctx: AxesIssueCtx,
  theme: ThemeConfig,
  attribute: Readonly<Record<string, string>>,
): void => {
  const axes = Object.keys(theme.themeAxes ?? {});

  for (const axis of Object.keys(attribute)) {
    if (axes.includes(axis)) continue;
    ctx.addIssue({
      code: "custom",
      path: ["axes", "attribute", axis],
      message: `axes.attribute names axis "${axis}", which is not declared in theme.themeAxes — fix the name or declare the axis.`,
    });
  }

  const firstAxisByName = new Map<string, string>();
  for (const axis of axes) {
    const name = axisAttributeName(axis, attribute);
    const first = firstAxisByName.get(name);
    if (first === undefined) {
      firstAxisByName.set(name, axis);
      continue;
    }
    ctx.addIssue({
      code: "custom",
      path: [
        "axes",
        "attribute",
        Object.hasOwn(attribute, axis) ? axis : first,
      ],
      message: `Axes "${first}" and "${axis}" would both use the attribute "${name}" — give one of them a different name in axes.attribute.`,
    });
  }
};

/**
 * Check `resetTailwindDefaults` against the theme: clearing Tailwind's
 * `--color-*`, `--radius-*` or `--shadow-*` defaults while the theme declares
 * no replacement would leave `bg-red-500`/`rounded-md`/`shadow-md` compiling
 * to nothing with no theme value to take over. `ThemeSchema` accepts
 * `colors: {}`, so `"colors"` needs a non-empty record like the others.
 * @param {AxesIssueCtx} ctx - Issue collector
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {ResolvedOptions["resetTailwindDefaults"]} reset - Resolved `resetTailwindDefaults`
 * @returns {void}
 */
export const checkResetTailwindDefaults = (
  ctx: AxesIssueCtx,
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
 * Run every check that needs both the theme and the options and throw every
 * issue as one `ZodError`, like the other `generate()` option and theme
 * failures: {@link checkAxesAttribute} always, {@link checkElementScopeAliases}
 * only for `scope: "element"` (with `"root"` the `html` anchor keeps every
 * alias in step), and {@link checkResetTailwindDefaults}.
 * @param {ThemeConfig} theme - Theme already parsed by `ThemeSchema`
 * @param {Pick<ResolvedOptions, "axes" | "resetTailwindDefaults">} resolved - Resolved options
 * @returns {void}
 * @throws {z.ZodError} on an unknown or clashing attribute, a stale alias holder, or a reset with no theme replacement
 */
export const assertThemeOptions = (
  theme: ThemeConfig,
  resolved: Pick<ResolvedOptions, "axes" | "resetTailwindDefaults">,
): void => {
  const issues: z.core.$ZodIssue[] = [];
  const ctx: AxesIssueCtx = { addIssue: (issue) => issues.push(issue) };
  checkAxesAttribute(ctx, theme, resolved.axes.attribute);
  if (resolved.axes.scope === "element") checkElementScopeAliases(ctx, theme);
  checkResetTailwindDefaults(ctx, theme, resolved.resetTailwindDefaults);
  if (issues.length > 0) throw new z.ZodError(issues);
};
