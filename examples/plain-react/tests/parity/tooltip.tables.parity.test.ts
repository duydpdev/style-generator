import { tooltipPreset, tokens } from "design-system-example";
import { tooltipTables as tooltipTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { tooltipTables } from "../../src/ui/tooltip/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain tooltip tables equal the design-system factory's", () => {
  expect(tooltipTables).toEqual(tooltipTablesFactory(tokens, tooltipPreset));
});
