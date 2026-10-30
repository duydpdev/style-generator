import { readFileSync } from "node:fs";

import { presets, tokens } from "design-system-example";
import { describe, expect, it } from "vitest";

import { UI_COMPONENT_NAMES } from "../../ui-react/registry.mjs";
import { byName, layoutOnly, ui } from "../tests/ui";

import { createUi } from "./createUi";

describe("createUi", () => {
  it("returns exactly the names ui-react registers", () => {
    expect(Object.keys(ui).sort(byName)).toEqual(
      [...UI_COMPONENT_NAMES].sort(byName),
    );
  });

  it("returns only the layout components when no role is declared", () => {
    expect(Object.keys(layoutOnly).sort(byName)).toEqual([
      "Box",
      "Code",
      "Container",
      "Flex",
      "Grid",
      "Link",
      "List",
      "ListItem",
      "Stack",
      "Text",
    ]);
  });

  it("drops a role set to undefined", () => {
    const dropped = createUi(tokens, { ...presets, button: undefined });
    expect(Object.keys(dropped)).not.toContain("Button");
    expect(Object.keys(dropped)).toContain("Badge");
  });

  it("keeps the React-free shared types identical to ui-react's", () => {
    for (const file of ["tokens.ts", "presets.ts"]) {
      expect(
        readFileSync(
          new URL(`./shared/types/${file}`, import.meta.url),
          "utf8",
        ),
      ).toBe(
        readFileSync(
          new URL(`../../ui-react/src/shared/types/${file}`, import.meta.url),
          "utf8",
        ),
      );
    }
  });
});
