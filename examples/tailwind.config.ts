import type { Config } from "tailwindcss";
import { createStylePlugin } from "../src";
import theme from "./theme.json";
// NOTE: This example is for Tailwind CSS v3.
// For Tailwind CSS v4, refer to the README and v4-plugin.ts example.

// Example of how to integrate the style generator plugin (v3)
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    // This plugin will:
    // 1. Inject CSS variables into :root (--color-primary, etc.)
    // 2. Register theme.extend.colors with var() references
    // 3. Generate typography utilities
    createStylePlugin(theme, {
      tailwindVersion: 3,
      breakpoints: ["md", "lg"],
    }) as never,
  ],
};

export default config;
