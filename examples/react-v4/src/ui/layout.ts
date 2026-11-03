import type {
  RecipeTokens,
  ThemeSpacingProps,
} from "@duydpdev/style-generator/ui";

/** Inline size: a number is px (as React does), a string is any CSS length. */
type Size = number | string;

/** Layout props of Box, Flex, Stack and Grid: box-recipe variants, sizes, spacing. */
export type LayoutProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly backgroundColor?: W["colors"][number] | undefined;
  readonly borderColor?: W["colors"][number] | undefined;
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
