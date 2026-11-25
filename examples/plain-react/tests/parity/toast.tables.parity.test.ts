import { toastPreset, tokens } from "design-system-example";
import { toastTables as toastTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { toastTables } from "../../src/ui/toast/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain toast tables equal the design-system factory's", () => {
  expect(toastTables).toEqual(toastTablesFactory(tokens, toastPreset));
});
