import { describe, it, expect } from "vitest";

import { ThemeConfig } from "../../core/ThemeConfig";

import { generateSafelist } from "./generateSafelist";

describe("generateSafelist", () => {
  const mockTheme: ThemeConfig = {
    colors: {
      primary: "#007AFF",
      sidebarForeground: "#666666",
    },
    typography: {
      h1: { fontSize: "1", lineHeight: "1", fontWeight: 1, letterSpacing: "0" },
    },
    shadows: { md: "..." },
  };

  it("should NOT include color classes by default", () => {
    const list = generateSafelist(mockTheme);
    expect(list).not.toContain("bg-primary");
    expect(list).not.toContain("text-primary");
    expect(list).not.toContain("border-primary");
  });

  it("should include color classes when safelistColors=true", () => {
    const list = generateSafelist(mockTheme, { safelistColors: true });
    expect(list).toContain("bg-primary");
    expect(list).toContain("text-primary");
    expect(list).toContain("border-primary");
  });

  it("should convert camelCase color keys to kebab-case classes", () => {
    const list = generateSafelist(mockTheme, { safelistColors: true });
    expect(list).toContain("text-sidebar-foreground");
    expect(list).toContain("bg-sidebar-foreground");
    expect(list).toContain("border-sidebar-foreground");
  });

  it("should include typography and shadow classes", () => {
    const list = generateSafelist(mockTheme);
    expect(list).toContain("h-1");
    expect(list).toContain("shadow-md");
  });

  it("should generate responsive variants when enabled", () => {
    const list = generateSafelist(mockTheme, {
      safelistColors: true,
      enableResponsive: true,
      breakpoints: ["md"],
      responsiveModules: ["colors"],
    });
    expect(list).toContain("md:bg-primary");
    expect(list).toContain("md:text-sidebar-foreground");
  });

  it("should respect module.enabled settings", () => {
    const list = generateSafelist(mockTheme, {
      layout: { enabled: false },
    });
    expect(list).not.toContain("flex");
  });

  it("should include dynamicClasses", () => {
    const list = generateSafelist(mockTheme, {
      dynamicClasses: ["custom-class-123"],
    });
    expect(list).toContain("custom-class-123");
  });

  it("should include sp-* spacing classes by default (non-responsive)", () => {
    const list = generateSafelist(mockTheme);
    expect(list).toContain("sp-p");
    expect(list).toContain("sp-mx");
    expect(list).toContain("sp-gap");
    expect(list).toContain("sp-gap-x");
    expect(list).toContain("sp-gap-y");
    // Non-responsive: no md:sp-*
    expect(list).not.toContain("md:sp-p");
    expect(list).not.toContain("lg:sp-p");
  });

  it("should strip sp-* when spacing.enabled = false", () => {
    const list = generateSafelist(mockTheme, { spacing: { enabled: false } });
    for (const cls of list) {
      expect(cls).not.toMatch(/^sp-/);
    }
  });

  it("should reflect custom spacing.properties keys", () => {
    const list = generateSafelist(mockTheme, {
      spacing: {
        properties: {
          inset: { inset: "var(--sp-inset)" },
        },
      },
    });
    expect(list).toContain("sp-inset");
    expect(list).not.toContain("sp-p"); // overridden, no defaults
  });
});
