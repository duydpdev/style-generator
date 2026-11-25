import { accordionPreset, tokens } from "design-system-example";
import { accordionTables as accordionTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { accordionTables } from "../../src/ui/accordion/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain accordion tables equal the design-system factory's", () => {
  expect(accordionTables).toEqual(
    accordionTablesFactory(tokens, accordionPreset),
  );
});
