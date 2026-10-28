import type { CamelCase } from "../../core/inference";
import type { SpacingKey } from "../../shared/defaultOption";
import { toCamelCase } from "../../shared/helpers";
import { resolveSpacing } from "../spacing/spacingHelpers";
import type {
  DefaultBreakpointKeys,
  ResponsiveValueStrict,
} from "../spacing/spacingHelpers";

/**
 * Component props for the spacing utilities: every key of `K` camelCased
 * (`gap-x` → `gapX`), each optional and responsive. `K` defaults to the
 * built-in properties; pass `tokens.spacingProperties` elements when
 * `options.spacing.properties` adds or removes some, and `BKeys` (e.g.
 * `BreakpointKeys<typeof options>`) when `options.breakpoints` adds
 * breakpoints.
 * @template BKeys - Breakpoint keys accepted in object values (default `md | lg`)
 * @template K - Spacing property names (kebab-case, as in `tokens.spacingProperties`)
 * @example
 * type BoxProps = SpacingProps & { children?: ReactNode };
 * // <Box p={4} gapX={{ base: 2, md: 4 }} />
 */
export type SpacingProps<
  BKeys extends string = DefaultBreakpointKeys,
  K extends string = SpacingKey,
> = {
  readonly [P in K as CamelCase<P>]?:
    | ResponsiveValueStrict<number, BKeys>
    | undefined;
};

/**
 * Split a component's props into its spacing props (resolved to the
 * `sp-*` class and inline `--sg-sp-*` style) and everything else. Every
 * camelCased key of `keys` is removed from `rest`, even when its value is
 * `undefined`, so `p={undefined}` never reaches the DOM.
 *
 * `props` is checked against `SpacingProps<BKeys, K>`, so a literal such as
 * `{ p: "4" }` or `{ p: { tablet: 4 } }` is a type error. `BKeys` is not
 * inferred (it defaults to `md | lg`): props typed with
 * `SpacingProps<BKeys>` are accepted as they are, since extra breakpoint
 * keys are structurally compatible, but an object literal mixing a known
 * and an unknown breakpoint (`{ md: 4, tablet: 4 }`) is not caught. Pass all
 * three type arguments (`splitSpacingProps<K, Props, BKeys>(...)`, `BKeys`
 * from `BreakpointKeys<typeof options>`) to check a literal against the
 * configured breakpoints.
 * @template K - Spacing property names in `keys`
 * @template P - The component's props (spacing props plus the rest)
 * @template BKeys - Breakpoint keys accepted in object values (default `md | lg`)
 * @param {P} props - Component props
 * @param {readonly K[]} keys - Spacing property names to extract (`tokens.spacingProperties`)
 * @param {number} unit - Rem multiplier (default: 0.25)
 * @returns {{ spacing: { className: string; style: Record<string, string> }; rest: Omit<P, CamelCase<K>> }} `className` is already space-joined
 * @example
 * const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
 * return <div {...rest} className={cn(spacing.className, className)} style={{ ...spacing.style, ...style }} />;
 */
export const splitSpacingProps = <
  K extends string,
  P extends object & SpacingProps<BKeys, K>,
  BKeys extends string = DefaultBreakpointKeys,
>(
  props: P,
  keys: readonly K[],
  unit = 0.25,
): {
  spacing: { className: string; style: Record<string, string> };
  rest: Omit<P, CamelCase<K>>;
} => {
  const propNames = new Map(keys.map((key) => [toCamelCase(key), key]));
  const classNames: string[] = [];
  const style: Record<string, string> = {};
  const rest: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(props)) {
    const key = propNames.get(name);
    if (key === undefined) {
      rest[name] = value;
    }
  }

  for (const [name, key] of propNames) {
    const value = (
      props as Record<string, ResponsiveValueStrict<number, BKeys> | undefined>
    )[name];
    if (value == null) continue;
    const resolved = resolveSpacing<BKeys>(key, value, unit);
    classNames.push(resolved.className);
    Object.assign(style, resolved.style);
  }

  return {
    spacing: { className: classNames.join(" "), style },
    rest: rest as Omit<P, CamelCase<K>>,
  };
};
