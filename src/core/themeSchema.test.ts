import { describe, it, expect } from "vitest";

import { ThemeSchema, formatZodError } from "./themeSchema";

const baseTheme = {
  colors: { primary: "#3B82F6" },
};

describe("ThemeSchema — valid themes", () => {
  it("parses a theme with only the required colors field", () => {
    expect(ThemeSchema.safeParse(baseTheme).success).toBe(true);
  });

  it("parses a full theme (typography, shadows, blurs, radius, borderWidth, themeAxes)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#3B82F6", sidebarForeground: "#111827" },
      typography: {
        heading: {
          fontSize: "32px",
          lineHeight: "40px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontFamily: '"Plus Jakarta Sans", system-ui',
          fontStyle: "italic",
        },
      },
      shadows: { sm: "0 1px 2px rgba(0,0,0,.1)" },
      backDropBlurs: { sm: "4px" },
      borderRadius: { sm: "4px" },
      borderWidth: { hairline: "1px" },
      themeAxes: {
        theme: {
          dark: {
            colors: { primary: "#60A5FA" },
            shadows: { sm: "0 1px 2px rgba(255,255,255,.1)" },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts themeAxes with two simultaneous axes (theme + palette)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#3B82F6", secondary: "#10B981" },
      themeAxes: {
        theme: { dark: { colors: { primary: "#60A5FA" } } },
        palette: {
          forest: { colors: { primary: "#2f5f47" } },
          sunset: { colors: { primary: "#b23a1b" } },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it.each(["contrast100", "007", "1e3", "a1"])(
    "accepts the non-canonical-integer variant name %j",
    (variant) => {
      const result = ThemeSchema.safeParse({
        ...baseTheme,
        themeAxes: { contrast: { [variant]: { colors: { primary: "#000" } } } },
      });
      expect(result.success).toBe(true);
    },
  );

  it("accepts an alias declared inside a variant override and keeps it verbatim for emit-time resolution", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#3B82F6", blue500: "#3B82F6" },
      themeAxes: {
        palette: { rose: { colors: { primary: "$blue500" } } },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.themeAxes?.palette?.rose?.colors?.primary).toBe(
      "$blue500",
    );
  });

  it.each([
    "#fff",
    "rgb(0 0 0 / 50%)",
    "var(--x)",
    "0 1px 2px rgba(0,0,0,.1)",
    '"Plus Jakarta Sans", system-ui',
    "calc(0.625rem - 4px)",
    "oklch(0.7 0.1 200)",
    "rgba(245.31, 1, 2, .5)",
  ])("accepts token value %j", (value) => {
    const result = ThemeSchema.safeParse({ colors: { primary: value } });
    expect(result.success).toBe(true);
  });
});

describe("ThemeSchema — invalid themes", () => {
  it("rejects a theme missing colors", () => {
    const result = ThemeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized top-level key (typo colours)", () => {
    const result = ThemeSchema.safeParse({ colors: {}, colours: {} });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });

  it.each(["a b", "-x", "x;y"])("rejects malformed token key %j", (key) => {
    const result = ThemeSchema.safeParse({ colors: { [key]: "#fff" } });
    expect(result.success).toBe(false);
  });

  describe("underscore in token keys (D-S3)", () => {
    const messages = (result: { error?: { issues: unknown[] } }): string =>
      JSON.stringify(result.error?.issues);

    it.each([
      [
        "a color",
        "colors.primary_active",
        { colors: { primary_active: "#fff" } },
      ],
      [
        "a shadow",
        "shadows.drop_soft",
        { colors: { primary: "#fff" }, shadows: { drop_soft: "0 1px #000" } },
      ],
      [
        "a themeAxes axis name",
        "themeAxes.high_contrast",
        {
          colors: { primary: "#fff" },
          themeAxes: {
            high_contrast: { dark: { colors: { primary: "#000" } } },
          },
        },
      ],
      [
        "a themeAxes variant name",
        "themeAxes.theme.dark_mode",
        {
          colors: { primary: "#fff" },
          themeAxes: { theme: { dark_mode: { colors: { primary: "#000" } } } },
        },
      ],
      [
        "an override key",
        "themeAxes.theme.dark.colors.primary_x",
        {
          colors: { primary: "#fff", primary_x: "#111" },
          themeAxes: { theme: { dark: { colors: { primary_x: "#000" } } } },
        },
      ],
    ])("rejects `_` in %s at its own path", (_label, path, theme) => {
      const result = ThemeSchema.safeParse(theme);
      if (result.success) throw new Error("expected failure");
      const lines = formatZodError(result.error).split("\n");
      expect(
        lines.filter(
          (l) => l.startsWith(`${path} → `) && l.includes("`_` is not allowed"),
        ),
      ).toHaveLength(1);
    });

    it("rejects `_` in an alias target by the alias grammar, not as a missing target", () => {
      const result = ThemeSchema.safeParse({
        colors: { primary: "$blue_500", blue500: "#00f" },
      });
      if (result.success) throw new Error("expected failure");
      expect(formatZodError(result.error)).toMatch(
        /^colors\.primary → Alias value "\$blue_500" must match/m,
      );
    });

    it("suggests camelCase or kebab-case in the error message", () => {
      const result = ThemeSchema.safeParse({
        colors: { primary_active: "#fff" },
      });
      expect(result.success).toBe(false);
      expect(messages(result)).toContain("`_` is not allowed");
      expect(messages(result)).toContain("camelCase");
      expect(messages(result)).toContain("kebab-case");
    });

    it("formatZodError prints the key-grammar hint, not Zod's generic record-key message", () => {
      const result = ThemeSchema.safeParse({
        colors: { primary_active: "#fff" },
      });
      if (result.success) throw new Error("expected failure");
      const text = formatZodError(result.error);
      expect(text).toMatch(/^colors\.primary_active → .*`_` is not allowed/m);
      expect(text).not.toContain("Invalid key in record");
    });
  });

  describe("leading-uppercase keys (review M3, D2)", () => {
    it.each([
      ["CTA", "cta"],
      ["ABtn", "abtn"],
      ["HTMLParser", "htmlparser"],
    ])("rejects %j with the rename that keeps its class", (key, rename) => {
      const result = ThemeSchema.safeParse({ colors: { [key]: "#fff" } });
      if (result.success) throw new Error("expected failure");
      expect(formatZodError(result.error)).toMatch(
        new RegExp(
          `^colors\\.${key} → Key "${key}" .*rename it to "${rename}"`,
          "m",
        ),
      );
    });

    it.each([
      [
        "a typography key",
        (k: string) => ({
          colors: { primary: "#fff" },
          typography: {
            [k]: {
              fontSize: "1rem",
              lineHeight: "1.5",
              fontWeight: 400,
              letterSpacing: "0",
            },
          },
        }),
        "typography",
      ],
      [
        "a themeAxes axis name",
        (k: string) => ({
          colors: { primary: "#fff" },
          themeAxes: { [k]: { on: { colors: { primary: "#000" } } } },
        }),
        "themeAxes",
      ],
    ])(
      "rejects them in %s, where the lowercase form parses",
      (_l, build, path) => {
        expect(ThemeSchema.safeParse(build("hc")).success).toBe(true);
        const result = ThemeSchema.safeParse(build("HC"));
        if (result.success) throw new Error("expected failure");
        expect(formatZodError(result.error)).toMatch(
          new RegExp(`^${path}\\.HC → Key "HC" .*rename it to "hc"`, "m"),
        );
      },
    );

    it.each(["primaryCTA", "Blue", "primaryFG", "2xl", "blue500"])(
      "accepts %j, whose class survives the camelCase round trip",
      (key) => {
        expect(
          ThemeSchema.safeParse({ colors: { [key]: "#fff" } }).success,
        ).toBe(true);
      },
    );

    it("reports a malformed key once, with the grammar message only", () => {
      const result = ThemeSchema.safeParse({ colors: { Bad_Key: "#fff" } });
      if (result.success) throw new Error("expected failure");
      const lines = formatZodError(result.error).split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("`_` is not allowed");
    });
  });

  it.each(["red;}body{color:red", "red\n", "url(x)@import", "red/*", '"Inter'])(
    "rejects malformed token value %j",
    (value) => {
      const result = ThemeSchema.safeParse({ colors: { primary: value } });
      expect(result.success).toBe(false);
    },
  );

  it("rejects a typography key whose kebab-case form is not a valid @utility name", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      typography: {
        "2xl": {
          fontSize: "24px",
          lineHeight: "32px",
          fontWeight: 700,
          letterSpacing: "0",
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("2xl");
  });
});

describe("bracket balance in values (X-02)", () => {
  it.each([
    "rgb(0 0 0",
    "calc((1px + 2px)",
    "rgb(0 0 0))",
    "[x",
    "a)b(",
    "var(--a]",
  ])("rejects %s at colors.primary", (value) => {
    const r = ThemeSchema.safeParse({ colors: { primary: value } });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.map((i) => i.path.join("."))).toContain(
      "colors.primary",
    );
    expect(formatZodError(r.error)).toMatch(/^colors\.primary → /m);
  });

  it("rejects it inside typography and shadows too", () => {
    const shadows = ThemeSchema.safeParse({
      colors: { a: "#fff" },
      shadows: { sm: "0 1px 2px rgb(0 0 0" },
    });
    expect(shadows.error?.issues.map((i) => i.path.join("."))).toContain(
      "shadows.sm",
    );
    const typography = ThemeSchema.safeParse({
      colors: { a: "#fff" },
      typography: {
        body: {
          fontSize: "calc(1rem",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    });
    expect(typography.error?.issues.map((i) => i.path.join("."))).toContain(
      "typography.body.fontSize",
    );
  });

  it.each([
    "rgb(0 0 0 / 50%)",
    "calc(var(--a) * 2)",
    "linear-gradient(to right, rgb(0 0 0), rgb(255 255 255))",
    '"Plus Jakarta Sans", system-ui',
    '"Brand (Display", serif',
    "'a]b', serif",
    "#3B82F6",
  ])("accepts balanced value %s", (value) => {
    expect(ThemeSchema.safeParse({ colors: { primary: value } }).success).toBe(
      true,
    );
  });
});
