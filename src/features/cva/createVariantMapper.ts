import type { KebabCase } from "../../core/inference";
import { toKebabCase } from "../../shared";

type MappedVariant<T extends string, P extends string> = P extends ""
  ? KebabCase<T>
  : `${P}-${KebabCase<T>}`;

/**
 * Creates a mapping of tokens to their corresponding prefixed CSS classes.
 * @template {string} T
 * @template {string} P
 * @param {P} prefix - The utility prefix (e.g., 'bg', 'text', 'border')
 * @param {readonly T[]} tokens - An array of token keys (e.g., ['primary', 'secondary'])
 * @param {boolean} [isKeepFormat] - Keep original token format instead of converting to kebab-case
 * @returns {Record<T, MappedVariant<T, P>>} An object mapping each token to its full class name
 * @example
 * const colors = ["primary", "secondary"] as const;
 * const bgVariants = createVariantMapper("bg", colors);
 * // Result: { primary: "bg-primary", secondary: "bg-secondary" }
 */
export const createVariantMapper = <T extends string, P extends string = "">(
  prefix: P,
  tokens: readonly T[],
  isKeepFormat = false,
): { [K in T]: MappedVariant<K, P> } => {
  return tokens.reduce(
    (acc, token) => {
      const formattedToken = isKeepFormat ? token : toKebabCase(token);
      const cls =
        prefix === "" ? formattedToken : `${prefix}-${formattedToken}`;
      (acc as Record<string, string>)[token] = cls;
      return acc;
    },
    {} as { [K in T]: MappedVariant<K, P> },
  );
};
