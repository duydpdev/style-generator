/**
 * CommonJS consumer of the BUILT declarations, compiled by
 * `yarn typecheck:dist` (`tsconfig.dts-check.cjs.json`, `module: node16`).
 * Self-referencing imports resolve through the `require` condition of
 * `package.json#exports` to `dist/*.d.cts`; library checking is on, so a
 * `.d.cts` that imports a peer (`vite`, `clsx`, `react`) must resolve it for a
 * CommonJS consumer; the UI peers are root devDependencies, so they are
 * installed here.
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
import { createCn } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";

const plugin = styleGenVite();
const pluginName: string = plugin.name;
const nextConfig = styleGenNext();
const theme: ThemeConfig = { colors: { primary: "#000" } };
const cn = createCn(createDesignTokens(theme).DesignTokens.Web);
export type CjsLinkProps = Polymorphic<"a", { readonly tone: "loud" }>;

export const cjsConsumer = {
  pluginName,
  nextConfig,
  generate,
  formatZodError,
  createVariantMapper,
  createTailwindMergeExtension,
  tokens: createDesignTokens(theme).DesignTokens.Web,
  cn,
};
