/**
 * CommonJS consumer of the BUILT declarations, compiled by
 * `yarn typecheck:dist` (`tsconfig.dts-check.cjs.json`, `module: node16`).
 * Self-referencing imports resolve through the `require` condition of
 * `package.json#exports` to `dist/*.d.cts`; library checking is on, so a
 * `.d.cts` that imports a peer (`vite`) must resolve it for a CJS consumer.
 *
 * Nothing here runs: a wrong assertion is a compile error.
 */
import { formatZodError, generate } from "@duydpdev/style-generator";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { createTailwindMergeExtension } from "@duydpdev/style-generator/recipes";
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import type { ThemeConfig } from "@duydpdev/style-generator/types";
import { styleGenVite } from "@duydpdev/style-generator/vite";

const plugin = styleGenVite();
const pluginName: string = plugin.name;
const nextConfig = styleGenNext();
const theme: ThemeConfig = { colors: { primary: "#000" } };

export const cjsConsumer = {
  pluginName,
  nextConfig,
  generate,
  formatZodError,
  createVariantMapper,
  createTailwindMergeExtension,
  tokens: createDesignTokens(theme).DesignTokens.Web,
};
