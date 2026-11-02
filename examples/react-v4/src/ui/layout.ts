import {
  splitSpacingProps,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import {
  BOX_VARIANT_KEYS,
  type RecipeFn,
  type RecipeTokens,
} from "design-system-example/recipes";
import type { CSSProperties } from "react";

/** Every `tokens.spacingProperties` key, camelCased: a number or `{ base, <bp> }`. */
export type ThemeSpacingProps<W extends RecipeTokens> = SpacingProps<
  W["breakpoints"][number],
  W["spacingProperties"][number]
>;

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

export interface Split {
  readonly className: string;
  readonly style: Readonly<Record<string, string | number>>;
  readonly variants: Readonly<Record<string, string | boolean | undefined>>;
  readonly rest: Readonly<Record<string, unknown>>;
}

const VARIANTS: ReadonlySet<string> = new Set(BOX_VARIANT_KEYS);
const SIZES: ReadonlySet<string> = new Set([
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
]);

/** Spacing props → `.sp-*` classes + `--sg-sp-*` style (the library's `splitSpacingProps`); the rest passes through. */
export const splitSpacing = (props: object, keys: readonly string[]): Split => {
  const { spacing, rest } = splitSpacingProps(
    props as SpacingProps & Record<string, unknown>,
    keys,
  );
  return {
    className: spacing.className,
    style: spacing.style,
    variants: {},
    rest,
  };
};

/** Layout props → box-recipe classes (`extra` variants win), size style and spacing; the rest passes through. */
export const splitLayout = (
  props: object,
  box: RecipeFn,
  spacingKeys: readonly string[],
  extra: Readonly<Record<string, string | boolean>> = {},
): Split => {
  const variants: Record<string, string | boolean | undefined> = {};
  const size: Record<string, string | number> = {};
  const remaining: Record<string, unknown> = {};
  const entries: [string, unknown][] = Object.entries(props);
  for (const [key, value] of entries) {
    if (VARIANTS.has(key)) {
      variants[key] = typeof value === "string" ? value : undefined;
    } else if (SIZES.has(key)) {
      if (typeof value === "string" || typeof value === "number") {
        size[key] = value;
      }
    } else {
      remaining[key] = value;
    }
  }
  Object.assign(variants, extra);
  const spacing = splitSpacing(remaining, spacingKeys);
  return {
    className: [box(variants), spacing.className]
      .filter((c) => c !== "")
      .join(" "),
    style: { ...size, ...spacing.style },
    variants,
    rest: spacing.rest,
  };
};

/** The parts merged left to right; `undefined` when empty so React renders no `style=""`. */
export const mergeStyle = (
  ...parts: readonly (
    | CSSProperties
    | Readonly<Record<string, string | number>>
    | undefined
  )[]
): CSSProperties | undefined => {
  const merged: CSSProperties = {};
  for (const part of parts) Object.assign(merged, part);
  return Object.keys(merged).length === 0 ? undefined : merged;
};
