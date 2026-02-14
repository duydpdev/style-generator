import type { Config } from "tailwindcss";
import { createStylePlugin } from "@duydpdev/style-generator";
import theme from "./theme.json";
// NOTE: This example is for Tailwind CSS v3 compatibility.
// For Tailwind CSS v4, please refer to the README and v4-plugin.ts example.

// Example of how to integrate the style generator plugin (v3 style)
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    // This plugin will:
    // 1. Inject CSS variables for colors, shadows, etc.
    // 2. Configure theme.extend with these variables
    // 3. Generate typography utilities
    // Plugin tự động config theme.extend và safelist
    createStylePlugin(theme, {
      breakpoints: ["md", "lg"],
    }) as any,
  ],
};

export default config;
