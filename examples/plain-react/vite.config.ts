// #region docs:vite-config
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./src/theme";

// One literal `options` (src/theme.ts) feeds the plugin and the typed tokens;
// style-gen.config.json holds the same steps for the `generate` CLI.
export default defineConfig({
  plugins: [
    react(),
    styleGenVite({ themePath: "src/theme/theme.json", outDir: "src/theme", options }),
    tailwindcss(),
  ],
});
// #endregion docs:vite-config
