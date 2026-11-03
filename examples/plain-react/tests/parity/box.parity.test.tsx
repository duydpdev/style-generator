import { boxPreset } from "design-system-example";
import { boxTables as harnessBoxTables } from "design-system-example/recipes";
import { describe, expect, test } from "vitest";

import { tokens } from "../../src/theme";
import { Box } from "../../src/ui/box/Box";
import { boxTables } from "../../src/ui/box/style";

import { HarnessBox, harnessTokens } from "./harness";
import {
  first,
  loose,
  renderClasses,
  spacingCases,
  tableShape,
  unionCases,
  variantCases,
  type ParityCase,
} from "./parity";

const harnessTables = harnessBoxTables(harnessTokens, boxPreset);
// `overlay` is the internal inner-border element, not a prop.
const keep = (variant: string): boolean => variant !== "overlay";

const cases: ParityCase[] = [
  { name: "defaults", props: {} },
  ...unionCases(
    variantCases(boxTables, keep),
    variantCases(harnessTables, keep),
  ),
  {
    name: "innerBorder with frame props",
    props: {
      innerBorder: true,
      border: first(tokens.borderWidth),
      borderColor: first(tokens.colors),
      rounded: first(tokens.borderRadius),
    },
  },
  ...spacingCases(tokens),
];

describe("Box parity (plain vs harness)", () => {
  test("the plain tables have the same variants, options and compound entries as the harness tables", () => {
    expect(tableShape(boxTables, keep)).toEqual(
      tableShape(harnessTables, keep),
    );
  });

  test.each(cases)("$name", async ({ props }) => {
    const plain = await renderClasses(loose(Box), props);
    const harness = await renderClasses(loose(HarnessBox), props);
    expect(plain).toEqual(harness);
  });
});
