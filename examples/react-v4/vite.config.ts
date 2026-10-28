import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "design-system-example/style-gen.options";

export default defineConfig({
  base: process.env.EXAMPLE_BASE ?? "/",
  plugins: [
    react(),
    styleGenVite({
      themePath: "../design-system/src/theme.json",
      outDir: "src/theme",
      options,
    }),
    tailwindcss(),
  ],
});
