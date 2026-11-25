import { describe, it, expect } from "vitest";

import { COLOR_STATES } from "../../shared/colorStates";

import { createVariantMapper } from "./createVariantMapper";

const HOVER = { suffix: "Hover", variant: "hover" } as const;
const ACTIVE = { suffix: "Active", variant: "active" } as const;

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
        states: [HOVER, ACTIVE],
      });

      expect(map.primary).toBe(
        "bg-primary hover:bg-primary-hover active:bg-primary-active",
      );
    });

    it("keeps a token with no siblings as a plain single class", () => {
      const map = createVariantMapper("bg", tokens, {
        states: [HOVER, ACTIVE],
      });

      expect(map.danger).toBe("bg-danger");
    });

    it("keeps sibling tokens themselves as plain single classes", () => {
      const map = createVariantMapper("bg", tokens, {
        states: [HOVER, ACTIVE],
      });

      expect(map.primaryHover).toBe("bg-primary-hover");
      expect(map.primaryActive).toBe("bg-primary-active");
    });

    it("only includes the configured states that have a matching sibling", () => {
      const map = createVariantMapper(
        "bg",
        ["primary", "primaryHover"] as const,
        { states: [HOVER, ACTIVE] },
      );

      // no `primaryActive` sibling declared -> no `active:` segment
      expect(map.primary).toBe("bg-primary hover:bg-primary-hover");
    });

    it("respects a states list narrower than the sibling naming convention", () => {
      const map = createVariantMapper("bg", tokens, { states: [HOVER] });

      expect(map.primary).toBe("bg-primary hover:bg-primary-hover");
    });

    it("prefixes the sibling with the state's variant as given (Selected -> aria-selected)", () => {
      const map = createVariantMapper(
        "bg",
        ["primary", "primarySelected"] as const,
        { states: COLOR_STATES },
      );

      expect(map.primary).toBe("bg-primary aria-selected:bg-primary-selected");
    });

    it("supports the prefixes-array overload together with states", () => {
      const map = createVariantMapper(
        ["bg", "text"] as const,
        ["primary", "primaryHover"] as const,
        { states: [HOVER] },
      );

      expect(map.bg.primary).toBe("bg-primary hover:bg-primary-hover");
      expect(map.text.primary).toBe("text-primary hover:text-primary-hover");
      expect(map.bg.primaryHover).toBe("bg-primary-hover");
    });
  });

  describe("{ opacities }", () => {
    it("adds a token/step key per token and step", () => {
      const map = createVariantMapper("bg", ["primary", "danger"] as const, {
        opacities: [10, 50],
      });
      expect(map).toEqual({
        primary: "bg-primary",
        danger: "bg-danger",
        "primary/10": "bg-primary/10",
        "primary/50": "bg-primary/50",
        "danger/10": "bg-danger/10",
        "danger/50": "bg-danger/50",
      });
    });

    it("keeps state classes on the base key only", () => {
      const map = createVariantMapper(
        "bg",
        ["primary", "primaryHover"] as const,
        { states: [HOVER], opacities: [10] },
      );
      expect(map).toEqual({
        primary: "bg-primary hover:bg-primary-hover",
        primaryHover: "bg-primary-hover",
        "primary/10": "bg-primary/10",
        "primaryHover/10": "bg-primary-hover/10",
      });
      expect(
        Object.values(map).filter((v) => v.includes(":") && v.includes("/")),
      ).toEqual([]);
    });

    it("an empty steps list equals the plain mapper", () => {
      const tokens = ["primary", "blue500"] as const;
      expect(createVariantMapper("bg", tokens, { opacities: [] })).toEqual(
        createVariantMapper("bg", tokens),
      );
    });

    it("supports the prefixes-array overload", () => {
      expect(
        createVariantMapper(["bg", "text"] as const, ["primary"] as const, {
          opacities: [50],
        }),
      ).toEqual({
        bg: { primary: "bg-primary", "primary/50": "bg-primary/50" },
        text: { primary: "text-primary", "primary/50": "text-primary/50" },
      });
    });
  });
});
