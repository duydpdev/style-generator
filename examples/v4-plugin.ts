import { createStyleSystem, Breakpoint } from "../src";

import theme from "./theme.json";

// Define options (breakpoints, screens)
const options = {
  screens: {
    md: "800px",
  },
  breakpoints: [Breakpoint.MD, Breakpoint.LG], // Only md and lg
};

// Create style system (plugin + safelist)
// NOTE: `plugin` is intentionally typed as `unknown` to avoid leaking Tailwind's
// internal types into the public declaration output of this example file.
const { plugin, safelist }: { plugin: unknown; safelist: string[] } =
  createStyleSystem(theme, options);

// Export plugin for Tailwind
export default plugin;

// Safelist is managed by CLI: npx style-gen safelist
export { safelist };
