import type { SpacingProps } from "@duydpdev/style-generator/recipes";
import type { PropType } from "vue";

import type {
  BlurKey,
  BorderWidthKey,
  BreakpointKey,
  ColorKey,
  RadiusKey,
  ShadowKey,
  SpacingPropertyKey,
  UiTokens,
} from "./types";

/** One runtime prop: typed by `PropType`, absent means `undefined` (never `false`/`0`). */
export interface PropDef<T> {
  readonly type: PropType<T>;
  readonly default: undefined;
}

export type ControlSize = "sm" | "md" | "lg";

/** Inline size: a number is px (as React does), a string is any CSS length. */
export type LayoutSize = number | string;

/** Every key of `tokens.spacingProperties`, camelCased: a number or `{ base, <bp> }`. */
export type UiSpacingProps<W extends UiTokens> = SpacingProps<
  BreakpointKey<W>,
  SpacingPropertyKey<W>
>;

export type SpacingPropDefs<W extends UiTokens> = {
  readonly [K in keyof UiSpacingProps<W>]-?: PropDef<UiSpacingProps<W>[K]>;
};

/** Layout props that are not `position` (List uses `position` for its list-style). */
export interface LayoutBasePropDefs<W extends UiTokens> {
  readonly backgroundColor: PropDef<ColorKey<W>>;
  readonly borderColor: PropDef<ColorKey<W>>;
  readonly border: PropDef<BorderWidthKey<W>>;
  readonly borderX: PropDef<BorderWidthKey<W>>;
  readonly borderY: PropDef<BorderWidthKey<W>>;
  readonly borderT: PropDef<BorderWidthKey<W>>;
  readonly borderB: PropDef<BorderWidthKey<W>>;
  readonly borderL: PropDef<BorderWidthKey<W>>;
  readonly borderR: PropDef<BorderWidthKey<W>>;
  readonly rounded: PropDef<RadiusKey<W>>;
  readonly roundedT: PropDef<RadiusKey<W>>;
  readonly roundedB: PropDef<RadiusKey<W>>;
  readonly roundedL: PropDef<RadiusKey<W>>;
  readonly roundedR: PropDef<RadiusKey<W>>;
  readonly shadow: PropDef<ShadowKey<W>>;
  readonly backdropBlur: PropDef<BlurKey<W>>;
  readonly width: PropDef<LayoutSize>;
  readonly height: PropDef<LayoutSize>;
  readonly minWidth: PropDef<LayoutSize>;
  readonly minHeight: PropDef<LayoutSize>;
  readonly maxWidth: PropDef<LayoutSize>;
  readonly maxHeight: PropDef<LayoutSize>;
}

export interface LayoutPropDefs<
  W extends UiTokens,
> extends LayoutBasePropDefs<W> {
  readonly position: PropDef<"absolute" | "relative" | "fixed" | "sticky">;
}

const def = <T>(type: PropType<T>): PropDef<T> => ({
  type,
  default: undefined,
});

/** A string-literal-union prop typed by `T` (a theme key list). */
export const stringProp = <T extends string>(): PropDef<T> =>
  def<T>(String as unknown as PropType<T>);
const size = (): PropDef<LayoutSize> => def<LayoutSize>([Number, String]);

export const layoutBaseProps = <
  W extends UiTokens,
>(): LayoutBasePropDefs<W> => ({
  backgroundColor: stringProp(),
  borderColor: stringProp(),
  border: stringProp(),
  borderX: stringProp(),
  borderY: stringProp(),
  borderT: stringProp(),
  borderB: stringProp(),
  borderL: stringProp(),
  borderR: stringProp(),
  rounded: stringProp(),
  roundedT: stringProp(),
  roundedB: stringProp(),
  roundedL: stringProp(),
  roundedR: stringProp(),
  shadow: stringProp(),
  backdropBlur: stringProp(),
  width: size(),
  height: size(),
  minWidth: size(),
  minHeight: size(),
  maxWidth: size(),
  maxHeight: size(),
});

export const layoutProps = <W extends UiTokens>(): LayoutPropDefs<W> => ({
  ...layoutBaseProps<W>(),
  position: stringProp(),
});

const camelCase = (key: string): string =>
  key.replaceAll(/-(.)/g, (_, c: string) => c.toUpperCase());

/**
 * Runtime props for the spacing utilities: one prop per `tokens.spacingProperties`
 * entry, camelCased the way `splitSpacingProps` reads them. `omit` drops names
 * a component does not take (Container has no horizontal margins).
 */
export const spacingProps = <
  W extends UiTokens,
  const O extends string = never,
>(
  keys: readonly string[],
  omit: readonly O[] = [],
): Omit<SpacingPropDefs<W>, O> => {
  const skipped = new Set<string>(omit);
  const spacing = def<number | object>([Number, Object]);
  return Object.fromEntries(
    keys.map(camelCase).flatMap((k) => (skipped.has(k) ? [] : [[k, spacing]])),
  ) as Omit<SpacingPropDefs<W>, O>;
};

/** A number becomes `${String(value)}px`; a string passes through. */
export const toCssSize = (
  value: number | string | undefined,
): string | undefined =>
  typeof value === "number" ? `${String(value)}px` : value;
