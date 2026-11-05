import type { VariantProps } from "class-variance-authority";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type ColorValue, type Theme } from "../tokens";

import { createTextRecipe, type TextPreset } from "./factories/text";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;
export const textTransform = [
  "uppercase",
  "lowercase",
  "capitalize",
  "normalCase",
] as const;
export const textLineClamp = [1, 2, 3, 4, 5, 6, "none"] as const;
export const textWrap = ["wrap", "nowrap", "balance", "pretty"] as const;

/** Design-system text defaults; `<Text>` applies them when `type`/`color` are omitted. */
export const textPreset = {
  base: "wrap-anywhere whitespace-pre-wrap",
  defaultType: "text16Medium",
  defaultColor: "foreground",
} as const satisfies TextPreset & {
  readonly defaultType: TextVariant<Theme>;
  readonly defaultColor: ColorVariant<Theme>;
};

/** Props of the bound text recipe. */
export type TextRecipeProps = Readonly<{
  type?: TextVariant<Theme> | null | undefined;
  color?: ColorValue | null | undefined;
  decoration?: (typeof textDecoration)[number] | null | undefined;
  align?: (typeof textAlign)[number] | null | undefined;
  transform?: (typeof textTransform)[number] | null | undefined;
  italic?: boolean | null | undefined;
  truncate?: boolean | null | undefined;
  lineClamp?: (typeof textLineClamp)[number] | null | undefined;
  wrap?: (typeof textWrap)[number] | null | undefined;
}>;

/**
 * Headless text recipe: `textRecipe({ type, color, decoration, align,
 * transform, italic, truncate, lineClamp, wrap })`. `type` is a typography
 * utility (`text-16-medium`), `color` a `text-*` color or `token/step`
 * (`primary/50`); `truncate` also sets `whitespace-nowrap` (do not combine
 * it with `lineClamp`).
 */
export const textRecipe: (props?: TextRecipeProps) => string = createTextRecipe(
  tokens,
  textPreset,
);

export type TextVariants = VariantProps<typeof textRecipe>;

/** Props a framework `Text` component adds on top of the element's own props. */
export interface TextStyleProps {
  type?: TextVariant<Theme>;
  color?: ColorValue;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
  transform?: (typeof textTransform)[number];
  italic?: boolean;
  truncate?: boolean;
  lineClamp?: (typeof textLineClamp)[number];
  wrap?: (typeof textWrap)[number];
}
