import { describe, expect, test } from "vitest";

import { spacingCases, tableShape, unionCases, variantCases } from "./parity";

describe("parity case generator", () => {
  test("one case per option and per compound entry; boolean options become booleans; dropped variants are skipped", () => {
    const cases = variantCases(
      {
        variants: {
          tone: { a: "x", b: "y" },
          wrap: { true: "w" },
          overlay: { true: "o" },
        },
        compoundVariants: [{ tone: "a", wrap: true, class: "z" }],
      },
      (variant) => variant !== "overlay",
    );
    expect(cases).toEqual([
      { name: "tone=a", props: { tone: "a" } },
      { name: "tone=b", props: { tone: "b" } },
      { name: "wrap=true", props: { wrap: true } },
      { name: "tone=a wrap=true", props: { tone: "a", wrap: true } },
    ]);
  });

  test("two spacing cases per property, camelCased, with every breakpoint", () => {
    expect(
      spacingCases({
        spacingProperties: ["p", "gap-x"],
        breakpoints: ["md", "lg"],
      }),
    ).toEqual([
      { name: "p=4", props: { p: 4 } },
      {
        name: 'p={"base":2,"md":4,"lg":6}',
        props: { p: { base: 2, md: 4, lg: 6 } },
      },
      { name: "gapX=4", props: { gapX: 4 } },
      {
        name: 'gapX={"base":2,"md":4,"lg":6}',
        props: { gapX: { base: 2, md: 4, lg: 6 } },
      },
    ]);
  });

  test("tableShape lists variants, sorted option keys and compound conditions without the class", () => {
    expect(
      tableShape({
        variants: { tone: { b: "y", a: "x" }, wrap: { true: "w" } },
        compoundVariants: [{ tone: "a", class: "z" }],
      }),
    ).toEqual({
      variants: { tone: ["a", "b"], wrap: ["true"] },
      compound: ['[["tone","a"]]'],
    });
  });

  test("an option on one side only changes the shape and still reaches the union", () => {
    const plain = { variants: { size: { sm: "a", md: "b" } } };
    const harness = { variants: { size: { sm: "a", md: "b", xl: "c" } } };
    expect(tableShape(plain)).not.toEqual(tableShape(harness));
    expect(
      unionCases(variantCases(plain), variantCases(harness)).map(
        ({ name }) => name,
      ),
    ).toEqual(["size=sm", "size=md", "size=xl"]);
  });
});
