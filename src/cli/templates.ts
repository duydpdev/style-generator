import path from "node:path";

import type { DetectedStack } from "./commands/detectStack";

export const themeTemplate = `{
  "$schema": "./theme.schema.json",
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#6366F1",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "foreground": "#111827",
    "muted": "#6B7280"
  },
  "typography": {
    "heading1": {
      "fontSize": "32px",
      "lineHeight": "120%",
      "fontWeight": 700,
      "letterSpacing": "-0.02em"
    },
    "body": {
      "fontSize": "16px",
      "lineHeight": "150%",
      "fontWeight": 400,
      "letterSpacing": "0px"
    }
  },
  "shadows": {
    "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)",
    "md": "0px 4px 6px rgba(0, 0, 0, 0.1)"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px"
  }
}
`;

export const themeTemplateDark = `{
  "$schema": "./theme.schema.json",
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#6366F1",
    "background": "#FFFFFF",
    "surface": "#F9FAFB",
    "foreground": "#111827",
    "muted": "#6B7280"
  },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "background": "#111827",
          "surface": "#1F2937",
          "foreground": "#F9FAFB",
          "muted": "#9CA3AF"
        }
      }
    }
  },
  "typography": {
    "heading1": {
      "fontSize": "32px",
      "lineHeight": "120%",
      "fontWeight": 700,
      "letterSpacing": "-0.02em"
    },
    "body": {
      "fontSize": "16px",
      "lineHeight": "150%",
      "fontWeight": 400,
      "letterSpacing": "0px"
    }
  },
  "shadows": {
    "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)",
    "md": "0px 4px 6px rgba(0, 0, 0, 0.1)"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px"
  }
}
`;

/** Project-relative POSIX paths `init` wrote into style-gen.config.json. */
export interface WiringPaths {
  /** The theme JSON, e.g. `app/assets/css/theme.json`. */
  theme: string;
  /** The directory of the generated `theme.css`, e.g. `app/assets/css`. */
  outDir: string;
}

const NO_ARGUMENT_NOTE =
  "// No arguments: reads style-gen.config.json (theme, output, options).";

/**
 * The bundler config `init` prints for a detected stack; `init` never
 * edits the file. Vite and Next.js read style-gen.config.json themselves
 * (no arguments). Nuxt 4 sets Vite's root to `app/`, so the Nuxt snippet
 * passes absolute paths. The text is Prettier-formatted for the default
 * paths: the README (Vite) and `documents/reference/cli.md` (Next.js, Nuxt)
 * show these blocks, mirrored by hand.
 * @param {Extract<DetectedStack, { configFile: string }>} detected - The detected stack and its config file
 * @param {WiringPaths} paths - Where `init` put the theme and the CSS
 * @returns {string} The snippet, first line `// <config file>`
 */
export const getBundlerSnippet = (
  detected: Extract<DetectedStack, { configFile: string }>,
  paths: WiringPaths,
): string => {
  const { stack, configFile } = detected;
  if (stack === "vite") {
    return `// ${configFile}
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  ${NO_ARGUMENT_NOTE}
  plugins: [styleGenVite(), tailwindcss()],
});`;
  }
  if (stack === "next") {
    const typed = /\.[cm]?ts$/.test(configFile);
    const head = typed
      ? `import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {`
      : `import { styleGenNext } from "@duydpdev/style-generator/next";

/** @type {import("next").NextConfig} */
const nextConfig = {`;
    return `// ${configFile}
${head}
  /* config options here */
};

${NO_ARGUMENT_NOTE}
export default styleGenNext()(nextConfig);`;
  }
  const themeUrl = JSON.stringify(`./${paths.theme}`);
  const outDirUrl = JSON.stringify(`./${paths.outDir}`);
  return `// ${configFile}
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      // Absolute paths: Nuxt 4 sets Vite's root to app/.
      styleGenVite({
        themePath: fileURLToPath(
          new URL(${themeUrl}, import.meta.url),
        ),
        outDir: fileURLToPath(new URL(${outDirUrl}, import.meta.url)),
        options: {}, // style-gen.config.json is NOT read when paths are passed; put generate() options here
      }),
      tailwindcss(),
    ],
  },
});`;
};

/**
 * The two lines that load Tailwind and the generated CSS from a CSS entry.
 * The relative path is computed from absolute paths under `cwd`, never
 * from `process.cwd()`; the specifier is a JSON string literal, which is
 * also a valid CSS string.
 * @param {string} cwd - The project root
 * @param {string} cssEntry - Project-relative POSIX path of the CSS entry
 * @param {string} output - Project-relative POSIX path of `theme.css`
 * @returns {string} `@import "tailwindcss";` and the relative theme import
 */
export const getCssImport = (
  cwd: string,
  cssEntry: string,
  output: string,
): string => {
  const from = path.dirname(path.resolve(cwd, cssEntry));
  const rel = path
    .relative(from, path.resolve(cwd, output))
    .split(path.sep)
    .join("/");
  const spec = rel.startsWith("../") ? rel : `./${rel}`;
  return `@import "tailwindcss";\n@import ${JSON.stringify(spec)};`;
};
