import { popoverPreset, tokens } from "design-system-example";
import { popoverTables as popoverTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { popoverTables } from "../../src/ui/popover/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain popover tables equal the design-system factory's", () => {
  expect(popoverTables).toEqual(popoverTablesFactory(tokens, popoverPreset));
});
