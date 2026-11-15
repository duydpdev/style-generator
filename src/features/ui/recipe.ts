import { cva } from "class-variance-authority";
import type { ClassValue } from "clsx";

import { createVariantMapper } from "../cva/createVariantMapper";

/**
 * The token arrays a recipe factory reads: a structural subset of
 * `DesignTokens.Web`, so `generate().tokens.Web` and
 * `createDesignTokens().DesignTokens.Web` are assignable to it.
 */
export interface RecipeTokens {
  readonly colors: readonly string[];
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backdropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
  readonly spacingProperties: readonly string[];
  readonly breakpoints: readonly string[];
  /** `DesignTokens.Web.opacities`; optional so a token object without it still fits. */
  readonly opacities?: readonly number[];
}

/** Variant name → option → classes (the `variants` of a cva config). */
export type VariantTable = Record<string, Record<string, ClassValue>>;

/** A recipe as plain data: the cva input. */
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

/** Recipe call props: variant name → option (`true`/`false` for boolean variants, a number for a numeric option such as `zIndex: 10`). */
export type RecipeProps = Readonly<
  Record<string, string | number | boolean | null | undefined>
>;

type VariantOptionValue<O> = O extends "true" | "false"
  ? boolean
  : O extends string | number
    ? O
    : never;

/** Call props of a recipe: every variant name of `T`, its option keys as values (`"true"`/`"false"` keys mean boolean). */
export type RecipeVariantProps<T extends RecipeTables> = Readonly<{
  [K in keyof T["variants"]]?:
    | VariantOptionValue<keyof T["variants"][K]>
    | boolean
    | number
    | null
    | undefined;
}>;

/** A recipe built from tables: props in, one class string out; `RecipeFn<T>` knows the variant names of its tables `T`. */
export type RecipeFn<T extends RecipeTables = RecipeTables> = (
  props?: RecipeVariantProps<T>,
) => string;

/**
 * cva over a recipe's tables. Compound and default entries are loose
 * records, so they are cast here once instead of in every recipe.
 * @template T - The tables type; its variant names type the recipe's props
 * @param {T} tables - Base classes, variants, compound and default variants
 * @returns {RecipeFn<T>} The recipe
 */
export const recipeFromTables = <T extends RecipeTables>(
  tables: T,
): RecipeFn<T> =>
  cva<VariantTable>(tables.base, {
    variants: tables.variants,
    compoundVariants: tables.compoundVariants as never,
    defaultVariants: tables.defaultVariants as never,
  }) as RecipeFn<T>;

/**
 * `map[key]`, or a thrown error naming the missing token, so a renamed
 * theme token fails loudly instead of rendering no class.
 * @param {object} map - A class map, for example from `createVariantMapper`
 * @param {string} key - The token key
 * @returns {string} The class
 */
export const pick = (map: object, key: string): string => {
  const value: unknown = (map as Readonly<Record<string, unknown>>)[key];
  if (typeof value !== "string")
    throw new Error(`recipe: no class for token "${key}"`);
  return value;
};

/**
 * `text-on-<intent>` when the theme declares the `on<Intent>` sibling
 * color, else `text-<fallback>`.
 * @param {readonly string[]} colors - The theme's `colors` tokens
 * @param {string} intent - A color key (`primary`)
 * @param {string} fallback - The color key used when `on<Intent>` is missing
 * @returns {string} The text color class
 */
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
