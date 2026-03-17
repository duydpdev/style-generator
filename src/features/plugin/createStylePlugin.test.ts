import { vi, describe, it, expect } from "vitest";

import { createStylePlugin } from "./createStylePlugin";

const minimalTheme = {
  colors: {
    primary: "#007AFF",
    main: "#111111",
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

  it("injects :root CSS variables via addBase (v3)", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, { tailwindVersion: 3 });
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const rootBase = bases.find((b) => ":root" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(rootBase).toBeDefined();
    if (rootBase) {
      expect(rootBase[":root"]).toHaveProperty("--color-primary", "#007AFF");
      expect(rootBase[":root"]).toHaveProperty("--color-main", "#111111");
    }
  });

  it("injects html[data-theme] overrides for each theme", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(
      {
        ...minimalTheme,
        themes: { dark: { colors: { primary: "#0A84FF" } } },
      },
      { tailwindVersion: 3 },
    );
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const darkBase = bases.find((b) => "html[data-theme='dark']" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(darkBase).toBeDefined();
    if (darkBase) {
      expect(darkBase["html[data-theme='dark']"]).toHaveProperty(
        "--color-primary",
        "#0A84FF",
      );
    }
  });

  it("generates typography utilities via addUtilities", () => {
    const utilities: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, { tailwindVersion: 3 });
    runHandler(plugin, { onUtilities: (u) => utilities.push(u) });

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    expect(flat).toHaveProperty(".heading");
    expect((flat[".heading"] as Record<string, unknown>).fontSize).toBe("2rem");
  });

  it("v3: passes color var refs to theme.extend.colors", () => {
    const plugin = createStylePlugin(minimalTheme, { tailwindVersion: 3 });
    const config = plugin.config as {
      theme?: { extend?: { colors?: Record<string, unknown> } };
    };
    const colors = config.theme?.extend?.colors;
    expect(colors).toHaveProperty("primary");
    expect(colors?.primary).toBe("var(--color-primary)");
  });

  it("v4: does NOT register theme.extend.colors", () => {
    const plugin = createStylePlugin(minimalTheme, { tailwindVersion: 4 });
    const config = plugin.config as {
      theme?: { extend?: { colors?: Record<string, unknown> } };
    };
    expect(config.theme?.extend?.colors).toBeUndefined();
  });

  it("v4: still injects :root CSS variables", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, { tailwindVersion: 4 });
    runHandler(plugin, { onBase: (b) => bases.push(b) });

    const rootBase = bases.find((b) => ":root" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(rootBase).toBeDefined();
    if (rootBase) {
      expect(rootBase[":root"]).toHaveProperty("--color-primary", "#007AFF");
    }
  });

  it("skips spacing rules when spacing.enabled=false", () => {
    const utilities: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, {
      spacing: { enabled: false },
      tailwindVersion: 3,
    });
    runHandler(plugin, { onUtilities: (u) => utilities.push(u) });

    const flat = Object.assign({}, ...utilities) as Record<string, unknown>;
    const hasSpacing = Object.keys(flat).some((k) => k.startsWith(".sp-"));
    expect(hasSpacing).toBe(false);
  });

  it("cssVarDriven=true injects --typography-* vars into :root and uses them in utilities", () => {
    const bases: Record<string, unknown>[] = [];
    const utilities: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(minimalTheme, {
      typography: { cssVarDriven: true },
      tailwindVersion: 3,
    });
    runHandler(plugin, {
      onBase: (b) => bases.push(b),
      onUtilities: (u) => utilities.push(u),
    });

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
});
