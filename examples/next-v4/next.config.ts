import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { Breakpoint } from "@duydpdev/style-generator";

const nextConfig: NextConfig = {
  // Set EXAMPLE_BASE to host the demo under a sub-path (e.g. GitHub Pages).
  basePath: process.env.EXAMPLE_BASE || undefined,
};

// Next.js runs on webpack/Turbopack (no Vite), so the Vite-only
// `styleGenVite` plugin used by the React/Nuxt examples does not apply.
// `styleGenNext` is the Next-equivalent: it does not import `next`, so it
// works identically under both bundlers. It writes `app/theme/theme.css`
// whenever Next evaluates this config (every `dev`/`build`/`start`), and
// additionally watches `theme.json` for changes during `phase-development-server`.
export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
  options: {
    breakpoints: [Breakpoint.MD, Breakpoint.LG],
  },
})(nextConfig);
