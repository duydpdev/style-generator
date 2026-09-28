import { describe, it, expectTypeOf } from "vitest";
import type { z } from "zod";

import { defineTheme } from "./defineTheme";
import type { ThemeSchema, ThemeConfig } from "./themeSchema";

describe("ThemeSchema type inference", () => {
  it("z.infer<typeof ThemeSchema> is exactly the exported ThemeConfig type", () => {
    expectTypeOf<z.infer<typeof ThemeSchema>>().toEqualTypeOf<ThemeConfig>();
  });

  it("defineTheme() preserves the literal shape of its input for downstream inference", () => {
    expectTypeOf(defineTheme({ colors: { primary: "#fff" } })).toExtend<{
      colors: { primary: string };
    }>();
  });
});
