// #region docs:nuxt-config
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./app/theme";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry: Tailwind v4 + the generated theme.css.
  css: ["~/assets/css/globals.css"],

  // Nuxt runs on Vite, so styleGenVite works as in plain-react. Nuxt 4 sets
  // the Vite `root` to `app/`, so the paths are absolute. `options` comes
  // from `app/theme.ts`, which types the tokens with the same object; the
  // `generate:theme` CLI reads the same steps from `style-gen.config.json`.
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(
          new URL("./app/theme/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/theme", import.meta.url)),
        options,
      }),
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
