import { menuPreset, tokens } from "design-system-example";
import { menuTables as menuTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { menuTables } from "../../src/ui/menu/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain menu tables equal the design-system factory's", () => {
  expect(menuTables).toEqual(menuTablesFactory(tokens, menuPreset));
});
