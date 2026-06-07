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

  it("v3 full theme: extends boxShadow / backdropBlur / borderRadius / borderWidth", () => {
    const plugin = createStylePlugin(
      {
        ...minimalTheme,
        shadows: { sm: "0 1px 2px #0000000d" },
        backDropBlurs: { sm: "4px" },
        borderRadius: { md: "8px" },
        border: { thin: "1px", thick: "2px" },
      },
      { tailwindVersion: 3 },
    );
    const cfg = plugin.config as {
      theme?: {
        extend?: {
          boxShadow?: Record<string, unknown>;
          backdropBlur?: Record<string, unknown>;
          borderRadius?: Record<string, unknown>;
          borderWidth?: Record<string, unknown>;
        };
      };
    };
    expect(cfg.theme?.extend?.boxShadow).toHaveProperty("sm");
    expect(cfg.theme?.extend?.backdropBlur).toHaveProperty("sm");
    expect(cfg.theme?.extend?.borderRadius).toHaveProperty("md");
    expect(cfg.theme?.extend?.borderWidth).toHaveProperty("thin");
  });

  it("v4 full theme: only borderWidth in extend (no colors/shadow)", () => {
    const plugin = createStylePlugin(
      {
        ...minimalTheme,
        shadows: { sm: "0 1px 2px #0000000d" },
        borderRadius: { md: "8px" },
        border: { thin: "1px" },
      },
      { tailwindVersion: 4 },
    );
    const cfg = plugin.config as {
      theme?: { extend?: Record<string, unknown> };
    };
    const extend = cfg.theme?.extend ?? {};
    expect(extend).not.toHaveProperty("boxShadow");
    expect(extend).not.toHaveProperty("backdropBlur");
    expect(extend).not.toHaveProperty("borderRadius");
    expect(extend).toHaveProperty("borderWidth");
  });

  it("v3 minimal theme: shadow/backdropBlur/borderRadius/border defaults to {}", () => {
    const plugin = createStylePlugin(minimalTheme, { tailwindVersion: 3 });
    const cfg = plugin.config as {
      theme?: { extend?: Record<string, Record<string, unknown>> };
    };
    expect(cfg.theme?.extend?.boxShadow).toStrictEqual({});
    expect(cfg.theme?.extend?.backdropBlur).toStrictEqual({});
    expect(cfg.theme?.extend?.borderRadius).toStrictEqual({});
    expect(cfg.theme?.extend?.borderWidth).toStrictEqual({});
  });

  it("enableResponsive=false: mergedScreens empty passed to spacing", () => {
    // No throw + handler runs. Regression guard for the branch `? allScreens : {}`.
    const plugin = createStylePlugin(minimalTheme, {
      tailwindVersion: 3,
      enableResponsive: false,
    });
    expect(() => {
      runHandler(plugin, {
        onBase: vi.fn(),
        onUtilities: vi.fn(),
      });
    }).not.toThrow();
  });

  it("themes override with only shadows (no colors) still emits data-theme block", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(
      {
        ...minimalTheme,
        themes: { dark: { shadows: { sm: "0 1px 2px #fff" } } },
      },
      { tailwindVersion: 3 },
    );
    runHandler(plugin, { onBase: (b) => bases.push(b) });
    const darkBase = bases.find((b) => "html[data-theme='dark']" in b) as
      | Record<string, Record<string, string>>
      | undefined;
    expect(darkBase).toBeDefined();
    expect(darkBase?.["html[data-theme='dark']"]).toHaveProperty("--shadow-sm");
  });

  it("empty theme override block is skipped (no data-theme emitted)", () => {
    const bases: Record<string, unknown>[] = [];
    const plugin = createStylePlugin(
      { ...minimalTheme, themes: { empty: {} } },
      { tailwindVersion: 3 },
    );
    runHandler(plugin, { onBase: (b) => bases.push(b) });
    const emptyBase = bases.find((b) => "html[data-theme='empty']" in b);
    expect(emptyBase).toBeUndefined();
  });

  it("auto-detects Tailwind version when tailwindVersion option omitted", () => {
    // Default loader reads devDep tailwindcss@^4.2.1 → expect v4 shape
    const plugin = createStylePlugin(minimalTheme);
    const cfg = plugin.config as {
      theme?: { extend?: Record<string, unknown> };
    };
    // v4 path doesn't set extend.colors
    expect(cfg.theme?.extend).not.toHaveProperty("colors");
  });
});
