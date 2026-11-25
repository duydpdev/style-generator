import { dialogPreset, tokens } from "design-system-example";
import { dialogTables as dialogTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { dialogTables } from "../../src/ui/dialog/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain dialog tables equal the design-system factory's", () => {
  expect(dialogTables).toEqual(dialogTablesFactory(tokens, dialogPreset));
});
