import { textPreset } from "design-system-example";
import { textTables as harnessTextTables } from "design-system-example/recipes";
import { describe, expect, test } from "vitest";

import { tokens } from "../../src/theme";
import { Text } from "../../src/ui/text/Text";
import { textTables } from "../../src/ui/text/style";

import { HarnessText, harnessTokens } from "./harness";
import {
  loose,
  renderClasses,
  spacingCases,
  tableShape,
  unionCases,
  variantCases,
  type ParityCase,
} from "./parity";

const harnessTables = harnessTextTables(harnessTokens, textPreset);

const cases: ParityCase[] = [
  { name: "defaults", props: {} },
  ...unionCases(variantCases(textTables), variantCases(harnessTables)),
  ...spacingCases(tokens),
];

describe("Text parity (plain vs harness)", () => {
  test("the plain tables have the same variants, options and compound entries as the harness tables", () => {
    expect(tableShape(textTables)).toEqual(tableShape(harnessTables));
  });

  test.each(cases)("$name", async ({ props }) => {
    const plain = await renderClasses(loose(Text), props, "Text");
    const harness = await renderClasses(loose(HarnessText), props, "Text");
    expect(plain).toEqual(harness);
  });
});
