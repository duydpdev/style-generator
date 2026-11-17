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
        // Pin the modules `./tokens` and `./cva` share with other entries to
        // stable chunks, so a new shared module or entry cannot push `tokens`,
        // `cva`, `spacing` or `index` over their budgets (see the notes in
        // scripts/check-sizes.mjs). A group name MUST NOT equal an entry
        // name it does not merge with; re-run `yarn build:all && yarn
        // check:sizes` after touching a shared module and pin it here (or
        // restructure the import) instead of raising a budget.
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            {
              name: "helpers",
              test: /[\\/]src[\\/]shared[\\/](helpers|colorStates)\.ts$/,
            },
            {
              name: "cva",
              test: /[\\/]src[\\/](exports[\\/]cva|features[\\/]cva[\\/]createVariantMapper)\.ts$/,
            },
            {
              name: "tokens",
              test: /[\\/]src[\\/](exports[\\/]tokens|features[\\/]tokens[\\/]createDesignTokens|core[\\/](Options|resolveTokenOptions)|features[\\/]registry[\\/]categoryTokenMeta|shared[\\/]classPrefixes)\.ts$/,
            },
          ],
        },
      },
    },
  },
});
