import { skeletonPreset, tokens } from "design-system-example";
import { skeletonTables as skeletonTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { skeletonTables } from "../../src/ui/skeleton/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain skeleton tables equal the design-system factory's", () => {
  expect(skeletonTables).toEqual(skeletonTablesFactory(tokens, skeletonPreset));
});
