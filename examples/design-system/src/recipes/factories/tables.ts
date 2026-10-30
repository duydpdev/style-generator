import { cva } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { ClassValue } from "clsx";

/** The token arrays a factory reads: a structural subset of `DesignTokens.Web`. */
export interface RecipeTokens {
  readonly colors: readonly string[];
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backDropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
  readonly spacingProperties: readonly string[];
  readonly breakpoints: readonly string[];
}

/** Variant name → option → classes. */
export type VariantTable = Record<string, Record<string, ClassValue>>;

/** A recipe as plain data: the cva input, also walked by ui-react's Tailwind coverage test. */
export interface RecipeTables {
  readonly base: ClassValue;
  readonly variants: VariantTable;
  readonly compoundVariants?:
    | readonly Readonly<Record<string, ClassValue>>[]
    | undefined;
  readonly defaultVariants?:
    | Readonly<Record<string, string | boolean | undefined>>
    | undefined;
}

/** Recipe call props: variant name → option (`true`/`false` for boolean variants). */
export type RecipeProps = Readonly<
  Record<string, string | boolean | null | undefined>
>;

/** A recipe built from tables; bound modules and ui-react type the exact props. */
export type RecipeFn = (props?: RecipeProps) => string;

/** cva over a factory's tables; compound and default entries are loose, so they are cast here once. */
export const recipeFromTables = (tables: RecipeTables): RecipeFn =>
  cva<VariantTable>(tables.base, {
    variants: tables.variants,
    compoundVariants: tables.compoundVariants as never,
    defaultVariants: tables.defaultVariants as never,
  }) as RecipeFn;

/** `map[key]`, or a thrown error naming the missing token (never `undefined`). */
export const pick = (map: object, key: string): string => {
  const value: unknown = (map as Readonly<Record<string, unknown>>)[key];
  if (typeof value !== "string")
    throw new Error(`recipe: no class for token "${key}"`);
  return value;
};

/** `border-<key>` from the theme's borderWidth tokens, or Tailwind's `border` (1px) when `key` is omitted. */
export const borderWidthClass = (
  widths: readonly string[],
  key: string | undefined,
): string =>
  key === undefined
    ? "border"
    : pick(createVariantMapper("border", widths), key);

/** `text-on-<intent>` when the theme declares the `on<Intent>` sibling, else `text-<fallback>`. */
export const contrastText = (
  colors: readonly string[],
  intent: string,
  fallback: string,
): string => {
  const on = `on${intent.charAt(0).toUpperCase()}${intent.slice(1)}`;
  return pick(
    createVariantMapper("text", colors),
    colors.includes(on) ? on : fallback,
  );
};
