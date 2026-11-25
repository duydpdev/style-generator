import { checkboxPreset, tokens } from "design-system-example";
import { checkboxTables as checkboxTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { checkboxTables } from "../../src/ui/checkbox/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain checkbox tables equal the design-system factory's", () => {
  expect(checkboxTables).toEqual(checkboxTablesFactory(tokens, checkboxPreset));
});
