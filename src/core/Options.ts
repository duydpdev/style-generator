export enum Breakpoint {
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl",
  XXL = "2xl",
}

export const defaultScreens: Record<Breakpoint, string> = {
  [Breakpoint.SM]: "640px",
  [Breakpoint.MD]: "768px",
  [Breakpoint.LG]: "1024px",
  [Breakpoint.XL]: "1280px",
  [Breakpoint.XXL]: "1536px",
};

/**
 * Mapping of spacing property keys to their CSS property declarations.
 * Key: prop name (e.g. 'p', 'mx')
 * Value: Record of CSS property → var() reference
 */
export type SpacingPropertyMap = Record<string, Record<string, string>>;

export interface StyleGeneratorOptions {
  /**
   * Breakpoint keys to use for responsive class generation.
   * @default ["md", "lg"]
   */
  breakpoints?: (Breakpoint | string)[];

  /**
   * Custom screens map to override defaults or add new ones.
   * Example: { md: "800px", "3xl": "1920px" }
   */
  screens?: Record<Breakpoint | string, string>;

  /**
   * Enable responsive class generation in spacing CSS rules.
   * Set to false if your project only targets a single viewport.
   * @default true
   */
  enableResponsive?: boolean;

  /**
   * Typography configuration.
   */
  typography?: {
    /**
     * When true, inject typography tokens as CSS vars into :root and have
     * utility classes reference those vars instead of hard-coded values.
     * Allows consumer to override a single token via CSS without touching JS.
     * @default false
     */
    cssVarDriven?: boolean;
  };

  // --- Spacing (CSS custom properties) ---

  /**
   * Spacing configuration. `generate()` emits one static
   * `@utility sp-<key>` block per spacing key; each declaration reads a
   * `var(--sg-sp-<key>)` custom property, with a per-breakpoint `var()`
   * fallback chain inside nested `@media` rules.
   */
  spacing?: {
    /** Disable spacing CSS rule generation entirely. Defaults to true. */
    enabled?: boolean;
    /** Override or extend the default spacing property-to-CSS mapping. */
    properties?: SpacingPropertyMap;
  };

  /**
   * Extra Tailwind v4 `@source inline(...)` entries appended to the
   * generated CSS, for classes built at runtime that Tailwind's static
   * candidate scan can never see (e.g. a template-literal class name).
   * Each entry is emitted verbatim inside `@source inline("<entry>")` —
   * Tailwind's brace-expansion syntax (`{a,b,c}`) is supported.
   *
   * Validated by `generate()`: each entry must be non-empty, at most 512
   * characters, and must not contain `"`, `'`, `\`, `;`, `@`, `<`, `>`, or
   * a line break — those characters could escape the `inline("…")` string
   * and inject an arbitrary at-rule.
   */
  extraSources?: string[];
}
