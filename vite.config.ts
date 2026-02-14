import path from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

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
      entry: [path.resolve(__dirname, "./src/index.ts")],
      formats: ["es", "cjs"],
      fileName: "index",
    },
    sourcemap: true,
    copyPublicDir: false,
    rollupOptions: {
      input: {
        design: path.resolve(__dirname, "./src/index.ts"),
      },
      output: {
        preserveModules: false,
        manualChunks: undefined,
      },
    },
  },
});
