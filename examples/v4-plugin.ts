import { createStyleSystem, Breakpoint } from "../src";

import theme from "./theme.json";

// Define options (breakpoints, screens)
const options = {
  screens: {
    md: "800px",
  },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  // safelistColors: true,  // Enable if not using @theme inline from themeCss
};

// Create style system — plugin, safelist, and themeCss for Tailwind v4
// NOTE: `plugin` is intentionally typed as `unknown` to avoid leaking Tailwind's
// internal types into the public declaration output of this example file.
const {
  plugin,
  safelist,
  themeCss,
}: { plugin: unknown; safelist: string[]; themeCss: string } =
  createStyleSystem(theme, options);

// Export plugin for Tailwind v4 @plugin directive
export default plugin;

// Safelist is managed by CLI: npx style-gen safelist
// themeCss: write to a .css file to enable @theme inline auto-utilities (bg-primary, etc.)
export { safelist, themeCss };
