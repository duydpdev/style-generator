import type { ThemeConfig, ThemeOverride } from "./themeSchema";

/**
 * Visit every `themeAxes` axis × variant in declaration order, the order the
 * CSS blocks and the "last axis wins" rule rely on.
 * @param {ThemeConfig["themeAxes"]} themeAxes - The theme's axes; `undefined` visits nothing
 * @param {(axis: string, variant: string, override: ThemeOverride) => void} fn - Called once per variant with the axis name, the variant name and its override
 */
export const forEachAxisVariant = (
  themeAxes: ThemeConfig["themeAxes"],
  fn: (axis: string, variant: string, override: ThemeOverride) => void,
): void => {
  for (const [axis, variants] of Object.entries(themeAxes ?? {})) {
    for (const [variant, override] of Object.entries(variants)) {
      fn(axis, variant, override);
    }
  }
};
