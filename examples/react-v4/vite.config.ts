import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { Breakpoint } from "@duydpdev/style-generator";

export default defineConfig({
  base: process.env.EXAMPLE_BASE ?? "/",
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme",
      options: {
        breakpoints: [Breakpoint.MD, Breakpoint.LG],
        safelistColors: true,
      },
    }),
    tailwindcss(),
  ],
});
