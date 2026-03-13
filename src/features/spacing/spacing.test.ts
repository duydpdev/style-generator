import type { PluginAPI } from "tailwindcss/plugin";
import { describe, it, expect, vi } from "vitest";

import { generateSpacingRules } from "./spacing";

const createMockPluginAPI = () => {
  const bases: Record<string, unknown>[] = [];
  const utilities: Record<string, unknown>[] = [];
  const matchedUtilities: { utils: unknown; options: unknown }[] = [];

  const api = {
    addBase: vi.fn((base: Record<string, unknown>) => {
      bases.push(base);
    }),
    addUtilities: vi.fn((utils: Record<string, unknown>) => {
      utilities.push(utils);
    }),
    matchUtilities: vi.fn((utils: unknown, opts: unknown) => {
      matchedUtilities.push({ utils, options: opts });
    }),
    theme: vi.fn((key: string) => {
      if (key === "spacing")
        return { 0: "0px", 1: "0.25rem", 2: "0.5rem", 4: "1rem", 8: "2rem" };
      return {};
    }),
  } as unknown as PluginAPI;

  return { api, bases, utilities, matchedUtilities };
};

describe("generateSpacingRules", () => {
  it("registers .sp-p utility with addUtilities (responsive mode)", () => {
    const { api, utilities } = createMockPluginAPI();

    generateSpacingRules(
      api,
      { spacing: { properties: { p: { padding: "var(--sp-p)" } } } },
      { md: "768px" },
    );

    expect(utilities.length).toBeGreaterThan(0);
    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".sp-p");
    expect((flat[".sp-p"] as Record<string, string>).padding).toBe(
      "var(--tw-sp-p)",
    );
  });

  it("builds responsive fallback chain var(--sp-p-md, var(--sp-p)) when enableResponsive=true", () => {
    const { api, bases } = createMockPluginAPI();

    generateSpacingRules(
      api,
      {
        enableResponsive: true,
        breakpoints: ["md"],
        spacing: { properties: { p: { padding: "var(--sp-p)" } } },
      },
      { md: "768px" },
    );

    const mediaBase = bases.find((b) => "@media (min-width: 768px)" in b) as
      | Record<string, Record<string, Record<string, string>>>
      | undefined;

    expect(mediaBase).toBeDefined();
    if (mediaBase) {
      const starRule = mediaBase["@media (min-width: 768px)"]["*"];
      expect(starRule["--tw-sp-p"]).toContain("var(--sp-p-md");
    }
  });

  it("uses direct var(--sp-p) when enableResponsive=false", () => {
    const { api, utilities } = createMockPluginAPI();

    generateSpacingRules(
      api,
      {
        enableResponsive: false,
        spacing: { properties: { p: { padding: "var(--sp-p)" } } },
      },
      {},
    );

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".sp-p");
    // In flat (non-responsive) mode, utilities reference --sp-p directly (no intermediate --tw-sp-p)
    expect((flat[".sp-p"] as Record<string, string>).padding).toBe(
      "var(--sp-p)",
    );
  });

  it("registers matchUtilities when spacing.useMatchUtilities=true", () => {
    const { api, matchedUtilities } = createMockPluginAPI();

    generateSpacingRules(
      api,
      {
        spacing: {
          properties: { p: { padding: "var(--sp-p)" } },
          useMatchUtilities: true,
        },
      },
      {},
    );

    expect(matchedUtilities.length).toBe(1);
    const registered = matchedUtilities[0].utils as Record<
      string,
      (v: string) => Record<string, string>
    >;
    expect(registered).toHaveProperty("sp-p");
    expect(registered["sp-p"]("1rem")).toEqual({ padding: "1rem" });
  });

  it("static .sp-p and matchUtilities sp-p coexist when both enabled", () => {
    const { api, utilities, matchedUtilities } = createMockPluginAPI();

    generateSpacingRules(
      api,
      {
        spacing: {
          properties: { p: { padding: "var(--sp-p)" } },
          useMatchUtilities: true,
        },
      },
      { md: "768px" },
    );

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".sp-p"); // static class still exists
    expect(matchedUtilities.length).toBe(1); // JIT matchUtility registered
  });

  it("uses custom spacing properties when spacing.properties provided", () => {
    const { api, utilities } = createMockPluginAPI();

    generateSpacingRules(
      api,
      {
        enableResponsive: false,
        spacing: {
          properties: {
            "custom-gap": { gap: "var(--sp-custom-gap)" },
          },
        },
      },
      {},
    );

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".sp-custom-gap");
    expect(flat).not.toHaveProperty(".sp-p"); // default props not used
  });

  it("does not call matchUtilities when useMatchUtilities is false (default)", () => {
    const { api, matchedUtilities } = createMockPluginAPI();

    generateSpacingRules(api, {}, { md: "768px" });

    expect(matchedUtilities.length).toBe(0);
  });
});
