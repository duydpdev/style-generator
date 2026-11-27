import type { CamelCase } from "../../core/inference";
import type { SpacingKey } from "../../shared/defaultOption";
import { toCamelCase } from "../../shared/helpers";
import { resolveSpacing } from "../spacing/spacingHelpers";
import type {
  DefaultBreakpointKeys,
  ResponsiveValueStrict,
} from "../spacing/spacingHelpers";

// A widened `K` falls back to `SpacingKey`: an index signature would make every prop a spacing prop.
type SpacingPropKeys<K extends string> = string extends K ? SpacingKey : K;

/**
 * Component props for the spacing utilities: every key of `K` camelCased
 * (`gap-x` → `gapX`), optional and responsive. A widened `K` means the built-in properties.
 * @template BKeys - Breakpoint keys accepted in object values (default `md | lg`)
 * @template K - Spacing property names (kebab-case, as in `tokens.spacingProperties`)
 */
export type SpacingProps<
  BKeys extends string = DefaultBreakpointKeys,
  K extends string = SpacingKey,
> = {
  readonly [P in SpacingPropKeys<K> as CamelCase<P>]?:
    ResponsiveValueStrict<number, BKeys> | undefined;
};

/**
 * Splits props into resolved spacing and the rest; every spacing key leaves `rest`, even `undefined`.
 * @template BKeys - Breakpoint keys of object values (default `md | lg`; not inferred, pass it to check literals)
 * @param {object} props - Component props
 * @param {readonly string[]} keys - Spacing property names to extract (`tokens.spacingProperties`)
 * @param {number} unit - Rem multiplier (default: 0.25)
 * @returns {{ spacing: object; rest: object }} `sp-*` classes (space-joined) with their style, and the remaining props
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
  rest: Omit<P, CamelCase<SpacingPropKeys<K>>>;
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
    rest: rest as Omit<P, CamelCase<SpacingPropKeys<K>>>,
  };
};
