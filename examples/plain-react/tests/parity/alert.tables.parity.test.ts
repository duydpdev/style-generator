import { alertPreset, tokens } from "design-system-example";
import { alertTables as alertTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { alertTables } from "../../src/ui/alert/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain alert tables equal the design-system factory's", () => {
  expect(alertTables).toEqual(alertTablesFactory(tokens, alertPreset));
});
