import { defineConfig } from "tsdown";

// CLI bundle → dist/cli/index.mjs (the `bin`) and dist/cli/canvas.mjs, the
// `canvas` commands that `run.ts` loads with `import()` so no other command
// pays for them, and dist/cli/canvas-classes.mjs, the class rules that only
// `canvas check --boards` loads, and dist/cli/ds.mjs, the `ds build` command (`check:sizes` budgets the four apart). Dependencies and peers stay
// external (tsdown reads them from package.json); `check:externals` enforces
// that through the sourcemap. No declarations: the CLI has no import API.
// `comments.jsdoc: false` drops the JSDoc blocks, which rolldown keeps
// otherwise: the bundle is unminified and they were more than half of its
// gzip size (37 694 B → 18 096 B on the phase 10 source, measured
// 2026-10-28). Legal comments (`@license`, `@preserve`) are kept by default.
// `attachDebugInfo: "none"` drops rolldown's `//#region`/`//#endregion` module
// markers (about 570 B gzip); the sourcemap still maps every module.
export default defineConfig({
  entry: {
    index: "src/cli/index.ts",
    canvas: "src/cli/commands/canvas/index.ts",
    "canvas-classes": "src/cli/commands/canvas/boardTokenRules.ts",
    ds: "src/cli/commands/ds/index.ts",
  },
  format: "esm",
  platform: "node",
  outDir: "dist/cli",
  banner: { js: "#!/usr/bin/env node" },
  dts: false,
  sourcemap: true,
  outputOptions: { comments: { jsdoc: false } },
  inputOptions: { experimental: { attachDebugInfo: "none" } },
});
