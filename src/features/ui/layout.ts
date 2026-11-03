import { splitSpacingProps, type SpacingProps } from "../recipes/spacingProps";

import type { RecipeFn, RecipeTokens } from "./recipe";

/** An inline style object: property (or `--custom-property`) → value. React accepts it as `style`. */
export type StyleRecord = Readonly<Record<string, string | number>>;

/**
 * Every `tokens.spacingProperties` key, camelCased: a number or
 * `{ base, <bp> }` over `tokens.breakpoints`.
 * @template W - The theme's tokens
 */
export type ThemeSpacingProps<W extends RecipeTokens> = SpacingProps<
  W["breakpoints"][number],
  W["spacingProperties"][number]
>;

/** The result of `splitSpacing`/`splitLayout`: classes, inline style, the variant props found, and the props left for the element. */
export interface Split {
  readonly className: string;
  readonly style: StyleRecord;
  readonly variants: Readonly<Record<string, string | boolean | undefined>>;
  readonly rest: Readonly<Record<string, unknown>>;
}

/**
 * A size prop as a CSS length: a string is kept, a finite number `n`
 * becomes `"<n>px"` and `0` becomes `"0"` (what React renders for the
 * same value in `style`); anything else is dropped.
 * @param {unknown} value - A size prop value
 * @returns {string | undefined} The CSS value, or `undefined` when the value is not a size
 */
const cssSize = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value === 0 ? "0" : `${String(value)}px`;
  }
  return undefined;
};

/**
 * Spacing props → `.sp-*` classes + `--sg-sp-*` style (the library's
 * `splitSpacingProps`); the rest passes through.
 * @param {object} props - Component props
 * @param {readonly string[]} keys - Spacing property names (`tokens.spacingProperties`)
 * @returns {Split} Classes, style, no variants, and the remaining props
 */
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

/**
 * Layout props → box-recipe classes, size style and spacing; the rest
 * passes through. A key in `variantKeys` is a recipe variant (a
 * non-string value becomes `undefined`); a key in `sizeKeys` is an
 * inline size: a string is kept, a finite number `n` becomes `"<n>px"`
 * (`0` becomes `"0"`), anything else is dropped. `extra` variants win
 * over props.
 * @param {object} props - Component props
 * @param {RecipeFn} box - The box recipe
 * @param {readonly string[]} spacingKeys - Spacing property names (`tokens.spacingProperties`)
 * @param {readonly string[]} variantKeys - Prop names that are box-recipe variants
 * @param {readonly string[]} sizeKeys - Prop names that are inline sizes (`width`, `minHeight`, …)
 * @param {Readonly<Record<string, string | boolean>>} extra - Variants set by the component itself
 * @returns {Split} Classes, style, the variants passed to `box`, and the remaining props
 */
export const splitLayout = (
  props: object,
  box: RecipeFn,
  spacingKeys: readonly string[],
  variantKeys: readonly string[],
  sizeKeys: readonly string[],
  extra: Readonly<Record<string, string | boolean>> = {},
): Split => {
  const variants: Record<string, string | boolean | undefined> = {};
  const size: Record<string, string> = {};
  const remaining: Record<string, unknown> = {};
  const entries: [string, unknown][] = Object.entries(props);
  for (const [key, value] of entries) {
    if (variantKeys.includes(key)) {
      variants[key] = typeof value === "string" ? value : undefined;
    } else if (sizeKeys.includes(key)) {
      const css = cssSize(value);
      if (css !== undefined) size[key] = css;
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

/**
 * The parts merged left to right; `undefined` when empty, so React
 * renders no `style=""`.
 * @template S - The style object type of the caller (`CSSProperties` in React)
 * @param {readonly (S | StyleRecord | undefined)[]} parts - Style objects, later ones win
 * @returns {S | undefined} The merged style, or `undefined` when it has no key
 */
export const mergeStyle = <S extends object = StyleRecord>(
  ...parts: readonly (S | StyleRecord | undefined)[]
): S | undefined => {
  const merged: Record<string, unknown> = {};
  for (const part of parts) Object.assign(merged, part);
  return Object.keys(merged).length === 0
    ? undefined
    : (merged as unknown as S);
};
