import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "design-system-example/style-gen.options";

// https://nuxt.com/docs/api/configuration/nuxt-config
// #region docs:nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry (Tailwind v4 + generated theme.css + shared design-system styles).
  css: ["~/assets/css/globals.css"],

  // Nuxt runs on Vite, so the styleGenVite plugin works exactly like the
  // react-v4 example. Nuxt 4 sets the Vite `root` to `app/` (its `srcDir`), so
  // the paths are absolute: a relative `themePath` would resolve from `app/`.
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(
          new URL("../design-system/src/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),
        options,
      }),
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: "style-generator · Nuxt + Tailwind v4 Example",
      htmlAttrs: { lang: "en" },
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
        },
      ],
    },
  },
});
// #endregion docs:nuxt-config
