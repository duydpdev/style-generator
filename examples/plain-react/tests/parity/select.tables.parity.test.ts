import { selectPreset, tokens } from "design-system-example";
import { selectTables as selectTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { selectTables } from "../../src/ui/select/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain select tables equal the design-system factory's", () => {
  expect(selectTables).toEqual(selectTablesFactory(tokens, selectPreset));
});
