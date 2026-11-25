import { progressPreset, tokens } from "design-system-example";
import { progressTables as progressTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { progressTables } from "../../src/ui/progress/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain progress tables equal the design-system factory's", () => {
  expect(progressTables).toEqual(progressTablesFactory(tokens, progressPreset));
});
