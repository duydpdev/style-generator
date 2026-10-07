import { describe, it, expectTypeOf } from "vitest";
import type { z } from "zod";

import type {
  CategoryKey,
  CssVarCategoryKey,
} from "../features/registry/builtInCategories";

import { defineTheme } from "./defineTheme";
import type {
  ThemeSchema,
  ThemeConfig,
  ThemeCssVarSource,
} from "./themeSchema";

describe("ThemeSchema type inference", () => {
  it("z.infer<typeof ThemeSchema> is exactly the exported ThemeConfig type", () => {
    expectTypeOf<z.infer<typeof ThemeSchema>>().toEqualTypeOf<ThemeConfig>();
  });

  it("ThemeConfig's category fields and the registry's CategoryKey agree", () => {
    expectTypeOf<CategoryKey>().toExtend<keyof ThemeConfig>();
    expectTypeOf<keyof ThemeCssVarSource>().toEqualTypeOf<CssVarCategoryKey>();
    expectTypeOf<CssVarCategoryKey>().toExtend<CategoryKey>();
  });

  it("defineTheme() preserves the literal shape of its input for downstream inference", () => {
    expectTypeOf(defineTheme({ colors: { primary: "#fff" } })).toExtend<{
      colors: { primary: string };
    }>();
  });

  it("ThemeConfig.themeAxes accepts two or more simultaneous axis keys", () => {
    expectTypeOf<ThemeConfig>().toHaveProperty("themeAxes");
    const theme = defineTheme({
      colors: { primary: "#fff" },
      themeAxes: {
        theme: { dark: { colors: { primary: "#000" } } },
        palette: {
          forest: { colors: { primary: "#0f0" } },
          sunset: { colors: { primary: "#f00" } },
        },
      },
    });
    expectTypeOf(theme.themeAxes).toExtend<{
      theme: { dark: { colors?: { primary?: string } } };
      palette: {
        forest: { colors: { primary: string } };
        sunset: { colors: { primary: string } };
      };
    }>();
  });
});
