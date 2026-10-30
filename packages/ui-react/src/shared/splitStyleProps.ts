import {
  splitSpacingProps,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import { BOX_VARIANT_KEYS } from "design-system-example/recipes";
import type { CSSProperties } from "react";

/** A bound recipe as bodies see it; method syntax keeps every `RecipeFn` assignable. */
export type BodyRecipe = {
  bivarianceHack(props?: Readonly<Record<string, unknown>>): string;
}["bivarianceHack"];

/** Layout props that become inline style (`number` → px, as React does). */
export const SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

export interface SpacingSplit {
  readonly className: string;
  readonly style: CSSProperties;
  readonly rest: Readonly<Record<string, unknown>>;
}

export interface StyleSplit extends SpacingSplit {
  readonly variants: Readonly<Record<string, unknown>>;
}

const VARIANT_SET: ReadonlySet<string> = new Set(BOX_VARIANT_KEYS);
const SIZE_SET: ReadonlySet<string> = new Set(SIZE_KEYS);

/** Spacing props → `.sp-*` classes + `--sg-sp-*` style (the library's `splitSpacingProps`). */
export const splitSpacing = (
  props: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): SpacingSplit => {
  const { spacing, rest } = splitSpacingProps(
    props as SpacingProps & Record<string, unknown>,
    keys,
  );
  return {
    className: spacing.className,
    style: spacing.style as CSSProperties,
    rest,
  };
};

/** Layout props → box-recipe classes, size style and spacing; `extra` variants override (Box's innerBorder). */
export const splitStyleProps = (
  props: Readonly<Record<string, unknown>>,
  box: BodyRecipe,
  spacingKeys: readonly string[],
  extra: Readonly<Record<string, unknown>> = {},
): StyleSplit => {
  const variants: Record<string, unknown> = {};
  const size: Record<string, unknown> = {};
  const remaining: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (VARIANT_SET.has(key)) variants[key] = value;
    else if (SIZE_SET.has(key)) {
      if (value !== undefined) size[key] = value;
    } else remaining[key] = value;
  }
  Object.assign(variants, extra);
  const spacing = splitSpacing(remaining, spacingKeys);
  return {
    className: [box(variants), spacing.className]
      .filter((c) => c !== "")
      .join(" "),
    style: { ...(size as CSSProperties), ...spacing.style },
    variants,
    rest: spacing.rest,
  };
};

/** `a` then `b` (b wins); `undefined` when empty so React renders no `style=""`. */
export const mergeStyle = (
  a: CSSProperties,
  b: CSSProperties | undefined,
): CSSProperties | undefined => {
  const merged = { ...a, ...b };
  return Object.keys(merged).length === 0 ? undefined : merged;
};
