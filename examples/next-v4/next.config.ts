import { existsSync } from "node:fs";
import { join } from "node:path";

// #region docs:next-config
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "./src/options";

const nextConfig: NextConfig = {};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin does not apply. `styleGenNext` does not import `next`, so it works
// under both bundlers. It writes `src/theme/theme.css` when Next loads this
// config in `phase-development-server` (`next dev`, which also watches the
// theme JSON) or `phase-production-build` (`next build`). `options` comes from
// `src/options.ts`, which imports no JSON (a theme edit must not reload this
// config) and types the tokens with the same object; the `generate` CLI reads
// the same steps from `style-gen.config.json`.
export default styleGenNext({
  themePath: "src/theme/theme.json",
  outDir: "src/theme",
  options,
})(nextConfig);
// #endregion docs:next-config

// Next prefers a root app/ over src/app. Before 5.3 this example kept its App
// Router there (with a generated app/theme/theme.css), so an old checkout may
// still hold the folder: fail with the fix instead of serving a stale app.
if (existsSync(join(process.cwd(), "app"))) {
  throw new Error(
    "examples/next-v4/app is left over from the pre-5.3 layout and would shadow src/app; delete it once with `rm -rf examples/next-v4/app`.",
  );
}
