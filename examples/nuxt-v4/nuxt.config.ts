import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { Breakpoint } from "@duydpdev/style-generator";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry (Tailwind v4 + generated theme.css + bespoke chrome).
  css: ["~/assets/css/globals.css"],

  // Nuxt runs on Vite, so the styleGenVite plugin works exactly like the
  // react-v4 example: it emits theme/theme.css from theme/theme.json on
  // dev start, build, and whenever theme.json changes.
  vite: {
    plugins: [
      styleGenVite({
        themePath: "theme/theme.json",
        outDir: "theme",
        options: {
          breakpoints: [Breakpoint.MD, Breakpoint.LG],
        },
      }),
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: "style-generator · Nuxt + Tailwind v4 Example",
      htmlAttrs: {
        lang: "en",
        // Defaults match the initial useStyleGuide state — keeps SSR and the
        // first client render in agreement (no hydration mismatch). Runtime
        // toggles are applied reactively via useHead in app.vue.
        "data-palette": "cobalt",
        "data-theme": "light",
        "data-voice": "editorial",
        "data-geometry": "soft",
        "data-surface": "lifted",
      },
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap",
        },
      ],
    },
  },
});
