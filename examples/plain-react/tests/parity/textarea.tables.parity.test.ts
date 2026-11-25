import { textFieldPreset, tokens } from "design-system-example";
import { textareaTables as textareaTablesFactory } from "design-system-example/recipes";
import { expect, test } from "vitest";

import { textareaTables } from "../../src/ui/textarea/style";

// No harness counterpart to render against: the plain tables must equal the factory's tables for the same theme and preset.
test("the plain textarea tables equal the design-system factory's", () => {
  expect(textareaTables).toEqual(
    textareaTablesFactory(tokens, textFieldPreset),
  );
});
