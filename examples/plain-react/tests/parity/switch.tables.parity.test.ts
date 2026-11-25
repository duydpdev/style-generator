import { switchPreset, tokens } from "design-system-example";
import { switchTables as switchTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { switchTables } from "../../src/ui/switch/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain switch tables equal the design-system factory's", () => {
  expect(switchTables).toEqual(switchTablesFactory(tokens, switchPreset));
});
