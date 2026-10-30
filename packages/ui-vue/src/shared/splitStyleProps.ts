import {
  splitSpacingProps,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import {
  BOX_VARIANT_KEYS,
  type RecipeFn,
  type RecipeProps,
} from "design-system-example/recipes";

import { toCssSize } from "./vueProps";

/** Layout props that become inline style (`number` → px). */
export const SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

export type StyleRecord = Record<string, string>;

export interface SpacingSplit {
  readonly className: string;
  readonly style: StyleRecord;
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
): SpacingSplit =>
  splitSpacingProps(props as SpacingProps & Record<string, unknown>, keys)
    .spacing;

/** Layout props → box-recipe classes, size style and spacing; `extra` variants override (Box's innerBorder). */
export const splitStyleProps = (
  props: Readonly<Record<string, unknown>>,
  box: RecipeFn,
  spacingKeys: readonly string[],
  extra: Readonly<Record<string, unknown>> = {},
): StyleSplit => {
  const variants: Record<string, unknown> = {};
  const size: StyleRecord = {};
  const remaining: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (VARIANT_SET.has(key)) variants[key] = value;
    else if (SIZE_SET.has(key)) {
      const css = toCssSize(value as number | string | undefined);
      if (css !== undefined) size[key] = css;
    } else remaining[key] = value;
  }
  Object.assign(variants, extra);
  const spacing = splitSpacing(remaining, spacingKeys);
  return {
    className: [box(variants as RecipeProps), spacing.className]
      .filter((c) => c !== "")
      .join(" "),
    style: { ...size, ...spacing.style },
    variants,
  };
};

/** `undefined` when empty, so Vue renders no `class=""`. */
export const orUndefined = (value: string): string | undefined =>
  value === "" ? undefined : value;

/** `class` and `style` attributes for a root element; empty ones are left out so Vue renders no `class=""`/`style=""`. */
export const rootAttrs = (
  className: string,
  style?: StyleRecord,
): { class?: string; style?: StyleRecord } => ({
  ...(className === "" ? {} : { class: className }),
  ...(style && Object.keys(style).length > 0 ? { style } : {}),
});
