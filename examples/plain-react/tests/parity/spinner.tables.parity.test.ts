import { spinnerPreset, tokens } from "design-system-example";
import { spinnerTables as spinnerTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { spinnerTables } from "../../src/ui/spinner/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain spinner tables equal the design-system factory's", () => {
  expect(spinnerTables).toEqual(spinnerTablesFactory(tokens, spinnerPreset));
});
