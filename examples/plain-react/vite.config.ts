// #region docs:vite-config
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// Theme, output and generator options live in style-gen.config.json.
export default defineConfig({
  plugins: [react(), styleGenVite(), tailwindcss()],
});
// #endregion docs:vite-config
