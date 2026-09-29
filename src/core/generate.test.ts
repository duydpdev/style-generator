import { describe, it, expect } from "vitest";

import { defineTheme } from "./defineTheme";
import { generate } from "./generate";

const theme = defineTheme({
  colors: {
    primary: "#3B82F6",
    background: "#FFFFFF",
    sidebarForeground: "#111827",
  },
  typography: {
    text12Mono: {
      fontSize: "12px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
    heading: {
      fontSize: "32px",
      lineHeight: "40px",
      fontWeight: 700,
      letterSpacing: "0",
    },
  },
  shadows: { sm: "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  backDropBlurs: { sm: "4px" },
  borderRadius: { sm: "4px" },
  themeAxes: {
    theme: {
      dark: { colors: { primary: "#60A5FA", background: "#111827" } },
    },
  },
});

describe("generate", () => {
  it("returns { css, tokens, schema }", () => {
    const result = generate(theme);
    expect(typeof result.css).toBe("string");
    expect(result.tokens).toBeDefined();
    expect(result.schema).toBeDefined();
  });

  it("schema is the theme JSON Schema (z.toJSONSchema(ThemeSchema))", () => {
    const { schema } = generate(theme);
    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["colors"],
    });
  });

  it("throws before generating CSS when the theme contains an injection-unsafe value", () => {
    expect(() => generate({ colors: { a: "red;}" } })).toThrow();
  });

  it("css contains the :root intermediate vars block", () => {
    const { css } = generate(theme);
    expect(css).toMatch(/:root\s*\{[^}]*--sg-primary:\s*#3B82F6/);
  });

  it("css contains the @theme inline mapping block", () => {
    const { css } = generate(theme);
    expect(css).toMatch(
      /@theme inline\s*\{[^}]*--color-primary:\s*var\(--sg-primary\)/,
    );
  });

  it("css contains @utility <kebab-key> for every typography key", () => {
    const { css } = generate(theme);
    expect(css).toMatch(/@utility text-12-mono \{/);
    expect(css).toMatch(/@utility heading \{/);
  });

  it("css never contains a bare top-level .class{} rule", () => {
    const { css } = generate(theme);
    expect(css).not.toMatch(/^\.[A-Za-z]/m);
  });

  it("tokens reflect the theme (typography/color/shadow/blur/rounded variants)", () => {
    const { tokens } = generate(theme);
    expect(tokens.Web.variantText).toEqual(["text12Mono", "heading"]);
    expect(tokens.Web.variantColor).toContain("primary");
    expect(tokens.Web.variantShadow).toEqual(["sm"]);
    expect(tokens.Web.variantBackdropBlur).toEqual(["sm"]);
  });

  it("omits typography/spacing blocks when the theme has neither", () => {
    const { css } = generate(defineTheme({ colors: { primary: "#fff" } }), {
      spacing: { enabled: false },
    });
    expect(css).not.toMatch(/@utility/);
  });

  it("extraSources: emits one @source inline(...) per entry after the sp-* line", () => {
    const { css } = generate(theme, {
      extraSources: ["hover:bg-{primary,secondary}", "md:flex"],
    });
    expect(css).toMatch(
      /@source inline\("hover:bg-\{primary,secondary\}"\);\n@source inline\("md:flex"\);/,
    );
  });

  it('extraSources: throws on an entry that tries to escape the inline("…") string', () => {
    expect(() =>
      generate(theme, { extraSources: ['x")@import "evil'] }),
    ).toThrow();
  });

  it("extraSources: throws on an empty entry", () => {
    expect(() => generate(theme, { extraSources: [""] })).toThrow();
  });

  it("extraSources: throws on an entry longer than 512 characters", () => {
    expect(() =>
      generate(theme, { extraSources: ["a".repeat(513)] }),
    ).toThrow();
  });
});
