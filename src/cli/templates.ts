import path from "node:path";

import type { DetectedStack } from "./commands/detectStack";

/**
 * The starter theme `init` writes, following the agent contract's naming
 * convention: primitives (`<hue><step>`, `white`, an `Alpha` primitive) hold
 * every literal colour, the semantic core aliases them, typography keys are
 * `text<size><Weight>` on the type scale with one line height per size, and
 * radius keys are `sm`, `md`, `lg`, `full`. The values are placeholders.
 */
const starterTheme = {
  $schema: "./theme.schema.json",
  colors: {
    white: "#FFFFFF",
    gray100: "#F3F4F6",
    gray200: "#E5E7EB",
    gray400: "#9CA3AF",
    gray600: "#4B5563",
    gray700: "#374151",
    gray800: "#1F2937",
    gray900: "#111827",
    gray900Alpha50: "rgba(17, 24, 39, 0.5)",
    blue500: "#3B82F6",
    blue600: "#2563EB",
    blue700: "#1D4ED8",
    blue800: "#1E40AF",
    red600: "#DC2626",
    green600: "#16A34A",
    amber500: "#F59E0B",
    background: "$white",
    surface: "$gray100",
    foreground: "$gray900",
    muted: "$gray100",
    mutedForeground: "$gray600",
    border: "$gray200",
    primary: "$blue600",
    primaryHover: "$blue700",
    primaryActive: "$blue800",
    primaryForeground: "$white",
    danger: "$red600",
    success: "$green600",
    warning: "$amber500",
    focus: "$blue500",
    scrim: "$gray900Alpha50",
  },
  typography: {
    text14Regular: { fontSize: "14px", lineHeight: "20px", fontWeight: 400 },
    text16Regular: { fontSize: "16px", lineHeight: "24px", fontWeight: 400 },
    text16Semibold: { fontSize: "16px", lineHeight: "24px", fontWeight: 600 },
    text24Semibold: { fontSize: "24px", lineHeight: "32px", fontWeight: 600 },
    text32Bold: { fontSize: "32px", lineHeight: "40px", fontWeight: 700 },
  },
  shadows: {
    sm: "0px 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0px 4px 6px rgba(0, 0, 0, 0.1)",
  },
  borderRadius: { sm: "4px", md: "8px", lg: "12px", full: "9999px" },
};

/** The dark variant re-points semantic keys at other primitives; it never redefines a primitive. */
const starterDarkAxis = {
  theme: {
    dark: {
      colors: {
        background: "$gray900",
        surface: "$gray800",
        foreground: "$gray100",
        muted: "$gray800",
        mutedForeground: "$gray400",
        border: "$gray700",
      },
    },
  },
};

const { $schema, colors, ...rest } = starterTheme;

/** The starter theme without dark mode, as `init` writes it. */
export const themeTemplate = `${JSON.stringify(starterTheme, null, 2)}\n`;

/** The starter theme with a `theme.dark` axis (`init --dark`), as `init` writes it. */
export const themeTemplateDark = `${JSON.stringify({ $schema, colors, themeAxes: starterDarkAxis, ...rest }, null, 2)}\n`;

const NO_ARGUMENT_NOTE =
  "// No arguments: reads style-gen.config.json (theme, output, options).";

/**
 * The bundler config `init` prints for a detected stack; `init` never
 * edits the file. Vite and Next.js read style-gen.config.json themselves
 * (no arguments). Nuxt 4 sets Vite's root to `app/`, so the Nuxt snippet
 * passes `root`, the project folder that holds the config file. The text is
 * Prettier-formatted, except the Next.js config object, which keeps the
 * create-next-app form (its doc fence is `prettier-ignore`d). The README
 * (Vite) and `documents/reference/cli.md` (Next.js, Nuxt) show these blocks
 * byte for byte (`templates.test.ts`).
 * @param {Extract<DetectedStack, { configFile: string }>} detected - The detected stack and its config file
 * @returns {string} The snippet, first line `// <config file>`
 */
export const getBundlerSnippet = (
  detected: Extract<DetectedStack, { configFile: string }>,
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
  return `// ${configFile}
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      // Nuxt 4 sets Vite's root to app/: root is the folder with style-gen.config.json.
      styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) }),
      tailwindcss(),
    ],
  },
});`;
};

/**
 * The lines that load Tailwind and the generated CSS from a CSS entry, plus
 * an `@source not` for a directory Tailwind must not scan (the agent rules
 * hold example class literals). Relative paths are computed from absolute
 * paths under `cwd`, never from `process.cwd()`; each specifier is a JSON
 * string literal, which is also a valid CSS string.
 * @param {string} cwd - The project root
 * @param {string} cssEntry - Project-relative POSIX path of the CSS entry
 * @param {string} output - Project-relative POSIX path of `theme.css`
 * @param {string} [exclude] - Project-relative directory to exclude from scanning
 * @returns {string} `@import "tailwindcss";`, the relative theme import and the optional `@source not`
 */
export const getCssImport = (
  cwd: string,
  cssEntry: string,
  output: string,
  exclude?: string,
): string => {
  const from = path.dirname(path.resolve(cwd, cssEntry));
  const spec = (target: string): string => {
    const rel = path
      .relative(from, path.resolve(cwd, target))
      .split(path.sep)
      .join("/");
    return rel.startsWith("../") ? rel : `./${rel}`;
  };
  const lines = [
    `@import "tailwindcss";`,
    `@import ${JSON.stringify(spec(output))};`,
  ];
  if (exclude !== undefined) {
    lines.push(`@source not ${JSON.stringify(spec(exclude))};`);
  }
  return lines.join("\n");
};
