/**
 * Configuration for the theme.
 */
export interface ThemeConfig {
  /**
   * Color palette configuration.
   */
  colors: {
    /** Base colors (e.g., primary, secondary, background). */
    base: Record<string, string>;
    /** Text colors. */
    text: Record<string, string>;
  };
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
   * Theme overrides keyed by theme name.
   * Each entry generates `html[data-theme='<name>']` CSS variables.
   * Only include values that differ from the base (default) theme.
   * @example
   * themes: {
   *   dark: { colors: { base: { primary: "#0A84FF" } } },
   *   "high-contrast": { colors: { text: { main: "#000" } } }
   * }
   */
  themes?: Record<string, ThemeOverride>;
}

/**
 * Theme override configuration.
 * Contains partial overrides for colors, shadows, backdrop blurs, and border radius.
 */
export interface ThemeOverride {
  colors?: {
    base?: Record<string, string>;
    text?: Record<string, string>;
  };
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
