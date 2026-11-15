import { describe, expectTypeOf, it } from "vitest";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import {
  axisAttributes,
  intents,
  type tokens,
  type BoxSpacingProps,
  type Intent,
  type Theme,
} from "../src";
import type { AltTheme } from "../src/alt";

type AltColor = ColorVariant<AltTheme>;

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

  it("the alt theme rejects the sample theme's intents", () => {
    expectTypeOf<"brand" | "onBrand">().toExtend<AltColor>();
    // @ts-expect-error "primary" is not a color of the alt theme
    const bad = ["primary"] as const satisfies readonly AltColor[];
    expectTypeOf(bad).toEqualTypeOf<readonly ["primary"]>();
  });

  it("the breakpoint keys are the generated tokens' literal tuple", () => {
    expectTypeOf<(typeof tokens)["breakpoints"][number]>().toEqualTypeOf<
      "md" | "lg"
    >();
  });

  it("Box spacing accepts md/lg and rejects any other breakpoint", () => {
    const valid: BoxSpacingProps = { p: 4, gapX: { base: 2, md: 4, lg: 6 } };
    expectTypeOf(valid).toExtend<BoxSpacingProps>();

    // @ts-expect-error `xl` is not in tokens.breakpoints
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
