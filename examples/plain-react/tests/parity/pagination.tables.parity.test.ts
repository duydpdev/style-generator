import { paginationPreset, tokens } from "design-system-example";
import { paginationTables as paginationTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { paginationTables } from "../../src/ui/pagination/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain pagination tables equal the design-system factory's", () => {
  expect(paginationTables).toEqual(
    paginationTablesFactory(tokens, paginationPreset),
  );
});
