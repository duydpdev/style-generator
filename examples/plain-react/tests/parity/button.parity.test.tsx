import { buttonPreset } from "design-system-example";
import { buttonTables as harnessButtonTables } from "design-system-example/recipes";
import { describe, expect, test } from "vitest";

import { tokens } from "../../src/theme";
import { Button } from "../../src/ui/button/Button";
import { buttonIntents, buttonTables } from "../../src/ui/button/style";

import { HarnessButton, harnessTokens } from "./harness";
import {
  loose,
  renderClasses,
  spacingCases,
  tableShape,
  unionCases,
  variantCases,
  type ParityCase,
} from "./parity";

// The harness side comes from the factory the harness itself uses, with the same tokens and preset.
const harnessTables = harnessButtonTables(harnessTokens, buttonPreset);

const cases: ParityCase[] = [
  { name: "defaults", props: {} },
  { name: "prefix and suffix", props: { prefix: "←", suffix: "→" } },
  ...unionCases(variantCases(buttonTables), variantCases(harnessTables)),
  ...spacingCases(tokens),
];

describe("Button parity (plain vs harness)", () => {
  test("the plain tables have the same variants, options and compound entries as the harness tables", () => {
    expect(tableShape(buttonTables)).toEqual(tableShape(harnessTables));
    const byName = (a: string, b: string): number => a.localeCompare(b);
    expect([...buttonIntents].sort(byName)).toEqual(
      [...buttonPreset.intents].sort(byName),
    );
  });

  test.each(cases)("$name", async ({ props }) => {
    const plain = await renderClasses(loose(Button), props, "Go");
    const harness = await renderClasses(loose(HarnessButton), props, "Go");
    expect(plain).toEqual(harness);
  });
});
