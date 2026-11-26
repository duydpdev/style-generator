import type {
  DEFAULT_BREAKPOINTS,
  SpacingKey,
} from "../../shared/defaultOption";

/** Breakpoint keys the spacing CSS covers by default (`md`/`lg`). */
export type DefaultBreakpointKeys = (typeof DEFAULT_BREAKPOINTS)[number];

/**
 * A plain value or a per-breakpoint object (`{ base: 4, md: 8 }`). `base` is
 * always accepted; any other key must be in `BKeys`, so a typo is a type error.
 * @template T - Value type
 * @template BKeys - Breakpoint keys (default `md | lg`)
 */
export type ResponsiveValueStrict<
  T,
  BKeys extends string = DefaultBreakpointKeys,
> = T | Partial<Record<BKeys | "base", T | undefined>>;

// The built-in `NoInfer` needs TypeScript 5.4; the `typescript` peer range starts at 5.0.
type NoInferBKeys<T> = [T][T extends unknown ? 0 : never];

/**
 * Resolves one spacing prop to its `sp-<prop>` class and `--sg-sp-*` style variables.
 * @template BKeys - Breakpoint keys accepted in `value` (default `md | lg`; never inferred, so a typo stays an error)
 * @param {string} prop - Spacing property name; any string, so a custom `spacing.properties` key works
 * @param {ResponsiveValueStrict<number, BKeys>} value - Simple number or responsive object
 * @param {number} unit - Rem multiplier (default `0.25`, Tailwind's spacing scale)
 * @returns {{ className: string; style: Record<string, string> }} Class name and CSS variable style map
 */
export const resolveSpacing = <BKeys extends string = DefaultBreakpointKeys>(
  prop: SpacingKey | (string & {}),
  value: ResponsiveValueStrict<number, NoInferBKeys<BKeys>>,
  unit = 0.25,
): { className: string; style: Record<string, string> } => {
  const style: Record<string, string> = {};

  if (typeof value === "number") {
    style[`--sg-sp-${prop}`] = `${String(value * unit)}rem`;
  } else {
    for (const [bp, val] of Object.entries(value)) {
      if (val == null) continue;
      const suffix = bp === "base" ? "" : `-${bp}`;
      style[`--sg-sp-${prop}${suffix}`] = `${String(val * unit)}rem`;
    }
  }

  return { className: `sp-${prop}`, style };
};
