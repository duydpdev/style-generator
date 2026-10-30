import type {
  DEFAULT_BREAKPOINTS,
  SpacingKey,
} from "../../shared/defaultOption";

/**
 * Breakpoint keys the spacing CSS covers by default (`DEFAULT_BREAKPOINTS`,
 * `md`/`lg`). A project that sets `options.breakpoints` passes its own keys
 * as `BKeys`, e.g. `ResponsiveValueStrict<number, "sm" | "md" | "xl">`.
 */
export type DefaultBreakpointKeys = (typeof DEFAULT_BREAKPOINTS)[number];

/**
 * Responsive value type: simple value or per-breakpoint object.
 * The generic `BKeys` lets a project customize the breakpoints when wrapping the type.
 * `base` is always available by default, independent of `BKeys`. A typo in a
 * breakpoint key is a type error — there is no `(string & {})` fallback.
 * @example
 * // Simple: p={4}
 * // Responsive: p={{ base: 4, md: 8, lg: 12 }}
 * // Custom breakpoint (in a React project):
 * // type ResponsiveOptions<T> = ResponsiveValueStrict<T, 'tablet' | 'desktop'>;
 * @example
 * type P = ResponsiveValueStrict<number, "base" | "md">;
 * const ok: P = { base: 4, md: 8 };
 * // const bad: P = { typo: 4 }; // type error
 */
export type ResponsiveValueStrict<
  T,
  BKeys extends string = DefaultBreakpointKeys,
> = T | Partial<Record<BKeys | "base", T | undefined>>;

/**
 * Blocks inference of `T` at a use site, like the built-in `NoInfer` — which
 * needs TypeScript 5.4 while the `typescript` peer range starts at 5.0.
 */
type NoInferBKeys<T> = [T][T extends unknown ? 0 : never];

/**
 * Resolve a single spacing prop into className + inline style CSS variables.
 * Breakpoint keys default to the ones the spacing CSS emits (`md`/`lg`); pass
 * `BKeys` when `options.breakpoints` adds others. `BKeys` is never inferred
 * from the value ({@link NoInferBKeys}), so a typo such as `{ tablet: 4 }` stays an error.
 * @template BKeys - Breakpoint keys accepted in `value` (default `md | lg`)
 * @param {string} prop - Spacing property name (`SpacingKey` autocompletes: 'p', 'mx', 'gap'); any string is accepted so a custom `spacing.properties` key works without a cast
 * @param {ResponsiveValueStrict<number, BKeys>} value - Simple number or responsive object
 * @param {number} unit - Rem multiplier (default: 0.25, matching Tailwind's spacing scale)
 * @returns {{ className: string; style: Record<string, string> }} Resolved class name and CSS variable style map
 * @example
 * resolveSpacing('p', 4)
 * // → { className: 'sp-p', style: { '--sg-sp-p': '1rem' } }
 * @example
 * resolveSpacing('p', { base: 4, md: 8, lg: 16 })
 * // → { className: 'sp-p', style: { '--sg-sp-p': '1rem', '--sg-sp-p-md': '2rem', '--sg-sp-p-lg': '4rem' } }
 * @example
 * // With options.breakpoints: ["md", "lg", "xl"]
 * resolveSpacing<"md" | "lg" | "xl">('p', { base: 4, xl: 16 })
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

/**
 * Resolve multiple spacing props at once.
 * @template BKeys - Breakpoint keys accepted in each value (default `md | lg`)
 * @param {Partial<Record<SpacingKey, ResponsiveValueStrict<number, BKeys> | undefined>>} props - Object of spacing prop name → value
 * @returns {{ classNames: string; style: Record<string, string> }} Combined class names (space-joined) and merged CSS variable style map
 * @example
 * resolveSpacingProps({ p: 4, mx: { base: 2, md: 4 } })
 * // → {
 * //     classNames: 'sp-p sp-mx',
 * //     style: { '--sg-sp-p': '1rem', '--sg-sp-mx': '0.5rem', '--sg-sp-mx-md': '1rem' }
 * //   }
 */
export const resolveSpacingProps = <
  BKeys extends string = DefaultBreakpointKeys,
>(
  props: Partial<
    Record<
      SpacingKey,
      ResponsiveValueStrict<number, NoInferBKeys<BKeys>> | undefined
    >
  >,
): { classNames: string; style: Record<string, string> } => {
  const classNames: string[] = [];
  const style: Record<string, string> = {};

  for (const [prop, value] of Object.entries(props)) {
    if (value == null) continue;
    const result = resolveSpacing<BKeys>(prop as SpacingKey, value);
    classNames.push(result.className);
    Object.assign(style, result.style);
  }

  return { classNames: classNames.join(" "), style };
};
