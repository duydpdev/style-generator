import { describe, it, expectTypeOf } from "vitest";

import type { SpacingKey } from "../../shared/defaultOption";

import { resolveSpacingProps } from "./spacingHelpers";
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
