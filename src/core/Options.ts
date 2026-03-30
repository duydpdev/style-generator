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

export type StyleModule =
  | "spacing"
  | "layout"
  | "typography"
  | "colors"
  | "borders"
  | "shadows"
  | "backdrop"
  | "opacity"
  | "zIndex"
  | "rounded";

/**
 * Configuration for a utility module (safelist-based).
 */
export interface ModuleConfig<V = number | string> {
  /** Set of values to generate. Falls back to defaults if not set. */
  values?: V[];
  /** Properties to generate. Falls back to defaults if not set. */
  properties?: string[];
  /** Disable this module entirely. Defaults to true. */
  enabled?: boolean;
}

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
   * Include color classes (text-*, bg-*, border-*) in the safelist.
   * Default is false — Tailwind v4's `@theme` auto-generates these utilities.
   * Set to true if you need explicit safelist for dynamic class names.
   * @default false
   */
  safelistColors?: boolean;

  /**
   * Override auto-detected Tailwind version.
   * When omitted, the library auto-detects from the installed tailwindcss package.
   */
  tailwindVersion?: 3 | 4;

  /**
   * Enable responsive class generation in safelist and spacing CSS rules.
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

  // --- Spacing (CSS custom properties, zero safelist) ---

  /**
   * Spacing configuration. Uses CSS custom properties instead of safelist.
   * Plugin generates fixed `.sp-*` utility classes with `var()` fallback chains.
   */
  spacing?: {
    /** Disable spacing CSS rule generation entirely. Defaults to true. */
    enabled?: boolean;
    /** Override or extend the default spacing property-to-CSS mapping. */
    properties?: SpacingPropertyMap;
    /**
     * Enable matchUtilities for JIT arbitrary value support (sp-p-4, sp-p-[24px]).
     * Static .sp-p classes remain active in parallel.
     * @default false
     */
    useMatchUtilities?: boolean;
  };

  // --- Module configs (safelist-based) ---

  /** Layout classes config (hidden, flex, items-center, etc.). */
  layout?: ModuleConfig<string>;
  /** Border width config. */
  border?: ModuleConfig<number>;
  /** Border radius config. */
  rounded?: ModuleConfig<string>;
  /** Opacity config. */
  opacity?: ModuleConfig<number>;
  /** Z-index config. */
  zIndex?: ModuleConfig;

  /**
   * Extra dynamic classes to add to safelist.
   * Use for classes that are constructed at runtime and cannot be scanned by Tailwind.
   */
  dynamicClasses?: string[];

  /**
   * List of modules that should have responsive variants in the safelist.
   * @default ["layout", "rounded"]
   */
  responsiveModules?: StyleModule[];

  /**
   * @deprecated Use individual module configs instead (spacing, layout, border, rounded, etc.).
   */
  modules?: StyleModule[];
}

// TailwindPlugin type is defined close to the factory that creates it
// (`createStylePlugin.ts`) using ReturnType<typeof plugin>. It is re-used
// from there instead of being defined here to avoid coupling to Tailwind internals.
