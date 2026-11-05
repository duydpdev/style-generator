import { describe, expect, it } from "vitest";

import { mergeStyle, splitLayout, splitSpacing } from "./layout";
import { recipeFromTables } from "./recipe";

const box = recipeFromTables({
  base: "box",
  variants: {
    rounded: { pill: "rounded-pill" },
    position: { relative: "relative", absolute: "absolute" },
    zIndex: { "0": "z-0", "10": "z-10" },
  },
});
const VARIANT_KEYS = ["rounded", "position"] as const;
const SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

describe("splitSpacing", () => {
  it("turns spacing props into .sp-* classes and --sg-sp-* style and passes the rest through", () => {
    expect(splitSpacing({ p: 4, id: "a" }, ["p"])).toEqual({
      className: "sp-p",
      style: { "--sg-sp-p": "1rem" },
      variants: {},
      rest: { id: "a" },
    });
  });
});

describe("splitLayout", () => {
  it("routes variant keys, sizes, spacing and the rest", () => {
    const split = splitLayout(
      { rounded: "pill", width: 320, maxWidth: "50%", p: 4, id: "card" },
      box,
      ["p"],
      VARIANT_KEYS,
      SIZE_KEYS,
    );
    expect(split).toEqual({
      className: "box rounded-pill sp-p",
      style: { width: "320px", maxWidth: "50%", "--sg-sp-p": "1rem" },
      variants: { rounded: "pill" },
      rest: { id: "card" },
    });
  });

  it.each<[number | string, string]>([
    [320, "320px"],
    [0, "0"],
    [1.5, "1.5px"],
    [-8, "-8px"],
    ["50%", "50%"],
    ["calc(100% - 2rem)", "calc(100% - 2rem)"],
  ])("renders the size %j as %j", (value, css) => {
    const split = splitLayout(
      { width: value },
      box,
      [],
      VARIANT_KEYS,
      SIZE_KEYS,
    );
    expect(split.style).toEqual({ width: css });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, null, true, {}])(
    "drops the invalid size value #%#",
    (value) => {
      const split = splitLayout(
        { width: value },
        box,
        [],
        VARIANT_KEYS,
        SIZE_KEYS,
      );
      expect(split.style).toEqual({});
      expect(split.rest).toEqual({});
    },
  );

  it("lets extra win over a prop of the same variant", () => {
    const split = splitLayout(
      { position: "absolute" },
      box,
      [],
      VARIANT_KEYS,
      SIZE_KEYS,
      { position: "relative" },
    );
    expect(split.variants).toEqual({ position: "relative" });
    expect(split.className).toBe("box relative");
  });

  it("leaves a key outside variantKeys or sizeKeys in rest", () => {
    const split = splitLayout(
      { rounded: "pill", width: 320 },
      box,
      [],
      ["position"],
      ["height"],
    );
    expect(split.rest).toEqual({ rounded: "pill", width: 320 });
    expect(split.style).toEqual({});
    expect(split.className).toBe("box");
  });

  it("drops a non-string variant value", () => {
    const split = splitLayout(
      { rounded: true },
      box,
      [],
      VARIANT_KEYS,
      SIZE_KEYS,
    );
    expect(split.variants.rounded).toBeUndefined();
    expect(split.rest).toEqual({});
    expect(split.className).toBe("box");
  });

  it.each<[number, string]>([
    [10, "box z-10"],
    [0, "box z-0"],
  ])(
    "passes a finite number variant value through (%s)",
    (value, className) => {
      const split = splitLayout({ zIndex: value }, box, [], ["zIndex"], []);
      expect(split.variants.zIndex).toBe(value);
      expect(split.className).toBe(className);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "drops a non-finite number variant value (%s)",
    (value) => {
      const split = splitLayout({ zIndex: value }, box, [], ["zIndex"], []);
      expect(split.variants.zIndex).toBeUndefined();
      expect(split.className).toBe("box");
    },
  );
});

describe("mergeStyle", () => {
  it("returns undefined when every part is empty or missing", () => {
    expect(mergeStyle()).toBeUndefined();
    expect(mergeStyle(undefined, {})).toBeUndefined();
  });

  it("merges left to right", () => {
    expect(
      mergeStyle({ width: 1, color: "red" }, undefined, { width: 2 }),
    ).toEqual({
      width: 2,
      color: "red",
    });
  });

  it("merges a caller's own style type with a StyleRecord", () => {
    const own: { readonly position: "absolute" } = { position: "absolute" };
    expect(mergeStyle(own, { width: "1px" })).toEqual({
      position: "absolute",
      width: "1px",
    });
  });
});
