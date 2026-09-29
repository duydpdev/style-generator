import { describe, it, expect } from "vitest";

import { ThemeSchema } from "./themeSchema";

const baseTheme = {
  colors: { primary: "#3B82F6" },
};

describe("ThemeSchema — valid themes", () => {
  it("parses a theme with only the required colors field", () => {
    expect(ThemeSchema.safeParse(baseTheme).success).toBe(true);
  });

  it("parses a full theme (typography, shadows, blurs, radius, borderWidth, themes)", () => {
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
      themes: {
        dark: {
          colors: { primary: "#60A5FA" },
          shadows: { sm: "0 1px 2px rgba(255,255,255,.1)" },
        },
      },
    });
    expect(result.success).toBe(true);
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

  it("rejects an unrecognized key inside a themes override", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      themes: {
        dark: { colors: { primary: "#000" }, typography: {} },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a themes override key with no matching base key (produces no utility)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      themes: {
        dark: { colors: { primary: "#000", background: "#111" } },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "themes",
      "dark",
      "colors",
      "background",
    ]);
    expect(result.error?.issues[0]?.message).toMatch(/no utility/);
  });

  it("rejects an alias target that doesn't exist", () => {
    const result = ThemeSchema.safeParse({ colors: { a: "$b" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/references unknown key/);
  });

  it("rejects an alias cycle", () => {
    const result = ThemeSchema.safeParse({ colors: { a: "$b", b: "$a" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/cycle detected/);
  });

  it("rejects a $-alias in borderWidth/fontFamily targeting an unknown key (AC4: ALIAS_CATEGORIES tracks every ThemeCssVarShape category)", () => {
    const borderWidthResult = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      borderWidth: { a: "$nope" },
    });
    expect(borderWidthResult.success).toBe(false);
    expect(borderWidthResult.error?.issues[0]?.path).toEqual([
      "borderWidth",
      "a",
    ]);
    expect(borderWidthResult.error?.issues[0]?.message).toMatch(
      /references unknown key/,
    );

    const fontFamilyResult = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { a: "$nope" },
    });
    expect(fontFamilyResult.success).toBe(false);
    expect(fontFamilyResult.error?.issues[0]?.path).toEqual([
      "fontFamily",
      "a",
    ]);
  });

  it("rejects a borderWidth key that collides with a colors key", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      borderWidth: { primary: "1px" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(
      /collides with a colors key/,
    );
  });

  it("rejects a fontFamily key that collides with a Tailwind font-weight utility", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { bold: "Arial" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/font-weight utility/);
  });

  it("rejects a $-prefixed value in typography (aliases are not supported there)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      typography: {
        body: {
          fontSize: "$primary",
          lineHeight: "150%",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(
      /aliases are not supported in typography/,
    );
  });

  it("rejects keys in the same record that kebab-case to the same value", () => {
    const result = ThemeSchema.safeParse({
      colors: { blue500: "#00f", "blue-500": "#00f" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/kebab-case to/);
  });
});
