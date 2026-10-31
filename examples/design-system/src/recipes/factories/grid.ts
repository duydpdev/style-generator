import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

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

/** `3`, or `{ base: 1, md: 3 }` (breakpoint keys checked by ui-react's types). */
export type GridColumnsValue =
  | number
  | Readonly<Record<string, number | undefined>>;

export interface GridColumns {
  readonly className: string;
  readonly style: Readonly<Record<string, string>>;
}

const known: Readonly<Record<string, string>> = GRID_COLUMN_CLASSES;

/** Column classes + `--ui-grid-cols*` track variables; throws on an unknown breakpoint or a non-positive count. */
export const gridColumns = (value: GridColumnsValue): GridColumns => {
  const entries: [string, number | undefined][] =
    typeof value === "number" ? [["base", value]] : Object.entries(value);
  const classes: string[] = [];
  const style: Record<string, string> = {};
  for (const [bp, count] of entries) {
    if (count === undefined) continue;
    const cls = known[bp];
    if (cls === undefined) throw new Error(`Grid: unknown breakpoint "${bp}"`);
    if (!Number.isInteger(count) || count < 1) {
      throw new RangeError(
        `Grid columns must be a positive integer, got ${String(count)}`,
      );
    }
    classes.push(cls);
    style[bp === "base" ? "--ui-grid-cols" : `--ui-grid-cols-${bp}`] =
      `repeat(${String(count)}, minmax(0, 1fr))`;
  }
  return { className: classes.join(" "), style };
};

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
