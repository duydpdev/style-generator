import { vi, describe, it, expect } from "vitest";

import { createStylePlugin } from "./createStylePlugin";

const minimalTheme = {
  colors: {
    base: { primary: "#007AFF" },
    text: { main: "#111111" },
  },
  typography: {
    heading: {
      fontSize: "2rem",
      lineHeight: "1.2",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
  },
};

/**
 * Collect addBase calls and run plugin handler.
 * @param {ReturnType<typeof createStylePlugin>} plugin - Tailwind plugin instance returned by createStylePlugin
 * @param {{ onBase?: (b: Record<string, unknown>) => void; onUtilities?: (u: Record<string, unknown>) => void }} [callbacks] - Optional capture callbacks
 * @param {(b: Record<string, unknown>) => void} [callbacks.onBase] - Called for each addBase invocation payload
 * @param {(u: Record<string, unknown>) => void} [callbacks.onUtilities] - Called for each addUtilities invocation payload
 * @returns {void} No return value
 */
const runHandler = (
  plugin: ReturnType<typeof createStylePlugin>,
  callbacks: {
    onBase?: (b: Record<string, unknown>) => void;
    onUtilities?: (u: Record<string, unknown>) => void;
  } = {},
) => {
  plugin.handler({
    addBase: callbacks.onBase ?? vi.fn(),
    addUtilities: callbacks.onUtilities ?? vi.fn(),
    matchUtilities: vi.fn(),
    theme: vi.fn(() => ({})),
  } as never);
};

describe("createStylePlugin", () => {
  it("returns a Tailwind plugin instance", () => {
    const result = createStylePlugin(minimalTheme);
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("handler");
    expect(result).toHaveProperty("config");
  });

  it("injects :root CSS variables via addBase when enableCssVariables=true", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, {
      enableCssVariables: true,
    });
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const rootBase = bases.find((b) => ":root" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(rootBase).toBeDefined();
    if (rootBase) {
      expect(rootBase[":root"]).toHaveProperty(
        "--color-base-primary",
        "#007AFF",
      );
      expect(rootBase[":root"]).toHaveProperty("--color-text-main", "#111111");
    }
  });

  it("injects html[data-theme] overrides for each theme", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(
      {
        ...minimalTheme,
        themes: { dark: { colors: { base: { primary: "#0A84FF" } } } },
      },
      { enableCssVariables: true },
    );
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const darkBase = bases.find((b) => "html[data-theme='dark']" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(darkBase).toBeDefined();
    if (darkBase) {
      expect(darkBase["html[data-theme='dark']"]).toHaveProperty(
        "--color-base-primary",
        "#0A84FF",
      );
    }
  });

  it("skips CSS variables when enableCssVariables=false", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, {
      enableCssVariables: false,
    });
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const rootBase = bases.find((b) => ":root" in b);
    expect(rootBase).toBeUndefined();
  });

  it("generates typography utilities via addUtilities", () => {
    const utilities: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme);
    runHandler(plugin, { onUtilities: (u) => utilities.push(u) });

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".heading");
    // addDot preserves camelCase property names from ThemeConfig
    expect((flat[".heading"] as Record<string, unknown>).fontSize).toBe("2rem");
  });

  it("passes color var refs to theme.extend.colors", () => {
    const plugin = createStylePlugin(minimalTheme, {
      enableCssVariables: true,
    });
    const config = plugin.config as {
      theme?: { extend?: { colors?: Record<string, unknown> } };
    };
    const colors = config.theme?.extend?.colors;
    expect(colors).toHaveProperty("primary");
    expect(colors?.primary).toBe("var(--color-base-primary)");
  });

  it("skips spacing rules when spacing.enabled=false", () => {
    const utilities: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, {
      spacing: { enabled: false },
    });
    runHandler(plugin, { onUtilities: (u) => utilities.push(u) });

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    const hasSpacing = Object.keys(flat).some((k) => k.startsWith(".sp-"));
    expect(hasSpacing).toBe(false);
  });

  it("generates flat color vars with colorNamingMode=flat", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, { colorNamingMode: "flat" });
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const rootBase = bases.find((b) => ":root" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(rootBase).toBeDefined();
    if (rootBase) {
      // flat mode: all namespaces removed → --color-primary (not --color-base-primary)
      expect(rootBase[":root"]).toHaveProperty("--color-primary", "#007AFF");
      expect(rootBase[":root"]).toHaveProperty("--color-main", "#111111");
      // no namespaced vars should exist
      expect(rootBase[":root"]).not.toHaveProperty("--color-base-primary");
      expect(rootBase[":root"]).not.toHaveProperty("--color-text-main");
    }
  });

  it("generates v4 color vars with colorNamingMode=v4", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, { colorNamingMode: "v4" });
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const rootBase = bases.find((b) => ":root" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(rootBase).toBeDefined();
    if (rootBase) {
      // v4: base flattened → --color-primary, text keeps prefix → --color-text-main
      expect(rootBase[":root"]).toHaveProperty("--color-primary", "#007AFF");
      expect(rootBase[":root"]).toHaveProperty("--color-text-main", "#111111");
    }
  });

  it("cssVarDriven=true injects --typography-* vars into :root and uses them in utilities", () => {
    const bases: Record<string, unknown>[] = [];
    const utilities: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, {
      typography: { cssVarDriven: true },
    });
    runHandler(plugin, {
      onBase: (b) => bases.push(b),
      onUtilities: (u) => utilities.push(u),
    });

    // Merge all :root addBase calls (colors and typography each call addBase separately)
    const rootVars = Object.assign(
      {},
      ...bases
        .filter((b) => ":root" in b)
        .map((b) => (b as Record<string, Record<string, string>>)[":root"]),
    ) as Record<string, string>;

    expect(rootVars).toHaveProperty("--typography-heading-font-size", "2rem");
    expect(rootVars).toHaveProperty("--typography-heading-font-weight", "700");

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".heading");
    const headingStyles = flat[".heading"] as Record<string, string>;
    expect(headingStyles["font-size"]).toBe(
      "var(--typography-heading-font-size)",
    );
    expect(headingStyles["font-weight"]).toBe(
      "var(--typography-heading-font-weight)",
    );
  });

  it("disableColorPrefix=true behaves same as colorNamingMode=flat", () => {
    const bases1: Record<string, unknown>[] = [];
    const bases2: Record<string, unknown>[] = [];

    createStylePlugin(minimalTheme, { disableColorPrefix: true }).handler({
      addBase: (b: Record<string, unknown>) => {
        bases1.push(b);
      },
      addUtilities: vi.fn(),
      matchUtilities: vi.fn(),
      theme: vi.fn(() => ({})),
    } as never);

    createStylePlugin(minimalTheme, { colorNamingMode: "flat" }).handler({
      addBase: (b: Record<string, unknown>) => {
        bases2.push(b);
      },
      addUtilities: vi.fn(),
      matchUtilities: vi.fn(),
      theme: vi.fn(() => ({})),
    } as never);

    const root1 = (
      bases1.find((b) => ":root" in b) as Record<string, Record<string, string>>
    )[":root"];
    const root2 = (
      bases2.find((b) => ":root" in b) as Record<string, Record<string, string>>
    )[":root"];
    expect(root1).toEqual(root2);
  });
});
