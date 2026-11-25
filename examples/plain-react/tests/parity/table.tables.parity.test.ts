import { tablePreset, tokens } from "design-system-example";
import { tableTables as tableTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { tableTables } from "../../src/ui/table/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain table tables equal the design-system factory's", () => {
  expect(tableTables).toEqual(tableTablesFactory(tokens, tablePreset));
});
