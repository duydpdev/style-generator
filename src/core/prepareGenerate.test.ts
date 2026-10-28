import { describe, expect, it } from "vitest";
import { z } from "zod";

import { generate } from "./generate";
import { generateFromParsed } from "./generateFromParsed";
import { prepareGenerate } from "./prepareGenerate";
import type { PrepareStage } from "./prepareGenerate";
import type { ThemeConfig } from "./themeSchema";

const theme: ThemeConfig = {
  colors: { brand: "#00f", primary: "$brand" },
  borderRadius: { md: "6px" },
  themeAxes: { theme: { dark: { colors: { brand: "#0af" } } } },
};

const stagesOf = (run: (onStage: (s: PrepareStage) => void) => void) => {
  const stages: PrepareStage[] = [];
  let error: unknown;
  try {
    run((s) => stages.push(s));
  } catch (e) {
    error = e;
  }
  return { stages, error };
};

describe("prepareGenerate", () => {
  it("runs options, theme, then the theme × options checks, and returns both results", () => {
    const { stages, error } = stagesOf((onStage) => {
      const { parsed, resolved } = prepareGenerate(theme, {}, onStage);
      expect(parsed).toEqual(theme);
      expect(resolved.axes.scope).toBe("root");
    });
    expect(error).toBeUndefined();
    expect(stages).toEqual(["options", "theme", "cross"]);
  });

  it("stops at the options when they are invalid: the theme is never looked at", () => {
    const { stages, error } = stagesOf((onStage) => {
      prepareGenerate(
        { colors: { primary: "{" } },
        { extraSources: ["a;b"] },
        onStage,
      );
    });
    expect(stages).toEqual(["options"]);
    expect(error).toBeInstanceOf(z.ZodError);
  });

  it("stops at the theme when only the theme is invalid", () => {
    const { stages, error } = stagesOf((onStage) => {
      prepareGenerate({ colors: { primary: "{" } }, {}, onStage);
    });
    expect(stages).toEqual(["options", "theme"]);
    expect(error).toBeInstanceOf(z.ZodError);
  });

  it("reaches the cross stage for a theme × options conflict, as one ZodError with every issue", () => {
    const { stages, error } = stagesOf((onStage) => {
      prepareGenerate(
        theme,
        { axes: { scope: "element" }, resetTailwindDefaults: ["shadow"] },
        onStage,
      );
    });
    expect(stages).toEqual(["options", "theme", "cross"]);
    expect(error).toBeInstanceOf(z.ZodError);
    expect((error as z.ZodError).issues.map((i) => i.path.join("."))).toEqual([
      "themeAxes.theme.dark.colors.brand",
      "resetTailwindDefaults.0",
    ]);
  });

  it("works without a callback and without options", () => {
    expect(prepareGenerate(theme).resolved.resetTailwindDefaults).toEqual([]);
  });

  it("throws the plain ZodError, unwrapped, like generate()", () => {
    const bad = { colors: { primary: "{" } };
    const viaGenerate = (() => {
      try {
        generate(bad);
      } catch (e) {
        return e;
      }
    })();
    const viaPrepare = (() => {
      try {
        prepareGenerate(bad);
      } catch (e) {
        return e;
      }
    })();
    expect(viaPrepare).toBeInstanceOf(z.ZodError);
    expect((viaPrepare as z.ZodError).issues).toEqual(
      (viaGenerate as z.ZodError).issues,
    );
  });

  it("generate().css is exactly generateFromParsed of the prepared theme", () => {
    const options = {
      breakpoints: ["md"],
      resetTailwindDefaults: ["colors"],
    } as const;
    const { parsed, resolved } = prepareGenerate(theme, options);
    expect(generateFromParsed(parsed, resolved)).toBe(
      generate(theme, options).css,
    );
  });
});
