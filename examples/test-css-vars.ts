/**
 * Test script: Verify CSS Variables + Options flags.
 * Run: CI_WORKER_REPOSITORY_TOKEN=mock CI_SERVICE_REPOSITORY_NPM_PUBLIC_URL=mock npx tsx examples/test-css-vars.ts
 */
import { createStylePlugin, generateSafelist } from "../src";

import theme from "./theme.json";

interface PluginResult {
  handler: (api: MockAPI) => void;
  config?: Record<string, unknown>;
}

interface MockAPI {
  addBase: (styles: Record<string, Record<string, string>>) => void;
  addUtilities: (utilities: Record<string, unknown>) => void;
}

const printPlugin = (label: string, result: PluginResult) => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("=".repeat(60));

  // Show color config
  if (result.config) {
    const themeColors = (
      result.config.theme as Record<string, Record<string, unknown>>
    ).extend.colors as Record<string, string> | undefined;

    if (themeColors) {
      console.log("\n📋 Tailwind Colors:");
      for (const [key, value] of Object.entries(themeColors)) {
        console.log(`   ${key}: ${value}`);
      }
    }

    const screens = (
      result.config.theme as Record<string, Record<string, string>>
    ).screens;
    console.log(
      `\n📱 Screens: ${Object.keys(screens).length > 0 ? Object.keys(screens).join(", ") : "(none)"}`,
    );
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
  });

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!addBaseCalled) {
    console.log("\n🎨 CSS Variables: (skipped - disabled)");
  }
};

const cases = [
  { label: "Test 1: Full Features (default)", opts: {} },
  { label: "Test 2: No CSS Variables", opts: { enableCssVariables: false } },
  { label: "Test 3: No Responsive", opts: { enableResponsive: false } },
  {
    label: "Test 4: Minimal (no vars, no responsive)",
    opts: { enableCssVariables: false, enableResponsive: false },
  },
];

for (const { label, opts } of cases) {
  const result = createStylePlugin(theme, opts) as PluginResult;
  printPlugin(label, result);

  const safelist = generateSafelist(theme, opts);
  console.log(`\n📦 Safelist: ${safelist.length.toString()} classes`);
  console.log(safelist.join("\n"));
}

// --- Summary ---
console.log(`\n${"=".repeat(60)}`);
console.log("  Safelist Size Comparison");
console.log("=".repeat(60));

for (const { label, opts } of cases) {
  const safelist = generateSafelist(theme, opts);
  console.log(`   ${label}: ${safelist.length.toString()} classes`);
}

console.log("\n✅ All tests completed!");
