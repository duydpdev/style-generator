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
