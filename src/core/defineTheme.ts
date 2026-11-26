import type { ExactOptions, StyleGeneratorOptions } from "./Options";
import { parseTheme, type ThemeConfig } from "./themeSchema";

/**
 * Validate a theme against `ThemeSchema` and keep its literal types.
 * @template T
 * @param {T} config - Theme config object
 * @returns {T} The parsed theme, structurally identical to `config`
 * @throws {Error} A `ZodError` on unknown keys or CSS-injection-unsafe values
 * Rationale: documents/architecture.md#definetheme-why-it-is-optional-and-only-in-the-root-entry
 */
export function defineTheme<const T extends ThemeConfig>(config: T): T {
  return parseTheme(config);
}

/**
 * Type-only options helper: `const O` keeps the literal keys that type the tokens.
 * @template O
 * @param {O} options - Style generator options
 * @returns {O} The same options object (type-preserving)
 */
export function defineOptions<const O extends StyleGeneratorOptions>(
  options: ExactOptions<O>,
): O {
  return options;
}
