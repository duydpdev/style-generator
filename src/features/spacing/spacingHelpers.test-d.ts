import { describe, it, expectTypeOf } from "vitest";

import type { ResponsiveValue, ResponsiveValueStrict } from "./spacingHelpers";

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

describe("ResponsiveValue<T, BKeys> back-compat (still loose)", () => {
  type Loose = ResponsiveValue<number, "base" | "md">;

  it("accepts unknown keys via (string & {}) fallback", () => {
    expectTypeOf<{ base: number; typo: number }>().toExtend<Loose>();
  });

  it("still accepts plain T", () => {
    expectTypeOf<4>().toExtend<Loose>();
  });

  it("keyof loose object branch is wider than 'base' | 'md' due to fallback", () => {
    type ObjectBranch = Extract<Loose, Record<string, unknown>>;
    type Keys = keyof ObjectBranch;
    // Loose collapses to broader key set than Strict — proved via assignability.
    type AcceptsArbitrary = "anyString" extends Keys ? true : false;
    expectTypeOf<AcceptsArbitrary>().toEqualTypeOf<true>();
  });
});
