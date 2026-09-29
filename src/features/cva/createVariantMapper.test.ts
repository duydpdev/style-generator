import { describe, it, expect } from "vitest";

import { createVariantMapper } from "./createVariantMapper";

describe("createVariantMapper", () => {
  it("maps a flat token list under a single prefix", () => {
    const map = createVariantMapper("bg", ["primary", "secondary"] as const);
    expect(map).toEqual({ primary: "bg-primary", secondary: "bg-secondary" });
  });

  it("maps a flat token list under multiple prefixes", () => {
    const map = createVariantMapper(
      ["bg", "text"] as const,
      ["primary"] as const,
    );
    expect(map).toEqual({
      bg: { primary: "bg-primary" },
      text: { primary: "text-primary" },
    });
  });

  describe("{ states }", () => {
    const tokens = [
      "primary",
      "primaryHover",
      "primaryActive",
      "danger",
    ] as const;

    it("chains hover:/active: classes onto a token with matching siblings", () => {
      const map = createVariantMapper("bg", tokens, {
        states: ["hover", "active"],
      });

      expect(map.primary).toBe(
        "bg-primary hover:bg-primary-hover active:bg-primary-active",
      );
    });

    it("keeps a token with no siblings as a plain single class", () => {
      const map = createVariantMapper("bg", tokens, {
        states: ["hover", "active"],
      });

      expect(map.danger).toBe("bg-danger");
    });

    it("keeps sibling tokens themselves as plain single classes", () => {
      const map = createVariantMapper("bg", tokens, {
        states: ["hover", "active"],
      });

      expect(map.primaryHover).toBe("bg-primary-hover");
      expect(map.primaryActive).toBe("bg-primary-active");
    });

    it("only includes the configured states that have a matching sibling", () => {
      const map = createVariantMapper(
        "bg",
        ["primary", "primaryHover"] as const,
        { states: ["hover", "active"] },
      );

      // no `primaryActive` sibling declared -> no `active:` segment
      expect(map.primary).toBe("bg-primary hover:bg-primary-hover");
    });

    it("respects a states list narrower than the sibling naming convention", () => {
      const map = createVariantMapper("bg", tokens, { states: ["hover"] });

      expect(map.primary).toBe("bg-primary hover:bg-primary-hover");
    });

    it("kebab-cases a camelCase state name into a valid Tailwind variant prefix", () => {
      const map = createVariantMapper(
        "bg",
        ["primary", "primaryFocusVisible"] as const,
        { states: ["focusVisible"] },
      );

      expect(map.primary).toBe(
        "bg-primary focus-visible:bg-primary-focus-visible",
      );
    });

    it("supports the prefixes-array overload together with states", () => {
      const map = createVariantMapper(
        ["bg", "text"] as const,
        ["primary", "primaryHover"] as const,
        { states: ["hover"] },
      );

      expect(map.bg.primary).toBe("bg-primary hover:bg-primary-hover");
      expect(map.text.primary).toBe("text-primary hover:text-primary-hover");
      expect(map.bg.primaryHover).toBe("bg-primary-hover");
    });
  });
});
