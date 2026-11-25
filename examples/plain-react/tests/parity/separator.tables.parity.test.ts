import { separatorPreset, tokens } from "design-system-example";
import { separatorTables as separatorTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { separatorTables } from "../../src/ui/separator/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain separator tables equal the design-system factory's", () => {
  expect(separatorTables).toEqual(
    separatorTablesFactory(tokens, separatorPreset),
  );
});
