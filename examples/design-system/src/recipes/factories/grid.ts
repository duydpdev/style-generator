import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

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

/** `rows` values: a row count (`grid-rows-N`) or `none`. */
export type GridRows = 1 | 2 | 3 | 4 | 5 | 6 | "none";

export const gridTables = (): RecipeTables => ({
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
    rows: {
      1: "grid-rows-1",
      2: "grid-rows-2",
      3: "grid-rows-3",
      4: "grid-rows-4",
      5: "grid-rows-5",
      6: "grid-rows-6",
      none: "grid-rows-none",
    } satisfies Record<GridRows, string>,
  },
});

/** Grid recipe; throws when the theme has a breakpoint `GRID_COLUMN_CLASSES` does not list. */
export const createGridRecipe = (t: RecipeTokens): RecipeFn => {
  const missing = t.breakpoints.filter((bp) => known[bp] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `createGridRecipe: no GRID_COLUMN_CLASSES entry for ${missing.join(", ")}`,
    );
  }
  return recipeFromTables(gridTables());
};
