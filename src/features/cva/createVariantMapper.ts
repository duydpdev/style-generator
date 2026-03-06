/**
 * Helper utility for automatically generating class maps for CVA variants.
 */

type MappedVariant<T extends string, P extends string> = P extends ""
  ? T
  : `${P}-${T}`;

/**
 * Creates a mapping of tokens to their corresponding prefixed CSS classes.
 * @template {string} T
 * @template {string} P
 * @param {P} prefix - The utility prefix (e.g., 'bg', 'text', 'border')
 * @param {readonly T[]} tokens - An array of token keys (e.g., ['primary', 'secondary'])
 * @returns {Record<T, MappedVariant<T, P>>} An object mapping each token to its full class name
 * @example
 * const colors = ["primary", "secondary"] as const;
 * const bgVariants = createVariantMapper("bg", colors);
 * // Result: { primary: "bg-primary", secondary: "bg-secondary" }
 */
export const createVariantMapper = <T extends string, P extends string = "">(
  prefix: P,
  tokens: readonly T[],
): Record<T, MappedVariant<T, P>> => {
  return tokens.reduce(
    (acc, token) => {
      const cls = prefix === "" ? token : `${prefix}-${token}`;
      acc[token] = cls as MappedVariant<T, P>;
      return acc;
    },
    {} as Record<T, MappedVariant<T, P>>,
  );
};
