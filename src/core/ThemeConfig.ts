/**
 * Configuration for the theme.
 */
export interface ThemeConfig {
  /**
   * Flat color palette configuration.
   * All colors live in a single namespace — no more base/text/common separation.
   * Supports flat values or nested objects (e.g., `{ sidebar: { DEFAULT: "#...", foreground: "#..." } }`).
   */
  colors: Record<string, string | Record<string, string>>;
  /**
   * Typography configuration (e.g., h1, body, caption).
   */
  typography: Record<string, TypographyConfig>;
  /**
   * Box shadow configuration.
   */
  shadows?: Record<string, string>;
  /**
   * Backdrop blur configuration.
   */
  backDropBlurs?: Record<string, string>;
  /**
   * Border radius configuration.
   */
  borderRadius?: Record<string, string>;
  /**
   * Border configuration.
   */
  border?: Record<string, string>;

  /**
   * Theme overrides keyed by theme name.
   * Each entry generates `html[data-theme='<name>']` CSS variables.
   * Only include values that differ from the base (default) theme.
   * @example
   * themes: {
   *   dark: { colors: { primary: "#0A84FF", foreground: "#F9FAFB" } },
   * }
   */
  themes?: Record<string, ThemeOverride>;
}

/**
 * Theme override configuration.
 * Contains partial overrides for colors, shadows, backdrop blurs, and border radius.
 */
export interface ThemeOverride {
  colors?: Record<string, string | Record<string, string>>;
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
}

/**
 * Configuration for a single typography variant.
 */
export interface TypographyConfig {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing: string;
}
