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
      {
        recipe: box,
        spacingKeys: ["p"],
        variantKeys: VARIANT_KEYS,
        sizeKeys: SIZE_KEYS,
      },
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
      {
        recipe: box,
        spacingKeys: [],
        variantKeys: VARIANT_KEYS,
        sizeKeys: SIZE_KEYS,
      },
    );
    expect(split.style).toEqual({ width: css });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, null, true, {}])(
    "drops the invalid size value #%#",
    (value) => {
      const split = splitLayout(
        { width: value },
        {
          recipe: box,
          spacingKeys: [],
          variantKeys: VARIANT_KEYS,
          sizeKeys: SIZE_KEYS,
        },
      );
      expect(split.style).toEqual({});
      expect(split.rest).toEqual({});
    },
  );

  it("lets extra win over a prop of the same variant", () => {
    const split = splitLayout(
      { position: "absolute" },
      {
        recipe: box,
        spacingKeys: [],
        variantKeys: VARIANT_KEYS,
        sizeKeys: SIZE_KEYS,
        extra: { position: "relative" },
      },
    );
    expect(split.variants).toEqual({ position: "relative" });
    expect(split.className).toBe("box relative");
  });

  it("leaves a key outside variantKeys or sizeKeys in rest", () => {
    const split = splitLayout(
      { rounded: "pill", width: 320 },
      {
        recipe: box,
        spacingKeys: [],
        variantKeys: ["position"],
        sizeKeys: ["height"],
      },
    );
    expect(split.rest).toEqual({ rounded: "pill", width: 320 });
    expect(split.style).toEqual({});
    expect(split.className).toBe("box");
  });

  it("drops a non-string variant value", () => {
    const split = splitLayout(
      { rounded: true },
      {
        recipe: box,
        spacingKeys: [],
        variantKeys: VARIANT_KEYS,
        sizeKeys: SIZE_KEYS,
      },
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
      const split = splitLayout(
        { zIndex: value },
        { recipe: box, spacingKeys: [], variantKeys: ["zIndex"], sizeKeys: [] },
      );
      expect(split.variants.zIndex).toBe(value);
      expect(split.className).toBe(className);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "drops a non-finite number variant value (%s)",
    (value) => {
      const split = splitLayout(
        { zIndex: value },
        { recipe: box, spacingKeys: [], variantKeys: ["zIndex"], sizeKeys: [] },
      );
      expect(split.variants.zIndex).toBeUndefined();
      expect(split.className).toBe("box");
    },
  );

  describe("a call in the pre-8.0 positional form (L-L8)", () => {
    const message =
      "splitLayout(props, { recipe, spacingKeys, variantKeys, sizeKeys })";

    it("throws a TypeError that names the options form", () => {
      const old = splitLayout as unknown as (...args: unknown[]) => unknown;
      expect(() => old({ p: 4 }, box, ["p"], VARIANT_KEYS, SIZE_KEYS)).toThrow(
        TypeError,
      );
      expect(() => old({ p: 4 }, box, ["p"], VARIANT_KEYS, SIZE_KEYS)).toThrow(
        message,
      );
    });

    it("throws the same error when options is missing or has no recipe", () => {
      const old = splitLayout as unknown as (...args: unknown[]) => unknown;
      expect(() => old({})).toThrow(message);
      expect(() => old({}, { spacingKeys: [] })).toThrow(message);
    });
  });
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
