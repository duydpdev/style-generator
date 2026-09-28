import { describe, it, expect } from "vitest";

import { ThemeSchema } from "./themeSchema";

const baseTheme = {
  colors: { primary: "#3B82F6" },
};

describe("ThemeSchema — valid themes", () => {
  it("parses a theme with only the required colors field", () => {
    expect(ThemeSchema.safeParse(baseTheme).success).toBe(true);
  });

  it("parses a full theme (typography, shadows, blurs, radius, border, themes)", () => {
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
      border: { hairline: "1px" },
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
});
