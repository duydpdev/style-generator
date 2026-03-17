/**
 * Test script: Verify CSS Variables + v3/v4 plugin behavior.
 * Run: npx tsx examples/test-css-vars.ts
 */
import { createStylePlugin, generateSafelist, generateThemeCss } from "../src";

import theme from "./theme.json";

interface PluginResult {
  handler: (api: MockAPI) => void;
  config?: Record<string, unknown>;
}

interface MockAPI {
  addBase: (styles: Record<string, Record<string, string>>) => void;
  addUtilities: (utilities: Record<string, unknown>) => void;
  matchUtilities: (
    utilities: Record<string, unknown>,
    options?: unknown,
  ) => void;
  theme: (key: string) => unknown;
}

const printPlugin = (label: string, result: PluginResult) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("=".repeat(60));

  // Show color config (only available in v3 mode)
  if (result.config) {
    const pluginTheme = result.config.theme as
      | Record<string, Record<string, unknown>>
      | undefined;
    const themeColors = (
      pluginTheme?.extend as Record<string, Record<string, string>> | undefined
    )?.colors;

    if (themeColors) {
      console.log("\n📋 Tailwind Colors (theme.extend.colors):");
      for (const [key, value] of Object.entries(themeColors)) {
        console.log(`   ${key}: ${value}`);
      }
    } else {
      console.log("\n📋 Tailwind Colors: (none — v4 mode uses @theme inline)");
    }

    const screens = pluginTheme?.screens as Record<string, string> | undefined;
    if (screens) {
      console.log(
        `\n📱 Screens: ${Object.keys(screens).length > 0 ? Object.keys(screens).join(", ") : "(none)"}`,
      );
    }
  }

  // Show addBase output
  let addBaseCalled = false;
  result.handler({
    addBase: (styles: Record<string, Record<string, string>>) => {
      addBaseCalled = true;
      console.log("\n🎨 CSS Variables:");
      for (const [selector, vars] of Object.entries(styles)) {
        console.log(`\n${selector} {`);
        for (const [prop, val] of Object.entries(vars)) {
          console.log(`  ${prop}: ${val};`);
        }
        console.log("}");
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    addUtilities: () => {},
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    matchUtilities: () => {},
    theme: () => ({}),
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!addBaseCalled) {
    console.log("\n🎨 CSS Variables: (skipped)");
  }
};

const cases = [
  {
    label: "Test 1: Tailwind v3 (extends theme.colors with var() refs)",
    opts: { tailwindVersion: 3 as const },
  },
  {
    label: "Test 2: Tailwind v4 (no theme.extend.colors)",
    opts: { tailwindVersion: 4 as const },
  },
  {
    label: "Test 3: No Responsive",
    opts: { tailwindVersion: 3 as const, enableResponsive: false },
  },
  {
    label: "Test 4: safelistColors=true",
    opts: { tailwindVersion: 3 as const, safelistColors: true },
  },
];

for (const { label, opts } of cases) {
  const result = createStylePlugin(theme, opts) as PluginResult;
  printPlugin(label, result);

  const safelist = generateSafelist(theme, opts);
  console.log(`\n📦 Safelist: ${safelist.length.toString()} classes`);
  if (opts.safelistColors) {
    console.log(
      safelist
        .filter((c) => c.startsWith("bg-") || c.startsWith("text-"))
        .join("\n"),
    );
  }
}

// --- themeCss output ---
console.log(`\n${"=".repeat(60)}`);
console.log("  generateThemeCss() output (for Tailwind v4 @theme inline)");
console.log("=".repeat(60));
const css = generateThemeCss(theme);
console.log(css);

// --- Summary ---
console.log(`\n${"=".repeat(60)}`);
console.log("  Safelist Size Comparison");
console.log("=".repeat(60));

for (const { label, opts } of cases) {
  const safelist = generateSafelist(theme, opts);
  console.log(`   ${label}: ${safelist.length.toString()} classes`);
}

console.log("\n✅ All tests completed!");
