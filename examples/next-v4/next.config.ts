import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "design-system-example/style-gen.options";

// #region docs:next-config
const nextConfig: NextConfig = {
  // The design system and @duydpdev/ui-react ship TypeScript source (no build step): let Next compile them.
  transpilePackages: ["design-system-example", "@duydpdev/ui-react"],
};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin used by the React/Nuxt examples does not apply. `styleGenNext` is the
// Next-equivalent: it does not import `next`, so it works identically under
// both bundlers. It writes `app/theme/theme.css` when Next loads this config in
// `phase-development-server` (`next dev`, which also watches the theme JSON) or
// `phase-production-build` (`next build`). The theme and the generator options
// are shared with the other examples through the `design-system-example` package.
export default styleGenNext({
  themePath: "../design-system/src/theme.json",
  outDir: "app/theme",
  options,
})(nextConfig);
// #endregion docs:next-config
