import type { Config } from "tailwindcss";

import {
  createStyleSystem,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";

import themeJson from "./src/theme/theme.json";

const theme = defineTheme(themeJson);
// `tailwindVersion` omitted intentionally — exercises `detectTailwindVersion()`
// auto-detect path via `createRequire(import.meta.url)`. Tailwind v3 loads this
// config through `jiti`, which preserves `import.meta.url` for .ts files.
const options = defineOptions({
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  safelistColors: true,
});

const { plugin, safelist } = createStyleSystem(theme, options);

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  safelist,
  theme: { extend: {} },
  plugins: [plugin as never],
};

export default config;
