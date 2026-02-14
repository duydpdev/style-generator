import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createStylePlugin, generateSafelist, Breakpoint } from "../src";

import theme from "./theme.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Export plugin for Tailwind v4 @plugin directive
// Define options (breakpoints, screens)
const options = {
  screens: {
    md: "800px",
  },
  breakpoints: [Breakpoint.MD, Breakpoint.LG], // Only md and lg
};

// Export plugin
export default createStylePlugin(theme, options);

// 2. Generate safelist file (script execution)
if (process.argv[1] === __filename) {
  const safelist = generateSafelist(theme, options);
  const outPath = path.resolve(__dirname, "./safelist.txt");
  fs.writeFileSync(outPath, safelist.join("\n"), "utf8");
  console.log(
    `✅ Safelist written to ${outPath} (${safelist.length.toString()} classes)`,
  );
}
