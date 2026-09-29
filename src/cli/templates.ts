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
  "themes": {
    "dark": {
      "colors": {
        "background": "#111827",
        "surface": "#1F2937",
        "foreground": "#F9FAFB",
        "muted": "#9CA3AF"
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

export const getPluginTemplate = (
  themeRelPath: string,
) => `import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generate, defineTheme, defineOptions, Breakpoint } from "@duydpdev/style-generator";
import themeJson from "${themeRelPath}";

// defineTheme() type-checks your theme config AND validates it at runtime,
// throwing a ZodError with the offending key/value if the theme is invalid
const theme = defineTheme(themeJson);

const options = defineOptions({
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  enableResponsive: true,

  spacing: {
    enabled: true,
  },

  // typography: {
  //   cssVarDriven: true,  // Inject --typography-* vars into :root; override via CSS
  // },

  // Classes built at runtime (e.g. \`bg-\${variant}\`) that Tailwind's static
  // candidate scan can never see — emitted as @source inline(...) instead:
  // extraSources: ["hover:bg-{primary,secondary}"],
});

const { css, tokens } = generate(theme, options);

// Write theme.css next to this script. Import it from your CSS entry point
// alongside Tailwind itself:
//   @import "tailwindcss";
//   @import "./theme.css";
const outDir = dirname(fileURLToPath(import.meta.url));
writeFileSync(resolve(outDir, "theme.css"), css, "utf8");

// Regenerate on demand: npx style-gen generate --watch
export { tokens };
`;
