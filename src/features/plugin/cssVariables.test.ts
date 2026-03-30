import { describe, it, expect } from "vitest";

import { flattenToVars, mapToVarRefs } from "./cssVariables";

describe("cssVariables utilities", () => {
  describe("flattenToVars", () => {
    it("should flatten flat key-value pairs with prefix", () => {
      const data = { primary: "#007AFF", secondary: "#5856D6" };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-primary": "#007AFF",
        "--color-secondary": "#5856D6",
      });
    });

    it("should convert camelCase keys to kebab-case", () => {
      const data = { sidebarForeground: "#fff", primaryBlue: "#007" };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-sidebar-foreground": "#fff",
        "--color-primary-blue": "#007",
      });
    });

    it("should handle already kebab-case keys", () => {
      const data = { "sidebar-foreground": "#fff" };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-sidebar-foreground": "#fff",
      });
    });
  });

  describe("mapToVarRefs", () => {
    it("should create var() references for flat keys", () => {
      const data = { primary: "#007AFF" };
      const result = mapToVarRefs("color", data);
      expect(result).toEqual({
        primary: "var(--color-primary)",
      });
    });

    it("should convert camelCase keys to kebab-case var() refs", () => {
      const data = { sidebarForeground: "#fff", primaryBlue: "#007" };
      const result = mapToVarRefs("color", data);
      expect(result).toEqual({
        "sidebar-foreground": "var(--color-sidebar-foreground)",
        "primary-blue": "var(--color-primary-blue)",
      });
    });
  });
});
