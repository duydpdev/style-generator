import { describe, it, expect } from "vitest";

import { flattenToVars, mapToVarRefs } from "./cssVariables";

describe("cssVariables utilities", () => {
  describe("flattenToVars", () => {
    it("should flatten simple key-value pairs with prefix", () => {
      const data = { primary: "#007AFF", secondary: "#5856D6" };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-primary": "#007AFF",
        "--color-secondary": "#5856D6",
      });
    });

    it("should handle nested objects recursively", () => {
      const data = {
        blue: {
          500: "#007AFF",
          600: "#0062CC",
        },
      };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-blue-500": "#007AFF",
        "--color-blue-600": "#0062CC",
      });
    });

    it("should skip 'DEFAULT' key in variable path", () => {
      const data = {
        primary: {
          DEFAULT: "#007AFF",
          foreground: "#FFFFFF",
        },
      };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-primary": "#007AFF",
        "--color-primary-foreground": "#FFFFFF",
      });
    });

    it("should handle mixed flat and nested structures with DEFAULT", () => {
      const data = {
        background: "#FFFFFF",
        card: {
          DEFAULT: "#F9F9F9",
          foreground: "#111111",
        },
      };
      const result = flattenToVars("color", data);
      expect(result).toEqual({
        "--color-background": "#FFFFFF",
        "--color-card": "#F9F9F9",
        "--color-card-foreground": "#111111",
      });
    });
  });

  describe("mapToVarRefs", () => {
    it("should create var() references for simple keys", () => {
      const data = { primary: "#007AFF" };
      const result = mapToVarRefs("color", data);
      expect(result).toEqual({
        primary: "var(--color-primary)",
      });
    });

    it("should handle nested references recursively", () => {
      const data = {
        blue: {
          500: "#007AFF",
        },
      };
      const result = mapToVarRefs("color", data);
      expect(result).toEqual({
        blue: {
          500: "var(--color-blue-500)",
        },
      });
    });

    it("should handle DEFAULT key correctly in references", () => {
      const data = {
        primary: {
          DEFAULT: "#007AFF",
          foreground: "#FFFFFF",
        },
      };
      const result = mapToVarRefs("color", data);
      expect(result).toEqual({
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
      });
    });
  });
});
