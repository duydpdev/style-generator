import { avatarPreset, tokens } from "design-system-example";
import { avatarTables as avatarTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { avatarTables } from "../../src/ui/avatar/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain avatar tables equal the design-system factory's", () => {
  expect(avatarTables).toEqual(avatarTablesFactory(tokens, avatarPreset));
});
