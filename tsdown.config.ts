import { defineConfig } from "tsdown";

// CLI bundle → dist/cli/index.mjs (the `bin`). Dependencies and peers stay
// external (tsdown reads them from package.json); `check:externals` enforces
// that through the sourcemap. No declarations: the CLI has no import API.
export default defineConfig({
  entry: ["src/cli/index.ts"],
  format: "esm",
  platform: "node",
  outDir: "dist/cli",
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
  sourcemap: true,
});
