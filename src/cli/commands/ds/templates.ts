/** The cover page with `{{...}}` placeholders, filled by `renderCover`. */
export const COVER_TEMPLATE = `<!-- @dsCard height=288 -->
<style>
  html,
  body {
    margin: 0;
    background: var({{v:background}});
  }
  .cover {
    position: relative;
    width: 960px;
    height: 288px;
    overflow: hidden;
  }
  .cover svg {
    position: absolute;
    inset: 0;
  }
  .b-primary {
    fill: var({{v:primary}});
  }
  .b-ink {
    fill: var({{v:foreground}});
  }
  .b-success {
    fill: var({{v:success}});
  }
  .b-warning {
    fill: var({{v:warning}});
  }
  .name {
    position: absolute;
    left: 48px;
    bottom: 48px;
    max-width: 440px;
    margin: 0;
    color: var({{v:foreground}});
  }
</style>
<div class="cover">
  <svg width="960" height="288" viewBox="0 0 960 288" aria-hidden="true">
    <!--
      blocks: primary 192x224, foreground 256x96, success 128x160, warning 112x96
      arrangement: one tall primary slab with satellites, bleeding off the top, right and bottom edges, all right of x = 480
      pattern: none; a generic producer template knows no brand motif, so the cover is the name and the semantic hues
      steps and radii: sides and gaps in 16px steps; square corners, so the cover needs no radius token
    -->
    <rect class="b-primary" x="512" y="-16" width="192" height="224" />
    <rect class="b-ink" x="720" y="32" width="256" height="96" />
    <rect class="b-success" x="720" y="144" width="128" height="160" />
    <rect class="b-warning" x="864" y="144" width="112" height="96" />
  </svg>
  <p class="name {{titleClass}}">{{name}}</p>
</div>
`;

/** The components' typings with `{{...}}` placeholders, filled from the theme and the presets. */
export const INDEX_DTS_TEMPLATE = `// window.{{namespace}} — the harness's six sample components bound to
// {{themeFile}} (examples/harness/src/ui.ts). Types are documentation:
// token unions spell this theme's keys (camelCase, as in theme.json).
import type { CSSProperties, ElementType, ReactNode, JSX, ComponentPropsWithoutRef } from "react";

export type ColorToken = {{ColorToken}};
/** A colour token, or \`token/step\` with a step from \`coverage.colors.opacities\`. */
export type ColorValue = {{ColorValue}};
export type TypographyToken = {{TypographyToken}};
export type RadiusToken = {{RadiusToken}};
export type ShadowToken = {{ShadowToken}};
export type BlurToken = {{BlurToken}};
export type BorderWidthToken = {{BorderWidthToken}};
export type Breakpoint = {{Breakpoint}};

/** A Tailwind spacing step (\`4\` = 1rem), or one per breakpoint: \`{ base: 2, md: 4 }\`. */
export type SpacingValue = number | { {{SpacingBreakpoints}} };
/** Spacing props: compile to \`.sp-*\` utilities over \`--sg-sp-*\` variables. */
export interface SpacingProps {
  p?: SpacingValue;
  px?: SpacingValue;
  py?: SpacingValue;
  pt?: SpacingValue;
  pb?: SpacingValue;
  pl?: SpacingValue;
  pr?: SpacingValue;
  m?: SpacingValue;
  mx?: SpacingValue;
  my?: SpacingValue;
  mt?: SpacingValue;
  mb?: SpacingValue;
  ml?: SpacingValue;
  mr?: SpacingValue;
  gap?: SpacingValue;
  gapX?: SpacingValue;
  gapY?: SpacingValue;
  top?: SpacingValue;
  right?: SpacingValue;
  bottom?: SpacingValue;
  left?: SpacingValue;
}

/** \`as\` picks the element; the element's own props pass through. */
export type Polymorphic<T extends ElementType, P> = P & { as?: T } & Omit<ComponentPropsWithoutRef<T>, keyof P | "as">;

export interface LayoutProps extends SpacingProps {
  backgroundColor?: ColorValue;
  borderColor?: ColorValue;
  ringColor?: ColorValue;
  outlineColor?: ColorValue;
  border?: BorderWidthToken;
  borderX?: BorderWidthToken;
  borderY?: BorderWidthToken;
  borderT?: BorderWidthToken;
  borderB?: BorderWidthToken;
  borderL?: BorderWidthToken;
  borderR?: BorderWidthToken;
  rounded?: RadiusToken;
  roundedT?: RadiusToken;
  roundedB?: RadiusToken;
  roundedL?: RadiusToken;
  roundedR?: RadiusToken;
  shadow?: ShadowToken;
  backdropBlur?: BlurToken;
  position?: "absolute" | "relative" | "fixed" | "sticky";
  display?: "block" | "inlineBlock" | "inline" | "flex" | "inlineFlex" | "grid" | "contents" | "hidden";
  overflow?: "auto" | "hidden" | "clip" | "visible" | "scroll";
  zIndex?: 0 | 10 | 20 | 30 | 40 | 50 | "auto";
  opacity?: 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
  cursor?: "auto" | "default" | "pointer" | "notAllowed" | "grab" | "grabbing" | "text" | "move";
  pointerEvents?: "none" | "auto";
  select?: "none" | "text" | "all" | "auto";
  transition?: "none" | "all" | "colors" | "opacity" | "shadow" | "transform";
  aspect?: "auto" | "square" | "video";
  objectFit?: "contain" | "cover" | "fill" | "none" | "scaleDown";
  visibility?: "visible" | "invisible" | "collapse";
  /** A number is px, a string any CSS length. */
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

type FlexAlign = "start" | "center" | "end" | "stretch";
type FlexJustify = "start" | "center" | "end" | "between";

export interface BoxProps extends LayoutProps {
  /** A 1px frame drawn by an overlay span instead of the element's border. */
  innerBorder?: boolean;
}
export interface TextProps extends SpacingProps {
  /** Default \`{{defaultType}}\`. */
  type?: TypographyToken;
  /** Default \`{{defaultColor}}\`. */
  color?: ColorValue;
  align?: "left" | "center" | "right";
  decoration?: "underline" | "lineThrough" | "none";
  transform?: "uppercase" | "lowercase" | "capitalize" | "normalCase";
  italic?: boolean;
  /** Also sets \`whitespace-nowrap\`; do not combine with \`lineClamp\`. */
  truncate?: boolean;
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6 | "none";
  wrap?: "wrap" | "nowrap" | "balance" | "pretty";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
export interface StackProps extends LayoutProps {
  /** Default \`column\`. */
  direction?: "row" | "column";
  align?: FlexAlign;
  justify?: FlexJustify;
  wrap?: boolean;
  divideColor?: ColorValue;
}
export interface FlexProps extends StackProps {
  grow?: boolean;
  shrink?: boolean;
  basis?: 0 | "auto" | "full" | "1/2" | "1/3" | "2/3" | "1/4" | "3/4";
}
export interface GridProps extends LayoutProps {
  /** A count or a track list, per breakpoint (\`base\`, \`sm\`, \`md\`, \`lg\`, \`xl\`, \`2xl\`). */
  columns?: number | string | Partial<Record<"base" | "sm" | "md" | "lg" | "xl" | "2xl", number | string>>;
  align?: FlexAlign;
  justify?: FlexJustify;
  flow?: "row" | "column" | "dense";
  rows?: number | string;
}
export interface ButtonProps extends SpacingProps {
  /** Default \`solid\`. */
  variant?: "solid" | "outline" | "soft" | "ghost" | "link";
  /** Default \`{{defaultIntent}}\`. */
  color?: {{Intent}};
  /** Default \`md\`. \`icon\` is a square at the \`md\` height, for an icon-only button with an \`aria-label\`. */
  size?: "sm" | "md" | "lg" | "icon";
  /** Icon before the label, in a flex slot that centres it. Put icons here, never in \`children\`. Icon only: \`prefix\` alone, no \`children\`, an \`aria-label\`; the button turns square. On a canvas pass a React node: \`prefix="{{ic.plus}}"\`. */
  prefix?: ReactNode;
  /** Icon after the label, in the same centring slot as \`prefix\`. */
  suffix?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** The label; \`false\`, \`null\` and \`""\` count as no label. */
  children?: ReactNode;
}

export declare function Box<T extends ElementType = "div">(props: Polymorphic<T, BoxProps>): JSX.Element;
export declare function Text<T extends ElementType = "p">(props: Polymorphic<T, TextProps>): JSX.Element;
export declare function Stack<T extends ElementType = "div">(props: Polymorphic<T, StackProps>): JSX.Element;
export declare function Flex<T extends ElementType = "div">(props: Polymorphic<T, FlexProps>): JSX.Element;
export declare function Grid<T extends ElementType = "div">(props: Polymorphic<T, GridProps>): JSX.Element;
/** A \`<button>\` gets \`type="button"\` unless one is passed. */
export declare function Button<T extends ElementType = "button">(props: Polymorphic<T, ButtonProps>): JSX.Element;
`;
