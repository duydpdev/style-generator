import path from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import pkg from "./package.json" with { type: "json" };

const external = [
  ...Object.keys((pkg.peerDependencies as Record<string, string>) ?? {}),
  ...Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
  /^node:/,
];

const r = (p: string) => path.resolve(__dirname, p);

const entries = Object.fromEntries(
  Object.keys(pkg.exports)
    .filter((key) => key !== "./package.json")
    .map((key) => {
      const name = key === "." ? "index" : key.replace(/^\.\//, "");
      const srcPath = key === "." ? "./src/index.ts" : `./src/exports/${name}.ts`;
      return [name, r(srcPath)];
    }),
);

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      tsconfigPath: "./tsconfig.json",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: entries,
      formats: ["es", "cjs"],
      fileName: (format, name) =>
        `${name}.${format === "es" ? "js" : "cjs"}`,
    },
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: {
      // `strict` (the default) forbids an entry chunk from exporting anything
      // beyond its public API. `./tokens` shares internals (`buildDesignTokens`,
      // `resolveTokenOptions`, `categoryTokenMeta`) with the generator chunk, so
      // under `strict` Rollup splits a facade off the entry (+~290 B gzip,
      // over the `./tokens` budget). `allow-extension` keeps the entry and its
      // shared code in one chunk; the extra runtime names (ESM and CJS, via
      // `minifyInternalExports`) are one-letter aliases absent from
      // `dist/tokens.d.ts`, so the typed API — the contract — is unchanged.
      preserveEntrySignatures: "allow-extension",
      external,
      output: {
        preserveModules: false,
        minifyInternalExports: true,
        // Pin the modules several entries share to stable chunks. Without it
        // `./recipes` (which uses helpers + spacingHelpers but not
        // colorStates) changes the set of entries depending on each module,
        // so Rollup splits `helpers`/`colorStates` apart and `spacingHelpers`
        // off the `spacing` entry, adding chunk overhead to `./tokens`,
        // `./cva` and `./spacing` (see the 2026-10-28 note in
        // scripts/check-sizes.mjs). `spacing` merges the entry module with
        // `spacingHelpers` so `./recipes` imports `spacing.js` instead of
        // duplicating it.
        //
        // Rules: the chunk name "spacing" MUST equal the entry name (a
        // differently named chunk would not merge with the entry and would
        // split it again). `tokens`, `cva`, `spacing` and `index` must not
        // drift when a new shared module or entry appears: re-run
        // `yarn build:all && yarn check:sizes` and pin the module here (or
        // restructure the import) instead of raising their budgets. A manual
        // chunk also absorbs every unassigned module in its static import
        // closure, so every shared module reachable from a pinned module must
        // be pinned too.
        // Vite 8 / Rolldown deprecates `manualChunks` in favour of
        // `advancedChunks`: revisit this rule when upgrading.
        manualChunks: (id) => {
          if (/[/\\]src[/\\]shared[/\\](helpers|colorStates)\.ts$/.test(id)) {
            return "helpers";
          }
          if (
            /[/\\]src[/\\](exports[/\\]spacing|features[/\\]spacing[/\\]spacingHelpers)\.ts$/.test(
              id,
            )
          ) {
            return "spacing";
          }
          if (/[/\\]src[/\\]shared[/\\]defaultOption\.ts$/.test(id)) {
            return "defaultOption";
          }
          // `axisAttributeName` is shared by the generator (`.`, `./vite`,
          // `./next`) and `./recipes` (`themeAxisAttributes`). A manual chunk
          // absorbs its whole unassigned static closure (Rollup
          // `addStaticDependenciesToManualChunk`), so without this pin the
          // `recipes` rule would swallow it and `index` would load all of
          // `recipes.js` (+617 B, measured 2026-11-03).
          if (/[/\\]src[/\\]shared[/\\]axisAttributeName\.ts$/.test(id)) {
            return "axisAttributeName";
          }
          if (
            /[/\\]src[/\\](exports[/\\]tokens|core[/\\](Options|resolveTokenOptions)|features[/\\]registry[/\\]categoryTokenMeta|shared[/\\]safelistProperties)\.ts$/.test(
              id,
            )
          ) {
            return "tokens";
          }
          // `./ui` shares the tailwind-merge extension and spacing props with
          // `./recipes`. Keep those modules in the entry chunk (chunk name =
          // entry name, as for `spacing`) so the new entry cannot split them
          // out.
          if (
            /[/\\]src[/\\](exports[/\\]recipes|features[/\\]recipes[/\\](extendTailwindMerge|spacingProps|themeAxisAttributes))\.ts$/.test(
              id,
            )
          ) {
            return "recipes";
          }
          return undefined;
        },
      },
    },
  },
});
