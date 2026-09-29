// Emits `app/theme/theme.css` from `theme.json`. Next.js runs on
// webpack/turbopack (no Vite), so the `styleGenVite` plugin used by the
// Vite examples does not apply. This script is the Next-equivalent: it
// calls the same programmatic API and runs in a Node context.
//
// Chained into the `dev` / `build` scripts (`yarn generate:theme && ...`) so
// the generated file always exists before Tailwind's `@import "./theme/theme.css"`
// + `@source` run. (Yarn Berry does not honour `pre`/`post` script hooks, so the
// chaining must be explicit — do not rely on a `prebuild` hook here.)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generate,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";

import themeJson from "../app/theme/theme.json" with { type: "json" };

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../app/theme");

const theme = defineTheme(themeJson);
const options = defineOptions({
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

const { css } = generate(theme, options);

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "theme.css"), css, "utf8");

console.log(`[generate-theme] wrote theme.css to ${outDir}`);
