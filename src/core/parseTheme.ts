import { ThemeSchema, type ThemeConfig } from "./themeSchema";

/**
 * Validate `config` against `ThemeSchema` and hand it back typed as the
 * caller's own `T`. The one place the `ThemeSchema.parse(x) as T` cast lives.
 *
 * `ThemeSchema.parse` returns the widened `ThemeConfig`, not `T`; the cast
 * keeps the caller's literal key/value types for downstream inference
 * (`DesignTokensWeb<T, O>`). Safe: a successful parse is structurally
 * identical to `config` (the schema has no coercion or defaults), so the cast
 * cannot hide a shape mismatch. Throws a `ZodError` (with a precise `path`)
 * for unknown keys or CSS-injection-unsafe values.
 * @template T
 * @param {T} config - Theme config object
 * @returns {T} The validated theme, structurally identical to `config`
 */
export const parseTheme = <T extends ThemeConfig>(config: T): T =>
  ThemeSchema.parse(config) as T;
