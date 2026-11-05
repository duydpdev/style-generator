import type {
  BoxAspect,
  BoxCursor,
  BoxDisplay,
  BoxObjectFit,
  BoxOpacity,
  BoxOverflow,
  BoxPointerEvents,
  BoxSelect,
  BoxTransition,
  BoxVisibility,
  BoxZIndex,
} from "design-system-example/recipes";
import type {
  RecipeTokens,
  ThemeSpacingProps,
} from "@duydpdev/style-generator/ui";

/** Inline size: a number is px (as React does), a string is any CSS length. */
type Size = number | string;

/** A color token, or `token/step` with a step from `coverage.colors.opacities` (`tokens.opacities`). */
export type ColorValue<W extends RecipeTokens> =
  | W["colors"][number]
  | `${W["colors"][number]}/${NonNullable<W["opacities"]>[number]}`;

/** Layout props of Box, Flex, Stack and Grid: box-recipe variants (colors take `token` or `token/step`), sizes, spacing. */
export type LayoutProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly backgroundColor?: ColorValue<W> | undefined;
  readonly borderColor?: ColorValue<W> | undefined;
  readonly border?: W["borderWidth"][number] | undefined;
  readonly borderX?: W["borderWidth"][number] | undefined;
  readonly borderY?: W["borderWidth"][number] | undefined;
  readonly borderT?: W["borderWidth"][number] | undefined;
  readonly borderB?: W["borderWidth"][number] | undefined;
  readonly borderL?: W["borderWidth"][number] | undefined;
  readonly borderR?: W["borderWidth"][number] | undefined;
  readonly rounded?: W["borderRadius"][number] | undefined;
  readonly roundedT?: W["borderRadius"][number] | undefined;
  readonly roundedB?: W["borderRadius"][number] | undefined;
  readonly roundedL?: W["borderRadius"][number] | undefined;
  readonly roundedR?: W["borderRadius"][number] | undefined;
  readonly shadow?: W["shadows"][number] | undefined;
  readonly backdropBlur?: W["backDropBlurs"][number] | undefined;
  readonly position?: "absolute" | "relative" | "fixed" | "sticky" | undefined;
  readonly display?: BoxDisplay | undefined;
  readonly overflow?: BoxOverflow | undefined;
  readonly zIndex?: BoxZIndex | undefined;
  readonly opacity?: BoxOpacity | undefined;
  readonly cursor?: BoxCursor | undefined;
  readonly pointerEvents?: BoxPointerEvents | undefined;
  readonly select?: BoxSelect | undefined;
  readonly transition?: BoxTransition | undefined;
  readonly aspect?: BoxAspect | undefined;
  readonly objectFit?: BoxObjectFit | undefined;
  readonly visibility?: BoxVisibility | undefined;
  readonly ringColor?: ColorValue<W> | undefined;
  readonly outlineColor?: ColorValue<W> | undefined;
  readonly width?: Size | undefined;
  readonly height?: Size | undefined;
  readonly minWidth?: Size | undefined;
  readonly minHeight?: Size | undefined;
  readonly maxWidth?: Size | undefined;
  readonly maxHeight?: Size | undefined;
};

/** The `LayoutProps` keys `splitLayout` turns into inline size style (the kit normalises numbers to px). */
export const LAYOUT_SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;
