import { expect, test } from "vitest";

import { tokens } from "../../src/theme";

import { harnessTokens } from "./harness";

// D3: the plain theme keeps only themeAxes.theme.dark, and aliasedColors also
// reads axis overrides; no component reads it, so it is left out.
test("the plain theme's token arrays equal the harness tokens", () => {
  expect({ ...tokens, aliasedColors: [] }).toEqual({
    ...harnessTokens,
    aliasedColors: [],
  });
});
