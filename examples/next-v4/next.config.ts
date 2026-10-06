import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { Breakpoint } from "@duydpdev/style-generator";

const nextConfig: NextConfig = {};

// Next.js runs on webpack/Turbopack (no Vite), so the Vite-only
// `styleGenVite` plugin used by the React/Nuxt examples does not apply.
// `styleGenNext` is the Next-equivalent: it does not import `next`, so it
// works identically under both bundlers. It writes `app/theme/theme.css`
// when Next loads this config in `phase-development-server` (`next dev`,
// which also watches `theme.json`) or `phase-production-build` (`next build`);
// other phases such as `next start` return the config without reading it.
export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
  options: {
    breakpoints: [Breakpoint.MD, Breakpoint.LG],
  },
})(nextConfig);
