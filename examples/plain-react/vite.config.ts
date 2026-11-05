// #region docs:vite-config
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./src/options";

// One literal `options` (src/options.ts, no JSON import, so a theme edit does
// not restart the dev server) feeds the plugin and the typed tokens;
// style-gen.config.json holds the same steps for the `generate` CLI.
export default defineConfig({
  plugins: [
    react(),
    styleGenVite({ themePath: "src/theme/theme.json", outDir: "src/theme", options }),
    tailwindcss(),
  ],
});
// #endregion docs:vite-config
