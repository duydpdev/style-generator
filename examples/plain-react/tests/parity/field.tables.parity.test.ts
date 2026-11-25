import { fieldPreset, tokens } from "design-system-example";
import { fieldTables as fieldTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { fieldTables } from "../../src/ui/field/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain field tables equal the design-system factory's", () => {
  expect(fieldTables).toEqual(fieldTablesFactory(tokens, fieldPreset));
});
