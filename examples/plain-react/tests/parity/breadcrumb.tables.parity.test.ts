import { breadcrumbPreset, tokens } from "design-system-example";
import { breadcrumbTables as breadcrumbTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { breadcrumbTables } from "../../src/ui/breadcrumb/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain breadcrumb tables equal the design-system factory's", () => {
  expect(breadcrumbTables).toEqual(
    breadcrumbTablesFactory(tokens, breadcrumbPreset),
  );
});
