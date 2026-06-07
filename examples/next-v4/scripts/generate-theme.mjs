// Emits `app/theme/theme.css` + `app/theme/safelist.txt` from `theme.json`.
// Next.js runs on webpack/turbopack (no Vite), so the `styleGenVite` plugin
// used by the Vite examples does not apply. This script is the Next-equivalent:
// it calls the same programmatic API and runs in a Node context, so the
// `node:module` dependency inside the root barrel is fine here.
//
// Chained into the `dev` / `build` scripts (`yarn generate:theme && ...`) so
// the generated files always exist before Tailwind's `@import "./theme/theme.css"`
// + `@source` run. (Yarn Berry does not honour `pre`/`post` script hooks, so the
// chaining must be explicit — do not rely on a `prebuild` hook here.)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateThemeCss,
  generateSafelist,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";

import themeJson from "../app/theme/theme.json" with { type: "json" };

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../app/theme");

const theme = defineTheme(themeJson);
const options = defineOptions({
  tailwindVersion: 4,
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  safelistColors: true,
});

const themeCss = generateThemeCss(theme, options);
const safelist = generateSafelist(theme, options).join("\n");

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "theme.css"), themeCss, "utf8");
writeFileSync(resolve(outDir, "safelist.txt"), safelist, "utf8");

console.log(`[generate-theme] wrote theme.css + safelist.txt to ${outDir}`);
