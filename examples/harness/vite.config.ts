import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// #region docs:vite-config
export default defineConfig({
  base: process.env.EXAMPLE_BASE ?? "/",
  plugins: [react(), styleGenVite(), tailwindcss()],
});
// #endregion docs:vite-config
