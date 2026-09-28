import { describe, it, expectTypeOf } from "vitest";

// Import via root barrel
import * as root from "../index";

// Import via subpath barrels (v4 new paths — resolved via `src/exports/*`
// which is how consumers will see them after exports map resolves).
import * as tokens from "./tokens";
import * as cva from "./cva";
import * as spacing from "./spacing";

describe("subpath exports — symbols match root barrel", () => {
  it("tokens subpath", () => {
    expectTypeOf(tokens.createDesignTokens).toEqualTypeOf<
      typeof root.createDesignTokens
    >();
    expectTypeOf(tokens.defineTheme).toEqualTypeOf<typeof root.defineTheme>();
    expectTypeOf(tokens.defineOptions).toEqualTypeOf<
      typeof root.defineOptions
    >();
  });

  it("cva subpath", () => {
    expectTypeOf(cva.createVariantMapper).toEqualTypeOf<
      typeof root.createVariantMapper
    >();
  });

  it("spacing subpath", () => {
    expectTypeOf(spacing.resolveSpacing).toEqualTypeOf<
      typeof root.resolveSpacing
    >();
    expectTypeOf(spacing.resolveSpacingProps).toEqualTypeOf<
      typeof root.resolveSpacingProps
    >();
    expectTypeOf(spacing.DEFAULT_SPACING_PROPERTIES).toEqualTypeOf<
      typeof root.DEFAULT_SPACING_PROPERTIES
    >();
  });
});
