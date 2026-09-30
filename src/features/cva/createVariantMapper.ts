import type { KebabCase } from "../../core/inference";
import { toKebabCase, toPascalCase } from "../../shared";

type MappedVariant<T extends string, P extends string> = P extends ""
  ? KebabCase<T>
  : `${P}-${KebabCase<T>}`;

type VariantMap<T extends string, P extends string> = {
  [K in T]: MappedVariant<K, P>;
};

type MultiVariantMap<T extends string, P extends string> = {
  [Px in P]: VariantMap<T, Px>;
};

/**
 * Options for the state-aware overloads of `createVariantMapper`. Mirrors
 * `TokenCategoryDescriptor.states` (e.g. `colorsCategory.states === ["hover",
 * "active"]`) — pass a category's own `states` straight through.
 */
export interface VariantMapperStatesOptions {
  /**
   * State suffixes to look for as sibling RAW tokens, e.g. `["hover",
   * "active"]`. For a raw token `t`, a state `s` is appended to `t`'s
   * class only when `tokens` also contains the sibling `t` + Pascal-cased
   * `s` (e.g. `primary` + `"hover"` -> sibling `primaryHover`). A token
   * with no matching sibling for any configured state keeps its plain
   * single class. Sibling tokens themselves (`primaryHover`) still get
   * their own entry in the result, mapped as a plain single class — they
   * are the state variant, not a token that itself has further states.
   */
  states: readonly string[];
}

/**
 * Creates a mapping of tokens to their corresponding prefixed CSS classes.
 * Classes are always kebab-cased with the SAME `toKebabCase` used by the
 * registry (`flattenByCategory`/`generateSourceInline`), so a mapper's
 * output is guaranteed to match a class the registry emits `@source
 * inline(...)` for.
 * @template {string} T
 * @template {string} P
 * @param {P} prefix - The utility prefix (e.g. 'bg', 'text', 'border'); `""` yields the bare kebab-case token (e.g. typography)
 * @param {readonly T[]} tokens - An array of token keys (e.g. ['primary', 'secondary'])
 * @returns {VariantMap<T, P>} An object mapping each token to its full class name
 * @example
 * const colors = ["primary", "secondary"] as const;
 * const bgVariants = createVariantMapper("bg", colors);
 * // Result: { primary: "bg-primary", secondary: "bg-secondary" }
 * @example
 * // Multiple prefixes at once
 * const border = createVariantMapper(["border-x", "border-y"] as const, ["sm", "md"] as const);
 * // Result: { "border-x": { sm: "border-x-sm", md: "border-x-md" }, "border-y": { sm: "border-y-sm", md: "border-y-md" } }
 * @example
 * // Flat sibling state tokens collapse into one chained class string per
 * // base token — feed straight into cva's variants. `COLOR_STATES` is the
 * // same list the registry's `@source inline` state lines are built from.
 * const tokens = ["primary", "primaryHover", "primaryActive", "danger"] as const;
 * const bg = createVariantMapper("bg", tokens, { states: COLOR_STATES });
 * // Result: {
 * //   primary: "bg-primary hover:bg-primary-hover active:bg-primary-active",
 * //   primaryHover: "bg-primary-hover",
 * //   primaryActive: "bg-primary-active",
 * //   danger: "bg-danger",
 * // }
 */
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(prefix: P, tokens: readonly T[]): VariantMap<T, P>;
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(prefixes: readonly P[], tokens: readonly T[]): MultiVariantMap<T, P>;
export function createVariantMapper<const T extends string>(
  prefix: string,
  tokens: readonly T[],
  opts: VariantMapperStatesOptions,
): Record<T, string>;
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: VariantMapperStatesOptions,
): Record<P, Record<T, string>>;
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefixOrPrefixes: P | readonly P[],
  tokens: readonly T[],
  opts?: VariantMapperStatesOptions,
): Record<string, string> | Record<string, Record<string, string>> {
  const mapClass = (prefix: P, token: string): string => {
    const kebab = toKebabCase(token);
    return prefix === "" ? kebab : `${prefix}-${kebab}`;
  };

  const buildForPrefix = (prefix: P): Record<string, string> => {
    if (!opts) {
      return Object.fromEntries(
        tokens.map((token) => [token, mapClass(prefix, token)]),
      );
    }

    const tokenSet = new Set<string>(tokens);
    return Object.fromEntries(
      tokens.map((token) => {
        const parts = [mapClass(prefix, token)];
        for (const state of opts.states) {
          const siblingKey = `${token}${toPascalCase(state)}`;
          if (tokenSet.has(siblingKey)) {
            parts.push(`${toKebabCase(state)}:${mapClass(prefix, siblingKey)}`);
          }
        }
        return [token, parts.join(" ")];
      }),
    );
  };

  if (typeof prefixOrPrefixes === "string") {
    return buildForPrefix(prefixOrPrefixes);
  }
  return Object.fromEntries(
    prefixOrPrefixes.map((prefix) => [prefix, buildForPrefix(prefix)]),
  );
}
