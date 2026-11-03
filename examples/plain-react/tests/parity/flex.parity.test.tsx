import {
  BOX_VARIANT_KEYS,
  boxTables as harnessBoxTables,
  stackTables as harnessStackTables,
} from "design-system-example/recipes";
import { describe, expect, test } from "vitest";

import { tokens } from "../../src/theme";
import { Flex } from "../../src/ui/flex/Flex";
import {
  LAYOUT_VARIANT_KEYS,
  flexTables,
  layoutTables,
} from "../../src/ui/flex/style";

import { HarnessFlex, harnessTokens } from "./harness";
import {
  loose,
  renderClasses,
  spacingCases,
  tableShape,
  unionCases,
  variantCases,
  type ParityCase,
} from "./parity";

// The harness Flex also reads `stackTables()`.
const harnessFlex = harnessStackTables();
const harnessLayout = harnessBoxTables(harnessTokens);
const layoutKeys: readonly string[] = LAYOUT_VARIANT_KEYS;
const harnessLayoutKeys: readonly string[] = BOX_VARIANT_KEYS;
// The harness splits only BOX_VARIANT_KEYS, the plain app only LAYOUT_VARIANT_KEYS.
const plainKeep = (variant: string): boolean => layoutKeys.includes(variant);
const harnessKeep = (variant: string): boolean =>
  harnessLayoutKeys.includes(variant);

const cases: ParityCase[] = [
  { name: "defaults", props: {} },
  ...unionCases(variantCases(flexTables), variantCases(harnessFlex)),
  ...unionCases(
    variantCases(layoutTables, plainKeep),
    variantCases(harnessLayout, harnessKeep),
  ),
  ...spacingCases(tokens),
];

describe("Flex parity (plain vs harness)", () => {
  test("the plain tables have the same variants, options and compound entries as the harness tables", () => {
    expect(tableShape(flexTables)).toEqual(tableShape(harnessFlex));
    expect(tableShape(layoutTables, plainKeep)).toEqual(
      tableShape(harnessLayout, harnessKeep),
    );
  });

  test.each(cases)("$name", async ({ props }) => {
    const plain = await renderClasses(loose(Flex), props);
    const harness = await renderClasses(loose(HarnessFlex), props);
    expect(plain).toEqual(harness);
  });
});
