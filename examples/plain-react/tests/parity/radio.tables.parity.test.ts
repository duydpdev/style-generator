import { radioPreset, tokens } from "design-system-example";
import { radioTables as radioTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { radioTables } from "../../src/ui/radio/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain radio tables equal the design-system factory's", () => {
  expect(radioTables).toEqual(radioTablesFactory(tokens, radioPreset));
});
