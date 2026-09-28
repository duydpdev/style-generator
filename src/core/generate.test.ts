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
  themes: {
    dark: { colors: { primary: "#60A5FA", background: "#111827" } },
  },
});

describe("generate", () => {
  it("returns { css, tokens }", () => {
    const result = generate(theme);
    expect(typeof result.css).toBe("string");
    expect(result.tokens).toBeDefined();
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
});
