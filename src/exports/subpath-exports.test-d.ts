import { describe, it, expectTypeOf } from "vitest";

// Import via root barrel
import type * as root from "../index";

// Import via subpath barrels (v4 new paths — resolved via `src/exports/*`
// which is how consumers will see them after exports map resolves).
import * as tokens from "./tokens";
import * as cva from "./cva";
import * as spacing from "./spacing";
import type * as types from "./types";

describe("subpath exports — symbols match root barrel", () => {
  it("tokens subpath", () => {
    expectTypeOf(tokens.createDesignTokens).toEqualTypeOf<
      typeof root.createDesignTokens
    >();
  });

  it("tokens subpath does not re-export defineTheme/defineOptions (root-only, keeps Zod out of the browser-safe bundle)", () => {
    expectTypeOf<"defineTheme">().not.toExtend<keyof typeof tokens>();
    expectTypeOf<"defineOptions">().not.toExtend<keyof typeof tokens>();
  });

  it("cva subpath", () => {
    expectTypeOf(cva.createVariantMapper).toEqualTypeOf<
      typeof root.createVariantMapper
    >();
  });

  it("COLOR_STATES is one shared const across root, tokens and cva", () => {
    expectTypeOf(tokens.COLOR_STATES).toEqualTypeOf<
      readonly ["hover", "active"]
    >();
    expectTypeOf(cva.COLOR_STATES).toEqualTypeOf<typeof tokens.COLOR_STATES>();
    expectTypeOf(cva.COLOR_STATES).toEqualTypeOf<typeof root.COLOR_STATES>();
  });

  it("VariantMapperStatesOptions is exported from root, cva and types", () => {
    expectTypeOf<cva.VariantMapperStatesOptions>().toEqualTypeOf<root.VariantMapperStatesOptions>();
    expectTypeOf<types.VariantMapperStatesOptions>().toEqualTypeOf<root.VariantMapperStatesOptions>();
    expectTypeOf(cva.COLOR_STATES).toExtend<
      cva.VariantMapperStatesOptions["states"]
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
