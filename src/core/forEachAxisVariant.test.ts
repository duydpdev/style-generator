import { describe, expect, it } from "vitest";

import { forEachAxisVariant } from "./forEachAxisVariant";

describe("forEachAxisVariant", () => {
  it("visits nothing when the theme has no axes", () => {
    const seen: string[] = [];
    forEachAxisVariant(undefined, (axis, variant) =>
      seen.push(`${axis}.${variant}`),
    );
    expect(seen).toEqual([]);
  });

  it("visits axes and their variants in declaration order", () => {
    const dark = { colors: { surface: "#000" } };
    const forest = { colors: { primary: "#0a0" } };
    const seen: [string, string, unknown][] = [];
    forEachAxisVariant(
      {
        theme: { dark, light: {} },
        palette: { forest },
      },
      (axis, variant, override) => seen.push([axis, variant, override]),
    );
    expect(seen).toEqual([
      ["theme", "dark", dark],
      ["theme", "light", {}],
      ["palette", "forest", forest],
    ]);
  });

  it("skips an axis without variants", () => {
    const seen: string[] = [];
    forEachAxisVariant({ sand: {} }, (axis) => seen.push(axis));
    expect(seen).toEqual([]);
  });
});
