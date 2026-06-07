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
      entry: {
        index: r("./src/index.ts"),
        plugin: r("./src/exports/plugin.ts"),
        tokens: r("./src/exports/tokens.ts"),
        cva: r("./src/exports/cva.ts"),
        spacing: r("./src/exports/spacing.ts"),
        types: r("./src/exports/types.ts"),
        vite: r("./src/exports/vite.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, name) =>
        `${name}.${format === "es" ? "js" : "cjs"}`,
    },
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: {
      external,
      output: {
        preserveModules: false,
        manualChunks: undefined,
      },
    },
  },
});
