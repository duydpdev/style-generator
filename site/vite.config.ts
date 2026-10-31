import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./src/style-gen.options";

const RAW_BASE = process.env.VITE_BASE ?? "/";
const BASE = RAW_BASE.endsWith("/") ? RAW_BASE : `${RAW_BASE}/`;

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme",
      options,
    }),
    tailwindcss(),
  ],
  server: {
    port: 5174,
  },
});
