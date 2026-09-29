import type { KebabCase } from "../../core/inference";
import { toKebabCase } from "../../shared";

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
 */
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(prefix: P, tokens: readonly T[]): VariantMap<T, P>;
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(prefixes: readonly P[], tokens: readonly T[]): MultiVariantMap<T, P>;
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefixOrPrefixes: P | readonly P[],
  tokens: readonly T[],
): VariantMap<T, P> | MultiVariantMap<T, P> {
  const prefixes =
    typeof prefixOrPrefixes === "string"
      ? [prefixOrPrefixes]
      : prefixOrPrefixes;

  const byPrefix = Object.fromEntries(
    prefixes.map((prefix) => [
      prefix,
      Object.fromEntries(
        tokens.map((token) => {
          const kebab = toKebabCase(token);
          return [token, prefix === "" ? kebab : `${prefix}-${kebab}`];
        }),
      ),
    ]),
  ) as MultiVariantMap<T, P>;

  return typeof prefixOrPrefixes === "string"
    ? byPrefix[prefixOrPrefixes]
    : byPrefix;
}
