import { describe, expectTypeOf, it } from "vitest";
import type {
  BreakpointKeys,
  ColorVariant,
} from "@duydpdev/style-generator/types";

import {
  axisAttributes,
  intents,
  type BoxSpacingProps,
  type Intent,
  type Theme,
  type options,
} from "../src";

describe("design-system types", () => {
  it("intents are a subset of the theme's colors", () => {
    expectTypeOf<Intent>().toEqualTypeOf<
      "primary" | "secondary" | "success" | "danger"
    >();
    expectTypeOf<Intent>().toExtend<ColorVariant<Theme>>();
    expectTypeOf(intents).toEqualTypeOf<
      readonly ["primary", "secondary", "success", "danger"]
    >();
  });

  it("the state siblings are theme colors", () => {
    expectTypeOf<"primaryHover" | "primaryActive" | "onPrimary">().toExtend<
      ColorVariant<Theme>
    >();
    expectTypeOf<"primaryFocus">().not.toExtend<ColorVariant<Theme>>();
  });

  it("the breakpoint keys are the shared options' literal tuple", () => {
    expectTypeOf<BreakpointKeys<typeof options>>().toEqualTypeOf<"md" | "lg">();
  });

  it("Box spacing accepts md/lg and rejects any other breakpoint", () => {
    const valid: BoxSpacingProps = { p: 4, gapX: { base: 2, md: 4, lg: 6 } };
    expectTypeOf(valid).toExtend<BoxSpacingProps>();

    // @ts-expect-error `xl` is not in options.breakpoints
    const invalid: BoxSpacingProps = { p: { xl: 4 } };
    expectTypeOf(invalid).toExtend<BoxSpacingProps>();
  });

  it("axisAttributes is typed by the theme's axes", () => {
    expectTypeOf(
      axisAttributes({ theme: "highContrast", palette: "forest" }),
    ).toEqualTypeOf<Readonly<Record<string, string>>>();
    axisAttributes({ theme: "base", palette: "mono" });
    axisAttributes({});

    // @ts-expect-error "neon" is not a variant of the theme axis
    axisAttributes({ theme: "neon" });
    // @ts-expect-error "contrast" is not an axis of this theme
    axisAttributes({ contrast: "high" });
  });
});
