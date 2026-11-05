import {
  BOX_VARIANT_KEYS,
  boxTables as harnessBoxTables,
  gridTables as harnessGridTables,
} from "design-system-example/recipes";
import { describe, expect, test } from "vitest";

import { tokens } from "../../src/theme";
import { Grid } from "../../src/ui/grid/Grid";
import {
  LAYOUT_VARIANT_KEYS,
  gridTables,
  layoutTables,
} from "../../src/ui/grid/style";

import { HarnessGrid, harnessTokens } from "./harness";
import {
  loose,
  renderClasses,
  renderStyle,
  spacingCases,
  tableShape,
  unionCases,
  variantCases,
  type ParityCase,
} from "./parity";

const harnessGrid = harnessGridTables();
const harnessLayout = harnessBoxTables(harnessTokens);
const layoutKeys: readonly string[] = LAYOUT_VARIANT_KEYS;
const harnessLayoutKeys: readonly string[] = BOX_VARIANT_KEYS;
// The harness splits only BOX_VARIANT_KEYS, the plain app only LAYOUT_VARIANT_KEYS.
const plainKeep = (variant: string): boolean => layoutKeys.includes(variant);
const harnessKeep = (variant: string): boolean =>
  harnessLayoutKeys.includes(variant);

const responsiveColumns: Record<string, number> = { base: 1 };
tokens.breakpoints.forEach((bp, index) => {
  responsiveColumns[bp] = index + 2;
});

const cases: ParityCase[] = [
  { name: "defaults", props: {} },
  ...unionCases(variantCases(gridTables), variantCases(harnessGrid)),
  ...unionCases(
    variantCases(layoutTables, plainKeep),
    variantCases(harnessLayout, harnessKeep),
  ),
  { name: "columns=3", props: { columns: 3 } },
  { name: "columns=track list", props: { columns: "80px 1fr 80px" } },
  { name: "columns=1fr 2fr", props: { columns: "1fr 2fr" } },
  { name: "columns=responsive", props: { columns: responsiveColumns } },
  {
    name: "columns=base 1, md 2, lg 4",
    props: { columns: { base: 1, md: 2, lg: 4 } },
  },
  ...spacingCases(tokens),
];

describe("Grid parity (plain vs harness)", () => {
  test("the plain tables have the same variants, options and compound entries as the harness tables", () => {
    expect(tableShape(gridTables)).toEqual(tableShape(harnessGrid));
    expect(tableShape(layoutTables, plainKeep)).toEqual(
      tableShape(harnessLayout, harnessKeep),
    );
  });

  test.each(cases)("$name", async ({ props }) => {
    const plain = await renderClasses(loose(Grid), props);
    const harness = await renderClasses(loose(HarnessGrid), props);
    expect(plain).toEqual(harness);
  });

  test.each(cases)("$name: --ui-grid-cols style", async ({ props }) => {
    const plain = await renderStyle(loose(Grid), props);
    const harness = await renderStyle(loose(HarnessGrid), props);
    expect(plain).toEqual(harness);
  });
});

describe("Grid numbers (D1)", () => {
  test("rows 3 reaches the recipe", async () => {
    const props = { columns: 2, rows: 3 } as const;
    const plain = await renderClasses(loose(Grid), props);
    const harness = await renderClasses(loose(HarnessGrid), props);
    expect(plain.root).toContain("grid-rows-3");
    expect(plain).toEqual(harness);
    const plainStyle = await renderStyle(loose(Grid), props);
    const harnessStyle = await renderStyle(loose(HarnessGrid), props);
    expect(plainStyle).toEqual(harnessStyle);
  });
});
