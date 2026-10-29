import { describe, expectTypeOf, it } from "vitest";

import type { StyleGeneratorOptions } from "../../core/Options";
import { createDesignTokens } from "../tokens/createDesignTokens";
import type { BreakpointKeys } from "../../core/inference";
import type { ResponsiveValueStrict } from "../spacing/spacingHelpers";

import { splitSpacingProps } from "./spacingProps";
import type { SpacingProps } from "./spacingProps";

describe("SpacingProps", () => {
  it("camelCases every default spacing key, optional, responsive over md/lg", () => {
    expectTypeOf<SpacingProps>().toHaveProperty("p");
    expectTypeOf<SpacingProps>().toHaveProperty("gapX");
    expectTypeOf<SpacingProps>().not.toHaveProperty("gap-x");
    expectTypeOf<SpacingProps["p"]>().toEqualTypeOf<
      ResponsiveValueStrict<number> | undefined
    >();
    expectTypeOf<Record<never, never>>().toExtend<SpacingProps>();
  });

  it("takes a custom property list and breakpoint keys", () => {
    type Custom = SpacingProps<"md" | "xl", "inset" | "gap-y">;
    expectTypeOf<keyof Custom>().toEqualTypeOf<"inset" | "gapY">();
    expectTypeOf<{ inset: { xl: 4 } }>().toExtend<Custom>();
    expectTypeOf<{ inset: { lg: 4 } }>().not.toExtend<Custom>();
  });

  it("rejects an unknown breakpoint key for the default BKeys", () => {
    expectTypeOf<{ p: { tablet: 4 } }>().not.toExtend<SpacingProps>();
    expectTypeOf<{ p: { base: 4; md: 8 } }>().toExtend<SpacingProps>();
  });
});

describe("splitSpacingProps", () => {
  const options = {
    breakpoints: ["md", "xl"],
    spacing: { properties: { inset: ["inset"], "gap-y": ["row-gap"] } },
  } as const;
  const { spacingProperties } = createDesignTokens(
    { colors: { a: "#000" } },
    options,
  ).DesignTokens.Web;
  const KEYS = ["p", "gap-x"] as const;

  it("rest drops every spacing key and keeps the other props' types", () => {
    type Props = SpacingProps & { id: string; onClick?: () => void };
    const { rest, spacing } = splitSpacingProps({} as Props, KEYS);
    expectTypeOf(rest).not.toHaveProperty("p");
    expectTypeOf(rest).not.toHaveProperty("gapX");
    expectTypeOf(rest).toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf(rest).toHaveProperty("onClick");
    expectTypeOf(spacing).toEqualTypeOf<{
      className: string;
      style: Record<string, string>;
    }>();
  });

  it("keeps a spacing key in rest when it is not in keys", () => {
    type Props = SpacingProps & { id: string };
    const { rest } = splitSpacingProps({} as Props, ["p"] as const);
    expectTypeOf(rest).not.toHaveProperty("p");
    expectTypeOf(rest).toHaveProperty("mx");
  });

  it("accepts valid literals, plain props objects and responsive values", () => {
    splitSpacingProps({ p: 4, id: "x" }, KEYS);
    splitSpacingProps({ p: { base: 2, md: 4 }, gapX: undefined }, KEYS);
    splitSpacingProps({ id: "x" }, KEYS);
    const props = { p: 4, id: "x" };
    const { rest } = splitSpacingProps(props, KEYS);
    expectTypeOf(rest).toEqualTypeOf<{ id: string }>();
  });

  it("rejects a non-number spacing value, with or without other props", () => {
    // @ts-expect-error a string is not a spacing value
    splitSpacingProps({ p: "4" }, KEYS);
    // @ts-expect-error the other props do not hide the bad spacing value
    splitSpacingProps({ p: "4", id: "x" }, KEYS);
    // @ts-expect-error a nested string is no better
    splitSpacingProps({ p: { md: "4" }, id: "x" }, KEYS);
    expectTypeOf<{ p: string }>().not.toExtend<SpacingProps>();
  });

  it("rejects an unknown breakpoint key for the default BKeys", () => {
    // @ts-expect-error `tablet` is not md | lg
    splitSpacingProps({ p: { tablet: 4 }, id: "x" }, KEYS);
    // @ts-expect-error same with no other props
    splitSpacingProps({ p: { tablet: 4 } }, KEYS);
    expectTypeOf<{ p: { tablet: number } }>().not.toExtend<SpacingProps>();
  });

  it("takes tokens.spacingProperties as keys and BreakpointKeys<typeof options> as the third type argument", () => {
    expectTypeOf(spacingProperties).toEqualTypeOf<
      readonly ("inset" | "gap-y")[]
    >();
    type BKeys = BreakpointKeys<typeof options>;
    expectTypeOf<BKeys>().toEqualTypeOf<"md" | "xl">();
    type Props = SpacingProps<BKeys, "inset" | "gap-y"> & { id: string };

    const { rest } = splitSpacingProps<"inset" | "gap-y", Props, BKeys>(
      {} as Props,
      spacingProperties,
    );
    expectTypeOf(rest).toEqualTypeOf<{ id: string }>();

    splitSpacingProps<"inset" | "gap-y", Props, BKeys>(
      { inset: { xl: 4 }, id: "x" },
      spacingProperties,
    );
    splitSpacingProps<"inset" | "gap-y", Props, BKeys>(
      // @ts-expect-error `lg` is not one of the configured breakpoints
      { inset: { lg: 4 }, id: "x" },
      spacingProperties,
    );
    expectTypeOf<Props["inset"]>().toEqualTypeOf<
      ResponsiveValueStrict<number, "md" | "xl"> | undefined
    >();
  });

  it("props typed with custom breakpoints work without explicit type arguments (extra breakpoint keys are structurally compatible)", () => {
    type Props = SpacingProps<"md" | "xl", "p"> & { id: string };
    const { rest } = splitSpacingProps({} as Props, ["p"] as const);
    expectTypeOf(rest).toEqualTypeOf<{ id: string }>();
  });

  it("options annotated StyleGeneratorOptions: widened keys fall back to the built-in props, other props stay typed", () => {
    const wide: StyleGeneratorOptions = { breakpoints: ["md"] };
    const { spacingProperties: wideKeys } = createDesignTokens(
      { colors: { a: "#000" } },
      wide,
    ).DesignTokens.Web;
    expectTypeOf(wideKeys).toEqualTypeOf<readonly string[]>();

    type WideProps = SpacingProps<
      BreakpointKeys<typeof wide>,
      (typeof wideKeys)[number]
    > & { id: string; children?: unknown };
    expectTypeOf<WideProps>().toHaveProperty("p");
    expectTypeOf<WideProps>().toHaveProperty("gapX");
    expectTypeOf<WideProps["id"]>().toEqualTypeOf<string>();
    expectTypeOf<WideProps["children"]>().toEqualTypeOf<unknown>();

    const { rest } = splitSpacingProps({} as WideProps, wideKeys);
    expectTypeOf(rest).not.toHaveProperty("p");
    expectTypeOf(rest).not.toHaveProperty("gapX");
    expectTypeOf(rest).toHaveProperty("id").toEqualTypeOf<string>();
    expectTypeOf(rest).toHaveProperty("children");
  });
});
