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
      external,
      output: {
        preserveModules: false,
        manualChunks: undefined,
      },
    },
  },
});
