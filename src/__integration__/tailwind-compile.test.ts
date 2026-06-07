import { describe, it, expect } from "vitest";
import { compile } from "@tailwindcss/node";

import { createStyleSystem } from "../core/createStyleSystem";
import { defineTheme } from "../core/defineTheme";

/**
 * End-to-end: feed `themeCss` from createStyleSystem into the real Tailwind v4
 * compiler, then build CSS for a candidate class list. Asserts that:
 *   - color CSS variables appear in :root
 *   - data-theme override block emits when `themes` set
 *   - bg-/text- color utilities resolve to var() refs
 *   - generated CSS contains no raw error markers
 *
 * This is a regression guard against breaking changes in Tailwind v4 internals.
 */
describe("integration: Tailwind v4 compile pipeline", () => {
  const theme = defineTheme({
    colors: {
      primary: "#3B82F6",
      background: "#FFFFFF",
      sidebarForeground: "#111827",
    },
    typography: {
      h1: {
        fontSize: "32px",
        lineHeight: "40px",
        fontWeight: 700,
        letterSpacing: "0",
      },
    },
    themes: {
      dark: { colors: { primary: "#60A5FA", background: "#111827" } },
    },
  });

  const buildCss = async (extraInput = ""): Promise<string> => {
    const { themeCss } = createStyleSystem(theme, { tailwindVersion: 4 });
    const input = `@import "tailwindcss";\n${themeCss}\n${extraInput}`;
    const result = await compile(input, {
      base: process.cwd(),
      onDependency: () => undefined,
    });
    return result.build(["bg-primary", "text-sidebar-foreground"]);
  };

  it("emits :root with --sg-primary intermediate var", async () => {
    const css = await buildCss();
    expect(css).toMatch(/--sg-primary:\s*#3B82F6/i);
    expect(css).toMatch(/--sg-sidebar-foreground:\s*#111827/i);
  });

  it("emits dark theme override block", async () => {
    const css = await buildCss();
    expect(css).toMatch(/\[data-theme=["']dark["']\]/);
    expect(css).toMatch(/--sg-primary:\s*#60A5FA/i);
  });

  it("resolves utilities through @theme inline mapping to --sg-* vars", async () => {
    const css = await buildCss();
    expect(css).toMatch(/\.bg-primary\s*\{[^}]*var\(--sg-primary\)/);
    expect(css).toMatch(
      /\.text-sidebar-foreground\s*\{[^}]*var\(--sg-sidebar-foreground\)/,
    );
  });

  it("compiled CSS has no error markers", async () => {
    const css = await buildCss();
    expect(css).not.toMatch(/error|undefined/i);
  });
});
