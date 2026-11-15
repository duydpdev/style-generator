// #region docs:nuxt-config
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry: Tailwind v4 + the generated theme.css.
  css: ["~/assets/css/globals.css"],

  // Nuxt 4 sets the Vite root to `app/`, so `root` points at the project
  // folder that holds `style-gen.config.json`.
  vite: {
    plugins: [
      styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) }),
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: "style-generator · Nuxt plain example",
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
