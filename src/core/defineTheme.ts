import type { StyleGeneratorOptions } from "./Options";
import type { ThemeConfig } from "./ThemeConfig";

/**
 * Type-safe theme config helper. Zero runtime cost.
 * @template T
 * @param {T} config - Theme config object
 * @returns {T} The same config object (type-preserving)
 * @example
 * const theme = defineTheme({
 *   colors: { primary: "#007AFF", foreground: "#111827" },
 *   typography: { heading: { fontSize: "2rem", lineHeight: "1.2", fontWeight: 700, letterSpacing: "-0.02em" } },
 * });
 */
export function defineTheme<T extends ThemeConfig>(config: T): T {
  return config;
}

/**
 * Type-safe options helper. Zero runtime cost.
 * @template T
 * @param {T} options - Style generator options
 * @returns {T} The same options object (type-preserving)
 */
export function defineOptions<T extends StyleGeneratorOptions>(options: T): T {
  return options;
}
