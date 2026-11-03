import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens } from "../../theme";

/** Layout props that are recipe variants (the Box variants); `splitLayout` routes them to `layoutRecipe`. */
export const LAYOUT_VARIANT_KEYS = [
  "backgroundColor",
  "borderColor",
  "border",
  "borderX",
  "borderY",
  "borderT",
  "borderB",
  "borderL",
  "borderR",
  "rounded",
  "roundedT",
  "roundedB",
  "roundedL",
  "roundedR",
  "shadow",
  "backdropBlur",
  "position",
] as const;

/** Layout props that become inline `style` (`width`, `min-height`, …); `splitLayout` routes them. */
export const LAYOUT_SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

/** The Box token variants without `relative`, kept in this folder so it copies out alone. */
export const layoutTables = {
  base: "",
  variants: {
    backgroundColor: createVariantMapper("bg", tokens.colors),
    borderColor: createVariantMapper("border", tokens.colors),
    border: createVariantMapper("border", tokens.borderWidth),
    borderX: createVariantMapper("border-x", tokens.borderWidth),
    borderY: createVariantMapper("border-y", tokens.borderWidth),
    borderT: createVariantMapper("border-t", tokens.borderWidth),
    borderB: createVariantMapper("border-b", tokens.borderWidth),
    borderL: createVariantMapper("border-l", tokens.borderWidth),
    borderR: createVariantMapper("border-r", tokens.borderWidth),
    rounded: createVariantMapper("rounded", tokens.borderRadius),
    roundedT: createVariantMapper("rounded-t", tokens.borderRadius),
    roundedB: createVariantMapper("rounded-b", tokens.borderRadius),
    roundedL: createVariantMapper("rounded-l", tokens.borderRadius),
    roundedR: createVariantMapper("rounded-r", tokens.borderRadius),
    shadow: createVariantMapper("shadow", tokens.shadows),
    backdropBlur: createVariantMapper("backdrop-blur", tokens.backDropBlurs),
    position: {
      absolute: "absolute",
      relative: "relative",
      fixed: "fixed",
      sticky: "sticky",
    },
  },
} satisfies RecipeTables;

export const layoutRecipe: RecipeFn = recipeFromTables(layoutTables);

/**
 * Literal per-breakpoint column classes, so Tailwind's scanner sees them;
 * the track list comes from inline CSS variables (`--ui-grid-cols-<bp>`).
 */
export const GRID_COLUMN_CLASSES = {
  base: "grid-cols-(--ui-grid-cols)",
  sm: "sm:grid-cols-(--ui-grid-cols-sm)",
  md: "md:grid-cols-(--ui-grid-cols-md)",
  lg: "lg:grid-cols-(--ui-grid-cols-lg)",
  xl: "xl:grid-cols-(--ui-grid-cols-xl)",
  "2xl": "2xl:grid-cols-(--ui-grid-cols-2xl)",
} as const;

/** `3`, `"72px 1fr"`, or `{ base: 1, md: "220px 1fr" }` (breakpoint keys checked by the sample components' types). */
export type GridColumnsValue =
  | number
  | string
  | Readonly<Record<string, number | string | undefined>>;

export interface GridColumns {
  readonly className: string;
  readonly style: Readonly<Record<string, string>>;
}

const known: Readonly<Record<string, string>> = GRID_COLUMN_CLASSES;

/** A count → `repeat(n, minmax(0, 1fr))`; a string is the track list as written. */
const trackList = (count: number | string): string => {
  if (typeof count === "string") {
    if (count.trim() === "") {
      throw new RangeError("Grid columns track list must not be empty");
    }
    return count;
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `Grid columns must be a positive integer, got ${String(count)}`,
    );
  }
  return `repeat(${String(count)}, minmax(0, 1fr))`;
};

/** Column classes + `--ui-grid-cols*` track variables; throws on an unknown breakpoint, a non-positive count or an empty track list. */
export const gridColumns = (value: GridColumnsValue): GridColumns => {
  const entries: [string, number | string | undefined][] =
    typeof value === "object" ? Object.entries(value) : [["base", value]];
  const classes: string[] = [];
  const style: Record<string, string> = {};
  for (const [bp, count] of entries) {
    if (count === undefined) continue;
    const cls = known[bp];
    if (cls === undefined) throw new Error(`Grid: unknown breakpoint "${bp}"`);
    classes.push(cls);
    style[bp === "base" ? "--ui-grid-cols" : `--ui-grid-cols-${bp}`] =
      trackList(count);
  }
  return { className: classes.join(" "), style };
};

export const gridTables = {
  base: "grid",
  variants: {
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    flow: {
      row: "grid-flow-row",
      column: "grid-flow-col",
      dense: "grid-flow-dense",
    },
  },
} satisfies RecipeTables;

const missing = tokens.breakpoints.filter((bp) => known[bp] === undefined);
if (missing.length > 0) {
  throw new Error(
    `grid: no GRID_COLUMN_CLASSES entry for ${missing.join(", ")}`,
  );
}

/** Grid recipe (`align`, `justify`, `flow`); columns come from `gridColumns`. */
export const gridRecipe: RecipeFn = recipeFromTables(gridTables);
