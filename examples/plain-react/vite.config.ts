// #region docs:vite-config
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// No generator options: src/theme.ts calls createDesignTokens without
// options too, so both use the library defaults (breakpoints md, lg).
// When you add options, pass the same object to both.
export default defineConfig({
  plugins: [
    react(),
    styleGenVite({ themePath: "src/theme/theme.json", outDir: "src/theme" }),
    tailwindcss(),
  ],
});
// #endregion docs:vite-config
