import { describe, expectTypeOf, it } from "vitest";

import { createDesignTokens } from "./createDesignTokens";

describe("scale category token arrays", () => {
  const { Web } = createDesignTokens(
    {
      colors: { primary: "#000" },
      motionDuration: { fast: "150ms" },
      motionEasing: { standard: "ease-out" },
      controlHeight: { md: "40px" },
      iconSize: { sm: "16px" },
      opacity: { disabled: 0.4, muted: 0.64 },
      zIndex: { modal: 50 },
    },
    { coverage: { colors: { opacities: [10, 50] } } },
  ).DesignTokens;

  it("names each array after its theme field", () => {
    expectTypeOf(Web.motionDuration).toEqualTypeOf<readonly "fast"[]>();
    expectTypeOf(Web.motionEasing).toEqualTypeOf<readonly "standard"[]>();
    expectTypeOf(Web.controlHeight).toEqualTypeOf<readonly "md"[]>();
    expectTypeOf(Web.iconSize).toEqualTypeOf<readonly "sm"[]>();
    expectTypeOf(Web.zIndex).toEqualTypeOf<readonly "modal"[]>();
  });

  it("keeps the opacity scale apart from the colour opacity steps", () => {
    expectTypeOf(Web.opacity).toEqualTypeOf<
      readonly ("disabled" | "muted")[]
    >();
    expectTypeOf(Web.opacities).toEqualTypeOf<readonly (10 | 50)[]>();
    expectTypeOf(Web.opacity).not.toEqualTypeOf(Web.opacities);
  });
});
