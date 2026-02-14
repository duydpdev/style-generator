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

export interface StyleGeneratorOptions {
  /**
   * Defines the breakpoints to use.
   * If provided, only these keys will be used generated in safelist and theme screens.
   * If not provided, all available screens (default + custom) will be used.
   * @default ["md", "lg"] // for safelist generation usually
   */
  breakpoints?: (Breakpoint | string)[];

  /**
   * Custom screens map to override defaults or add new ones.
   * Example: { md: "800px", "3xl": "1920px" }
   */
  screens?: Record<Breakpoint | string, string>;

  /**
   * List of modules to generate safelist for.
   * If not provided, all modules will be generated.
   */
  modules?: StyleModule[];

  /**
   * List of modules to generate responsive classes for.
   * If provided, only these modules will have responsive variations (e.g. md:m-4).
   * If not provided, specific defaults will be used to optimize size (usually ["spacing", "layout", "typography"]).
   */
  responsiveModules?: StyleModule[];
}
