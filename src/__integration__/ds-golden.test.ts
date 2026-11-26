import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const golden = join(__dirname, "__fixtures__", "ds-build", "golden-9.2");

describe("design-system 9.2 goldens", () => {
  it("holds every file the parity tests compare", () => {
    for (const file of [
      "tokens.json",
      "README.md",
      "components/index.d.ts",
      "components/Cover/preview.html",
      "trees.json",
      "selectors.json",
    ])
      expect(existsSync(join(golden, file)), file).toBe(true);
  });

  it("renders every component and each Button intent, variant and size", () => {
    const trees = JSON.parse(
      readFileSync(join(golden, "trees.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(
      Object.keys(trees).filter((k) => k.startsWith("Button:")),
    ).toHaveLength(2 * 5 * 3);
    for (const name of ["Box", "Text", "Stack", "Flex", "Grid"])
      expect(trees[`${name}:default`], name).toBeDefined();
  });
});
