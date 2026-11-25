import { drawerPreset, tokens } from "design-system-example";
import { drawerTables as drawerTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { drawerTables } from "../../src/ui/drawer/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain drawer tables equal the design-system factory's", () => {
  expect(drawerTables).toEqual(drawerTablesFactory(tokens, drawerPreset));
});
