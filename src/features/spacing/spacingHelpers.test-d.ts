import { describe, it, expectTypeOf } from "vitest";

import type { SpacingKey } from "../../shared/defaultOption";

import { resolveSpacing, resolveSpacingProps } from "./spacingHelpers";
import type { ResponsiveValueStrict } from "./spacingHelpers";

describe("ResponsiveValueStrict<T, BKeys>", () => {
  type Strict = ResponsiveValueStrict<number, "base" | "md">;

  it("accepts plain T", () => {
    expectTypeOf<4>().toExtend<Strict>();
  });

  it("accepts valid breakpoint keys", () => {
    expectTypeOf<{ base: number; md: number }>().toExtend<Strict>();
  });

  it("constrains object-form keys to BKeys | 'base' only", () => {
    // Extract object branch of the union and check its keyof.
    type ObjectBranch = Extract<Strict, Record<string, unknown>>;
    // Excess-property check on object literals rejects unknown keys at use sites.
    type Keys = keyof ObjectBranch;
    expectTypeOf<Keys>().toEqualTypeOf<"base" | "md">();
  });
});

describe("SpacingKey", () => {
  it("is a literal union of every default spacing property key, not string", () => {
    expectTypeOf<SpacingKey>().toEqualTypeOf<
      | "p"
      | "px"
      | "py"
      | "pt"
      | "pb"
      | "pl"
      | "pr"
      | "m"
      | "mx"
      | "my"
      | "mt"
      | "mb"
      | "ml"
      | "mr"
      | "gap"
      | "gap-x"
      | "gap-y"
      | "top"
      | "right"
      | "bottom"
      | "left"
    >();
  });
});

describe("resolveSpacingProps", () => {
  it("returns { classNames: string; style: Record<string, string> } (already joined)", () => {
    expectTypeOf(resolveSpacingProps).returns.toEqualTypeOf<{
      classNames: string;
      style: Record<string, string>;
    }>();
  });

  it("rejects an unknown SpacingKey and an unknown breakpoint key (compile-time only)", () => {
    expectTypeOf(resolveSpacingProps)
      .parameter(0)
      .toExtend<
        Partial<
          Record<string, ResponsiveValueStrict<number> | number | undefined>
        >
      >();

    // @ts-expect-error "pp" is not a valid SpacingKey
    resolveSpacingProps({ pp: 4 });

    // @ts-expect-error "tablet" is not a valid default breakpoint key
    resolveSpacingProps({ p: { tablet: 4 } });
  });
});

describe("resolveSpacing prop parameter", () => {
  it("accepts a custom spacing.properties key without a cast, keeping SpacingKey in the union", () => {
    expectTypeOf(resolveSpacing("inset", 4)).toHaveProperty("className");
    expectTypeOf<SpacingKey>().toExtend<Parameters<typeof resolveSpacing>[0]>();
    expectTypeOf<string>().toExtend<Parameters<typeof resolveSpacing>[0]>();
  });

  it("still rejects a non-string prop and a bad value", () => {
    expectTypeOf(resolveSpacing).parameter(0).not.toBeNumber();
    // @ts-expect-error prop must be a string
    resolveSpacing(4, 4);
    // @ts-expect-error unknown breakpoint key stays an error for a custom prop
    resolveSpacing("inset", { tablet: 4 });
  });
});

describe("default breakpoint keys match the CSS (md/lg)", () => {
  it("accepts md/lg and rejects xl/sm by default", () => {
    expectTypeOf(
      resolveSpacing("p", { base: 4, md: 8, lg: 16 }),
    ).toHaveProperty("className");
    // @ts-expect-error the default spacing CSS has no xl rule
    resolveSpacing("p", { base: 4, xl: 16 });
    // @ts-expect-error the default spacing CSS has no sm rule
    resolveSpacingProps({ p: { sm: 4 } });
  });

  it("accepts custom keys through an explicit BKeys, and still rejects others", () => {
    expectTypeOf(
      resolveSpacing<"md" | "lg" | "xl">("p", { base: 4, xl: 16 }),
    ).toHaveProperty("className");
    // @ts-expect-error "lg" is not in the explicit BKeys
    resolveSpacingProps<"md" | "xl">({ p: { lg: 4 } });
  });
});
