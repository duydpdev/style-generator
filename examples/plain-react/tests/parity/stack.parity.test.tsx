import {
  BOX_VARIANT_KEYS,
  boxTables as harnessBoxTables,
  stackTables as harnessStackTables,
} from "design-system-example/recipes";
import { describe, expect, test } from "vitest";

import { tokens } from "../../src/theme";
import { Stack } from "../../src/ui/stack/Stack";
import {
  LAYOUT_VARIANT_KEYS,
  layoutTables,
  stackTables,
} from "../../src/ui/stack/style";

import { HarnessStack, harnessTokens } from "./harness";
import {
  loose,
  renderClasses,
  spacingCases,
  tableShape,
  unionCases,
  variantCases,
  type ParityCase,
} from "./parity";

const harnessStack = harnessStackTables();
const harnessLayout = harnessBoxTables(harnessTokens);
const layoutKeys: readonly string[] = LAYOUT_VARIANT_KEYS;
const harnessLayoutKeys: readonly string[] = BOX_VARIANT_KEYS;
// The harness splits only BOX_VARIANT_KEYS, the plain app only LAYOUT_VARIANT_KEYS.
const plainKeep = (variant: string): boolean => layoutKeys.includes(variant);
const harnessKeep = (variant: string): boolean =>
  harnessLayoutKeys.includes(variant);

const cases: ParityCase[] = [
  { name: "defaults", props: {} },
  ...unionCases(variantCases(stackTables), variantCases(harnessStack)),
  ...unionCases(
    variantCases(layoutTables, plainKeep),
    variantCases(harnessLayout, harnessKeep),
  ),
  ...spacingCases(tokens),
];

describe("Stack parity (plain vs harness)", () => {
  test("the plain tables have the same variants, options and compound entries as the harness tables", () => {
    expect(tableShape(stackTables)).toEqual(tableShape(harnessStack));
    expect(tableShape(layoutTables, plainKeep)).toEqual(
      tableShape(harnessLayout, harnessKeep),
    );
  });

  test.each(cases)("$name", async ({ props }) => {
    const plain = await renderClasses(loose(Stack), props);
    const harness = await renderClasses(loose(HarnessStack), props);
    expect(plain).toEqual(harness);
  });
});
