# Plan: Test Suite

> **Trạng thái: Draft** _(2026-03-04)_  
> **Ưu tiên: Cao** — đảm bảo chất lượng lib khi refactor và thêm feature  
> **Phụ thuộc: Không** (có thể implement trước các plan khác)

---

## Bối cảnh & Vấn đề

### Hiện tại: Không có test

- Không có test framework nào được setup
- Verify bằng `yarn lint` + `yarn build` + manual check
- Khi refactor (TypeScript inference, flexible colors, v.v.), không có safety net
- Regression risk cao khi modify `generateSafelist`, `createStylePlugin`, `buildFallbackChain`

### Rủi ro cụ thể

| Scenario                                         | Risk                               |
| ------------------------------------------------ | ---------------------------------- |
| Refactor `generateSafelist` → output thay đổi    | Class bị purge ở production, UI vỡ |
| Update `buildFallbackChain` → CSS var chain sai  | Responsive spacing không hoạt động |
| Thêm flexible colors → safelist thiếu/thừa class | Color classes bị thiếu hoặc dư     |
| Update `resolveSpacing` → style output sai       | Component spacing bị lỗi           |
| Theme validation false positive                  | Config đúng bị reject              |

---

## Chọn Test Framework

### So sánh

|                   | Vitest                           | Node test runner | Jest          |
| ----------------- | -------------------------------- | ---------------- | ------------- |
| **Setup**         | Minimal (dùng chung Vite config) | Zero dependency  | Nặng          |
| **Speed**         | Rất nhanh                        | Nhanh            | Trung bình    |
| **TypeScript**    | Native (qua Vite)                | Cần tsx          | Cần ts-jest   |
| **Watch mode**    | Có                               | Có (Node 18+)    | Có            |
| **Matchers**      | Chai/expect built-in             | assert module    | Jest matchers |
| **Snapshot**      | Có                               | Không            | Có            |
| **Compatibility** | Dùng chung Vite config hiện có   | Không cần config | Config riêng  |

### Quyết định: **Vitest**

**Lý do**:

1. Project đã dùng Vite build → Vitest dùng chung config, zero friction
2. Snapshot testing hữu ích cho safelist output (detect regression)
3. TypeScript support native
4. Cộng đồng lớn, maintained tốt
5. Watch mode tốt cho DX

---

## Cấu trúc Test

````
tests/
├── factories/
│   ├── createStyleSystem.test.ts
│   ├── createStylePlugin.test.ts
│   ├── generateSafelist.test.ts
│   ├── createDesignTokens.test.ts
│   └── spacing.test.ts
├── utils/
│   ├── helpers.test.ts
│   ├── cssVariables.test.ts
│   └── spacingHelpers.test.ts
├── validation/
│   └── validateTheme.test.ts
├── types/
│   └── inference.test-d.ts         # Type-level tests (tsc only)
├── fixtures/
│   ├── theme-minimal.json          # Minimal valid theme
│   ├── theme-full.json             # Full theme with all fields
│   ├── theme-multi-theme.json      # Theme with dark/light overrides
│   └── theme-custom-colors.json    # Theme with custom color groups (future)

> **Ghi chú về invalid fixtures**: KHÔNG tạo JSON fixture files cho invalid configs.
> Lý do: JSON files luôn parse thành công — "invalid" configs (thiếu field, sai type) chỉ fail ở runtime validation. Nhưng nếu import chúng trong TypeScript, compiler sẽ error vì không match `ThemeConfig` type.
>
> **Thay thế**: Construct invalid configs trực tiếp trong test code:
>
> ```typescript
> // Trong validateTheme.test.ts:
> const missingColors = { typography: {} };                          // Thiếu colors
> const wrongType = { colors: { base: {}, text: {} }, typography: { body: { fontSize: 16 } } };
> ```
>
> Đây là cách đúng vì: (1) không cần maintain fixture files, (2) test case tự mô tả ý đồ, (3) không bị TypeScript complaint.
└── setup.ts                        # Vitest global setup (nếu cần)
````

---

## Chi tiết Test Cases

### 1. `generateSafelist.test.ts`

Đây là test quan trọng nhất — safelist sai = UI production vỡ.

```typescript
import { describe, it, expect } from "vitest";
import { generateSafelist } from "../src/factories/generateSafelist";
import minimalTheme from "./fixtures/theme-minimal.json";
import fullTheme from "./fixtures/theme-full.json";

describe("generateSafelist", () => {
  describe("color classes", () => {
    it("should generate text-*, bg-*, border-* for all color keys", () => {
      const safelist = generateSafelist(minimalTheme);
      expect(safelist).toContain("text-primary");
      expect(safelist).toContain("bg-primary");
      expect(safelist).toContain("border-primary");
      expect(safelist).toContain("text-main");
      expect(safelist).toContain("bg-main");
    });

    it("should kebab-case camelCase color keys", () => {
      const theme = {
        colors: { base: { darkBlue: "#001" }, text: { lightGray: "#999" } },
        typography: {},
      };
      const safelist = generateSafelist(theme);
      expect(safelist).toContain("text-dark-blue");
      expect(safelist).toContain("bg-light-gray");
    });

    it("should not duplicate color classes", () => {
      const safelist = generateSafelist(minimalTheme);
      const textPrimary = safelist.filter((c) => c === "text-primary");
      expect(textPrimary).toHaveLength(1);
    });
  });

  describe("typography classes", () => {
    it("should include kebab-cased typography keys", () => {
      const safelist = generateSafelist(fullTheme);
      expect(safelist).toContain("text-16-medium");
      expect(safelist).toContain("text-32-bold");
    });
  });

  describe("layout classes", () => {
    it("should include default layout classes when enabled", () => {
      const safelist = generateSafelist(minimalTheme);
      expect(safelist).toContain("hidden");
      expect(safelist).toContain("flex");
      expect(safelist).toContain("items-center");
      expect(safelist).toContain("justify-between");
    });

    it("should exclude layout classes when disabled", () => {
      const safelist = generateSafelist(minimalTheme, {
        layout: { enabled: false },
      });
      expect(safelist).not.toContain("hidden");
      expect(safelist).not.toContain("flex");
    });

    it("should use custom layout values when provided", () => {
      const safelist = generateSafelist(minimalTheme, {
        layout: { values: ["flex", "hidden"] },
      });
      expect(safelist).toContain("flex");
      expect(safelist).toContain("hidden");
      expect(safelist).not.toContain("grid");
    });
  });

  describe("responsive variants", () => {
    it("should generate responsive prefixes for responsive modules", () => {
      const safelist = generateSafelist(minimalTheme, {
        breakpoints: ["md", "lg"],
        responsiveModules: ["layout"],
      });
      expect(safelist).toContain("md:hidden");
      expect(safelist).toContain("lg:flex");
    });

    it("should not generate responsive prefixes when disabled", () => {
      const safelist = generateSafelist(minimalTheme, {
        enableResponsive: false,
      });
      expect(safelist).not.toContain("md:hidden");
      expect(safelist).not.toContain("lg:flex");
    });

    it("should respect custom breakpoints", () => {
      const safelist = generateSafelist(minimalTheme, {
        breakpoints: ["sm", "xl"],
        responsiveModules: ["layout"],
      });
      expect(safelist).toContain("sm:hidden");
      expect(safelist).toContain("xl:flex");
      expect(safelist).not.toContain("md:hidden");
    });
  });

  describe("rounded classes", () => {
    it("should include default rounded values", () => {
      const safelist = generateSafelist(minimalTheme);
      expect(safelist).toContain("rounded-none");
      expect(safelist).toContain("rounded-md");
      expect(safelist).toContain("rounded-full");
    });

    it("should include custom borderRadius keys from theme", () => {
      const theme = {
        ...minimalTheme,
        borderRadius: { xl: "16px", "2xl": "24px" },
      };
      const safelist = generateSafelist(theme);
      expect(safelist).toContain("rounded-xl");
      expect(safelist).toContain("rounded-2xl");
    });
  });

  describe("opacity classes", () => {
    it("should include default opacity values", () => {
      const safelist = generateSafelist(minimalTheme);
      expect(safelist).toContain("opacity-0");
      expect(safelist).toContain("opacity-50");
      expect(safelist).toContain("opacity-100");
    });

    it("should exclude opacity when disabled", () => {
      const safelist = generateSafelist(minimalTheme, {
        opacity: { enabled: false },
      });
      expect(safelist).not.toContain("opacity-0");
    });
  });

  describe("dynamic classes", () => {
    it("should include user-defined dynamic classes", () => {
      const safelist = generateSafelist(minimalTheme, {
        dynamicClasses: ["animate-spin", "animate-pulse"],
      });
      expect(safelist).toContain("animate-spin");
      expect(safelist).toContain("animate-pulse");
    });
  });

  describe("snapshot", () => {
    it("should match snapshot for minimal theme with defaults", () => {
      const safelist = generateSafelist(minimalTheme);
      expect(safelist).toMatchSnapshot();
    });

    it("should match snapshot for full theme with defaults", () => {
      const safelist = generateSafelist(fullTheme);
      expect(safelist).toMatchSnapshot();
    });
  });
});
```

### 2. `spacing.test.ts`

```typescript
describe("buildFallbackChain", () => {
  const breakpoints = [
    { key: "md", value: "768px", numericValue: 768 },
    { key: "lg", value: "1024px", numericValue: 1024 },
    { key: "xl", value: "1280px", numericValue: 1280 },
  ];

  it("should build chain for first breakpoint", () => {
    const chain = buildFallbackChain("p", breakpoints, 0);
    expect(chain).toBe("var(--sp-p-md, var(--sp-p))");
  });

  it("should build nested chain for second breakpoint", () => {
    const chain = buildFallbackChain("p", breakpoints, 1);
    expect(chain).toBe("var(--sp-p-lg, var(--sp-p-md, var(--sp-p)))");
  });

  it("should build full chain for last breakpoint", () => {
    const chain = buildFallbackChain("p", breakpoints, 2);
    expect(chain).toBe(
      "var(--sp-p-xl, var(--sp-p-lg, var(--sp-p-md, var(--sp-p))))",
    );
  });

  it("should handle compound property names", () => {
    const chain = buildFallbackChain("gap-x", breakpoints, 0);
    expect(chain).toBe("var(--sp-gap-x-md, var(--sp-gap-x))");
  });
});
```

### 3. `spacingHelpers.test.ts`

```typescript
describe("resolveSpacing", () => {
  it("should resolve simple number value", () => {
    const result = resolveSpacing("p", 4);
    expect(result.className).toBe("sp-p");
    expect(result.style).toEqual({ "--sp-p": "1rem" });
  });

  it("should resolve responsive object", () => {
    const result = resolveSpacing("p", { base: 2, md: 4, lg: 8 });
    expect(result.className).toBe("sp-p");
    expect(result.style).toEqual({
      "--sp-p": "0.5rem",
      "--sp-p-md": "1rem",
      "--sp-p-lg": "2rem",
    });
  });

  it("should handle custom unit", () => {
    const result = resolveSpacing("p", 4, 0.5);
    expect(result.style).toEqual({ "--sp-p": "2rem" });
  });

  it("should skip null/undefined breakpoint values", () => {
    const result = resolveSpacing("p", { base: 4, md: undefined });
    expect(result.style).toEqual({ "--sp-p": "1rem" });
    expect(result.style).not.toHaveProperty("--sp-p-md");
  });

  it("should handle zero value", () => {
    const result = resolveSpacing("p", 0);
    expect(result.style).toEqual({ "--sp-p": "0rem" });
  });

  it("should handle decimal values", () => {
    const result = resolveSpacing("p", 1.5);
    expect(result.style).toEqual({ "--sp-p": "0.375rem" });
  });
});

describe("resolveSpacingProps", () => {
  it("should resolve multiple props", () => {
    const result = resolveSpacingProps({ p: 4, mx: 2 });
    expect(result.classNames).toEqual(["sp-p", "sp-mx"]);
    expect(result.style).toEqual({
      "--sp-p": "1rem",
      "--sp-mx": "0.5rem",
    });
  });

  it("should skip undefined props", () => {
    const result = resolveSpacingProps({ p: 4, mx: undefined });
    expect(result.classNames).toEqual(["sp-p"]);
    expect(result.style).not.toHaveProperty("--sp-mx");
  });

  it("should handle empty props", () => {
    const result = resolveSpacingProps({});
    expect(result.classNames).toEqual([]);
    expect(result.style).toEqual({});
  });

  it("should mix simple and responsive values", () => {
    const result = resolveSpacingProps({
      p: 4,
      mx: { base: 2, md: 4 },
    });
    expect(result.classNames).toEqual(["sp-p", "sp-mx"]);
    expect(result.style).toEqual({
      "--sp-p": "1rem",
      "--sp-mx": "0.5rem",
      "--sp-mx-md": "1rem",
    });
  });
});
```

### 4. `helpers.test.ts`

```typescript
describe("toKebabCase", () => {
  it("should convert camelCase", () => {
    expect(toKebabCase("darkBlue")).toBe("dark-blue");
  });

  it("should convert PascalCase", () => {
    expect(toKebabCase("DarkBlue")).toBe("dark-blue");
  });

  it("should handle numbers", () => {
    expect(toKebabCase("text16Medium")).toBe("text-16-medium");
    expect(toKebabCase("text32Bold")).toBe("text-32-bold");
  });

  it("should handle already kebab-case", () => {
    expect(toKebabCase("dark-blue")).toBe("dark-blue");
  });

  it("should handle single word", () => {
    expect(toKebabCase("primary")).toBe("primary");
  });

  it("should handle consecutive uppercase", () => {
    expect(toKebabCase("HTMLParser")).toBe("h-t-m-l-parser");
  });
});

describe("extractData", () => {
  it("should kebab-case keys by default", () => {
    const result = extractData({ darkBlue: "#001", lightGray: "#999" });
    expect(result).toEqual({ "dark-blue": "#001", "light-gray": "#999" });
  });

  it("should preserve keys when isToKebabCase is false", () => {
    const result = extractData({ darkBlue: "#001" }, false);
    expect(result).toEqual({ darkBlue: "#001" });
  });
});

describe("addDot", () => {
  it("should prefix keys with dot and kebab-case", () => {
    const result = addDot({ text16Medium: { fontSize: "16px" } });
    expect(result).toHaveProperty(".text-16-medium");
  });
});
```

### 5. `cssVariables.test.ts`

```typescript
describe("flattenToVars", () => {
  it("should create CSS variable declarations", () => {
    const result = flattenToVars("color-base", {
      primary: "#007AFF",
      white: "#FFF",
    });
    expect(result).toEqual({
      "--color-base-primary": "#007AFF",
      "--color-base-white": "#FFF",
    });
  });

  it("should kebab-case keys", () => {
    const result = flattenToVars("color-base", { darkBlue: "#001" });
    expect(result).toEqual({ "--color-base-dark-blue": "#001" });
  });

  it("should handle empty input", () => {
    const result = flattenToVars("color-base", {});
    expect(result).toEqual({});
  });
});

describe("mapToVarRefs", () => {
  it("should create var() references", () => {
    const result = mapToVarRefs("color-base", { primary: "#007AFF" });
    expect(result).toEqual({ primary: "var(--color-base-primary)" });
  });

  it("should kebab-case keys", () => {
    const result = mapToVarRefs("color-base", { darkBlue: "#001" });
    expect(result).toEqual({ "dark-blue": "var(--color-base-dark-blue)" });
  });
});
```

### 6. `createDesignTokens.test.ts`

```typescript
describe("createDesignTokens", () => {
  it("should return correct variantColor keys", () => {
    const { DesignTokens } = createDesignTokens(fullTheme);
    expect(DesignTokens.Web.variantColor).toContain("primary");
    expect(DesignTokens.Web.variantColor).toContain("main");
  });

  it("should return correct variantText keys", () => {
    const { DesignTokens } = createDesignTokens(fullTheme);
    expect(DesignTokens.Web.variantText).toContain("text16Medium");
    expect(DesignTokens.Web.variantText).toContain("text32Bold");
  });

  it("should return correct variantTextColor keys", () => {
    const { DesignTokens } = createDesignTokens(fullTheme);
    expect(DesignTokens.Web.variantTextColor).toContain("main");
    expect(DesignTokens.Web.variantTextColor).toContain("secondary");
    expect(DesignTokens.Web.variantTextColor).not.toContain("primary");
  });

  it("should return correct variantShadow keys", () => {
    const { DesignTokens } = createDesignTokens(fullTheme);
    expect(DesignTokens.Web.variantShadow).toContain("sm");
  });

  it("should respect custom breakpoints", () => {
    const { DesignTokens } = createDesignTokens(fullTheme, {
      breakpoints: ["sm", "md", "xl"],
    });
    expect(DesignTokens.Web.breakpoints).toEqual(["sm", "md", "xl"]);
  });

  it("should return spacing properties", () => {
    const { DesignTokens } = createDesignTokens(fullTheme);
    expect(DesignTokens.Web.spacingProperties).toContain("p");
    expect(DesignTokens.Web.spacingProperties).toContain("mx");
    expect(DesignTokens.Web.spacingProperties).toContain("gap");
  });
});
```

### 7. `validateTheme.test.ts` (sau khi implement validation plan)

```typescript
describe("validateTheme", () => {
  it("should pass for valid minimal theme", () => {
    expect(() => validateTheme(minimalTheme)).not.toThrow();
  });

  it("should throw for missing colors", () => {
    expect(() => validateTheme({ typography: {} })).toThrow(
      /colors.*required/i,
    );
  });

  it("should throw for missing colors.base", () => {
    expect(() =>
      validateTheme({ colors: { text: {} }, typography: {} }),
    ).toThrow(/colors\.base.*required/i);
  });

  it("should throw for wrong typography field type", () => {
    const theme = {
      colors: { base: {}, text: {} },
      typography: {
        body: {
          fontSize: 16,
          lineHeight: "150%",
          fontWeight: 400,
          letterSpacing: "0px",
        },
      },
    };
    expect(() => validateTheme(theme)).toThrow(/fontSize.*string/i);
  });

  it("should return errors without throwing when throwOnError=false", () => {
    const result = validateTheme({}, { throwOnError: false });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### 8. `createStylePlugin.test.ts`

> **Đây là factory phức tạp nhất** (tương tác trực tiếp với Tailwind plugin API). Target 70% nhưng cần test cases cụ thể.

**Vấn đề**: `createStylePlugin` gọi `plugin()` từ `tailwindcss/plugin` và tương tác với `PluginAPI` (api.addBase, api.addUtilities). Khó unit test trực tiếp vì API là internal Tailwind.

**Approach**: Test qua output structure, không mock Tailwind API.

```typescript
import { describe, it, expect } from "vitest";
import { createStylePlugin } from "../src/factories/createStylePlugin";
import minimalTheme from "./fixtures/theme-minimal.json";
import fullTheme from "./fixtures/theme-full.json";

describe("createStylePlugin", () => {
  describe("return value", () => {
    it("should return a valid Tailwind plugin object", () => {
      const plugin = createStylePlugin(minimalTheme);
      // Tailwind plugin has .handler (function) and .config (object)
      expect(plugin).toHaveProperty("handler");
      expect(plugin).toHaveProperty("config");
      expect(typeof plugin.handler).toBe("function");
    });
  });

  describe("tailwind config", () => {
    it("should extend colors from theme", () => {
      const plugin = createStylePlugin(minimalTheme);
      const colors = plugin.config?.theme?.extend?.colors;
      expect(colors).toBeDefined();
      expect(colors).toHaveProperty("primary");
      expect(colors).toHaveProperty("main");
    });

    it("should use var() references when CSS variables enabled", () => {
      const plugin = createStylePlugin(minimalTheme, {
        enableCssVariables: true,
      });
      const colors = plugin.config?.theme?.extend?.colors as Record<
        string,
        string
      >;
      expect(colors["primary"]).toMatch(/^var\(--color-base-/);
      expect(colors["main"]).toMatch(/^var\(--color-text-/);
    });

    it("should use direct hex values when CSS variables disabled", () => {
      const plugin = createStylePlugin(minimalTheme, {
        enableCssVariables: false,
      });
      const colors = plugin.config?.theme?.extend?.colors as Record<
        string,
        string
      >;
      expect(colors["primary"]).toBe("#007AFF");
    });

    it("should extend shadows from theme", () => {
      const plugin = createStylePlugin(fullTheme);
      const shadows = plugin.config?.theme?.extend?.boxShadow;
      expect(shadows).toHaveProperty("sm");
    });

    it("should set screen breakpoints", () => {
      const plugin = createStylePlugin(minimalTheme, {
        screens: { md: "800px" },
      });
      const screens = plugin.config?.theme?.screens as Record<string, string>;
      expect(screens["md"]).toBe("800px");
    });

    it("should set empty screens when responsive disabled", () => {
      const plugin = createStylePlugin(minimalTheme, {
        enableResponsive: false,
      });
      const screens = plugin.config?.theme?.screens;
      expect(screens).toEqual({});
    });

    it("should include safelist in config", () => {
      const plugin = createStylePlugin(minimalTheme);
      const safelist = plugin.config?.safelist;
      expect(Array.isArray(safelist)).toBe(true);
      expect(safelist?.length).toBeGreaterThan(0);
    });
  });

  describe("does not throw", () => {
    it("should not throw with minimal theme", () => {
      expect(() => createStylePlugin(minimalTheme)).not.toThrow();
    });

    it("should not throw with full theme", () => {
      expect(() => createStylePlugin(fullTheme)).not.toThrow();
    });

    it("should not throw with all options", () => {
      expect(() =>
        createStylePlugin(fullTheme, {
          enableCssVariables: true,
          enableResponsive: true,
          breakpoints: ["md", "lg"],
          screens: { md: "800px" },
          spacing: { enabled: true },
          layout: { enabled: true },
          rounded: { values: ["md", "lg"] },
          border: { values: [0, 1, 2] },
          opacity: { enabled: true },
          zIndex: { enabled: true },
        }),
      ).not.toThrow();
    });
  });
});
```

> **Ghi chú**: Access `plugin.config` dựa trên cấu trúc return của `tailwindcss/plugin`. Nếu type không cho phép access trực tiếp, có thể cast: `(plugin as any).config`. Kiểm tra cấu trúc thực tế khi implement.

### 9. `createStyleSystem.test.ts` (Integration test)

```typescript
import { describe, it, expect } from "vitest";
import { createStyleSystem } from "../src/factories/createStyleSystem";
import fullTheme from "./fixtures/theme-full.json";

describe("createStyleSystem", () => {
  it("should return plugin, safelist, and DesignTokens", () => {
    const result = createStyleSystem(fullTheme);
    expect(result).toHaveProperty("plugin");
    expect(result).toHaveProperty("safelist");
    expect(result).toHaveProperty("DesignTokens");
  });

  it("should return non-empty safelist", () => {
    const { safelist } = createStyleSystem(fullTheme);
    expect(Array.isArray(safelist)).toBe(true);
    expect(safelist.length).toBeGreaterThan(0);
  });

  it("should return DesignTokens with Web namespace", () => {
    const { DesignTokens } = createStyleSystem(fullTheme);
    expect(DesignTokens).toHaveProperty("Web");
    expect(DesignTokens.Web).toHaveProperty("variantColor");
    expect(DesignTokens.Web).toHaveProperty("variantText");
    expect(DesignTokens.Web).toHaveProperty("variantShadow");
  });

  it("should have consistent safelist between system and standalone", () => {
    const { safelist: systemSafelist } = createStyleSystem(fullTheme);
    const standaloneSafelist = generateSafelist(fullTheme);
    expect(systemSafelist).toEqual(standaloneSafelist);
  });

  it("should pass options through to all sub-factories", () => {
    const options = { breakpoints: ["sm", "xl"] as string[] };
    const { DesignTokens } = createStyleSystem(fullTheme, options);
    expect(DesignTokens.Web.breakpoints).toEqual(["sm", "xl"]);
  });
});
```

### 10. `inference.test-d.ts` (Type-level tests)

> **QUAN TRỌNG**: File `.test-d.ts` cần config **riêng** trong `vitest.config.ts` — xem section "Setup" bên dưới.

```typescript
import { expectTypeOf } from "vitest";
import { createDesignTokens, createStyleSystem } from "../src";

const theme = {
  colors: {
    base: { primary: "#007AFF", white: "#FFF" } as const,
    text: { main: "#000" } as const,
  },
  typography: {
    heading1: {
      fontSize: "32px",
      lineHeight: "120%",
      fontWeight: 700,
      letterSpacing: "0px",
    },
  } as const,
  shadows: { sm: "0 1px 2px rgba(0,0,0,0.1)" } as const,
} as const;

describe("type inference — positive cases", () => {
  it("should infer variantColor as literal union", () => {
    const { DesignTokens } = createDesignTokens(theme);
    expectTypeOf(DesignTokens.Web.variantColor).toEqualTypeOf<
      ("primary" | "white" | "main")[]
    >();
  });

  it("should infer variantText as literal type", () => {
    const { DesignTokens } = createDesignTokens(theme);
    expectTypeOf(DesignTokens.Web.variantText).toEqualTypeOf<"heading1"[]>();
  });

  it("should infer variantShadow", () => {
    const { DesignTokens } = createDesignTokens(theme);
    expectTypeOf(DesignTokens.Web.variantShadow).toEqualTypeOf<"sm"[]>();
  });
});

describe("type inference — negative cases (reject invalid values)", () => {
  it("should reject invalid color token", () => {
    const { DesignTokens } = createDesignTokens(theme);
    type ColorToken = (typeof DesignTokens.Web.variantColor)[number];

    // @ts-expect-error — "invalid" is not a valid color token
    const _bad: ColorToken = "invalid";

    // Valid — should not error
    const _good: ColorToken = "primary";
  });

  it("should reject invalid text token", () => {
    const { DesignTokens } = createDesignTokens(theme);
    type TextToken = (typeof DesignTokens.Web.variantText)[number];

    // @ts-expect-error — "nonExistent" is not a valid text token
    const _bad: TextToken = "nonExistent";

    // Valid
    const _good: TextToken = "heading1";
  });

  it("should reject invalid shadow token", () => {
    const { DesignTokens } = createDesignTokens(theme);
    type ShadowToken = (typeof DesignTokens.Web.variantShadow)[number];

    // @ts-expect-error — "xl" is not in shadows
    const _bad: ShadowToken = "xl";

    // Valid
    const _good: ShadowToken = "sm";
  });
});
```

> **Lưu ý**: Negative tests dùng `@ts-expect-error` — đây là cách chính thức để test rằng TypeScript **reject** giá trị sai. Nếu type inference bị widen thành `string`, các dòng `@ts-expect-error` sẽ **không** trigger error → test fail → phát hiện regression.

---

## Test Fixtures

### `tests/fixtures/theme-minimal.json`

```json
{
  "colors": {
    "base": { "primary": "#007AFF" },
    "text": { "main": "#1C1C20" }
  },
  "typography": {
    "body": {
      "fontSize": "16px",
      "lineHeight": "150%",
      "fontWeight": 400,
      "letterSpacing": "0px"
    }
  }
}
```

### `tests/fixtures/theme-full.json`

Copy từ `examples/theme.json` hiện có (đã có colors, typography, shadows, backDropBlurs, borderRadius, themes).

---

## Setup

### Dependencies

```bash
yarn add -D vitest @vitest/coverage-v8
```

### `vitest.config.ts`

> **QUAN TRỌNG**: Runtime tests (`.test.ts`) và type-level tests (`.test-d.ts`) cần config **tách biệt**. `.test-d.ts` chạy qua `vitest typecheck` (chỉ check types, không execute code), `.test.ts` chạy qua `vitest run` (execute code).

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    // Runtime tests — execute code
    include: ["tests/**/*.test.ts"],
    // Type-level tests — chỉ chạy bằng `vitest typecheck`
    typecheck: {
      include: ["tests/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/index.ts", "src/cli/**"],
    },
  },
});
```

> **Giải thích**: Nếu để `.test-d.ts` trong `test.include`, Vitest sẽ cố **execute** file đó → lỗi vì `@ts-expect-error` lines gây runtime errors. `typecheck.include` chỉ chạy TypeScript compiler check, không execute code.

### Package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:types": "vitest typecheck"
  }
}
```

---

## Coverage Targets

| Module                         | Target   | Lý do                                                                 |
| ------------------------------ | -------- | --------------------------------------------------------------------- |
| `generateSafelist`             | 95%+     | Critical — sai = UI production vỡ                                     |
| `spacingHelpers`               | 95%+     | Public API, user-facing                                               |
| `spacing` (buildFallbackChain) | 90%+     | Logic phức tạp, dễ regression                                         |
| `helpers` (toKebabCase, etc.)  | 95%+     | Dùng khắp nơi                                                         |
| `cssVariables`                 | 90%+     | CSS output correctness                                                |
| `createDesignTokens`           | 85%+     | Token generation                                                      |
| `createStylePlugin`            | 70%+     | Test qua config object + không-throw checks (không mock Tailwind API) |
| `createStyleSystem`            | 80%+     | Integration test — verify output consistency                          |
| `validation`                   | 95%+     | Phải cover tất cả error paths                                         |
| **Tổng**                       | **85%+** |                                                                       |

---

## Implementation Steps

### Step 1: Setup Vitest

- Install dependencies
- Tạo `vitest.config.ts`
- Thêm scripts vào `package.json`
- Verify: `yarn test` chạy được (dù chưa có test)

### Step 2: Tạo fixtures

- `tests/fixtures/theme-minimal.json`
- `tests/fixtures/theme-full.json` (copy từ examples)

### Step 3: Utils tests (ít dependency nhất)

- `helpers.test.ts`
- `cssVariables.test.ts`
- `spacingHelpers.test.ts`

### Step 4: Spacing tests

- `spacing.test.ts`

### Step 5: Factory tests

- `generateSafelist.test.ts` (quan trọng nhất — safelist sai = UI production vỡ)
- `createDesignTokens.test.ts`
- `createStylePlugin.test.ts` (test config object output, không mock Tailwind)
- `createStyleSystem.test.ts` (integration — verify trả đúng plugin + safelist + tokens)

### Step 6: Type tests

- `inference.test-d.ts`

### Step 7: CI integration (optional)

- Thêm `yarn test` vào CI pipeline
- Coverage report

---

## Verification

- [ ] `yarn test` pass tất cả tests
- [ ] `yarn test:coverage` đạt target coverage
- [ ] `yarn test:types` pass type-level tests
- [ ] Snapshot tests match expected output
- [ ] `yarn lint` pass (test files cũng phải lint-clean)

---

## Timeline ước tính

| Step                                                              | Effort    |
| ----------------------------------------------------------------- | --------- |
| Step 1 (Setup)                                                    | ~0.5h     |
| Step 2 (Fixtures)                                                 | ~0.5h     |
| Step 3 (Utils tests)                                              | ~2h       |
| Step 4 (Spacing tests)                                            | ~1h       |
| Step 5 (Factory tests — safelist, tokens, **plugin**, **system**) | ~4h       |
| Step 6 (Type tests — positive + negative)                         | ~1.5h     |
| **Tổng**                                                          | **~9.5h** |
