import type { StyleGeneratorOptions } from "./Options";
import { ThemeSchema, type ThemeConfig } from "./themeSchema";

/**
 * Runtime-validated theme config helper — the only place `defineTheme` is
 * exported from is the root barrel (`.`), never `./tokens`, so Zod never
 * reaches the browser-safe subpaths. Parses `config` against `ThemeSchema`
 * and returns the parsed result, throwing a `ZodError` (with a precise
 * `path`) for unknown keys or CSS-injection-unsafe values.
 *
 * `generate()`, the CLI, and the Vite plugin all re-validate independently,
 * so calling `defineTheme()` is optional — but doing so surfaces the same
 * error as an IDE type error too, since `T` is checked against
 * `ThemeConfig` at compile time.
 * @template T
 * @param {T} config - Theme config object
 * @returns {T} The parsed theme, structurally identical to `config`
 * @example
 * const theme = defineTheme({
 *   colors: { primary: "#007AFF", foreground: "#111827" },
 *   typography: { heading: { fontSize: "2rem", lineHeight: "1.2", fontWeight: 700, letterSpacing: "-0.02em" } },
 * });
 */
export function defineTheme<const T extends ThemeConfig>(config: T): T {
  // `ThemeSchema.parse` returns `ThemeConfig` (widened), not `T` — cast back
  // to preserve the caller's literal key/value types for downstream
  // inference (e.g. `DesignTokensResult<T>`). Safe: a successful parse is
  // structurally identical to `config` (no coercion/defaults in this
  // schema), so the cast doesn't paper over an actual shape mismatch.
  return ThemeSchema.parse(config) as T;
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
