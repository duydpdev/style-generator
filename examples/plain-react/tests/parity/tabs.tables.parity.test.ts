import { tabsPreset, tokens } from "design-system-example";
import { tabsTables as tabsTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { tabsTables } from "../../src/ui/tabs/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain tabs tables equal the design-system factory's", () => {
  expect(tabsTables).toEqual(tabsTablesFactory(tokens, tabsPreset));
});
