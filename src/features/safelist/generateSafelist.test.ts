import { describe, it, expect } from "vitest";

import { ThemeConfig } from "../../core/ThemeConfig";

import { generateSafelist } from "./generateSafelist";

describe("generateSafelist", () => {
  const mockTheme: ThemeConfig = {
    colors: {
      primary: "#007AFF",
      muted: {
        DEFAULT: "#666666",
        darker: "#333333",
      },
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

  it("should handle nested color keys and DEFAULT when safelistColors=true", () => {
    const list = generateSafelist(mockTheme, { safelistColors: true });
    expect(list).toContain("text-muted");
    expect(list).toContain("text-muted-darker");
    expect(list).toContain("bg-muted");
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
    expect(list).toContain("md:text-muted-darker");
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
});
