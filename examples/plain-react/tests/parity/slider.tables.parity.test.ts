import { sliderPreset, tokens } from "design-system-example";
import { sliderTables as sliderTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { sliderTables } from "../../src/ui/slider/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain slider tables equal the design-system factory's", () => {
  expect(sliderTables).toEqual(sliderTablesFactory(tokens, sliderPreset));
});
