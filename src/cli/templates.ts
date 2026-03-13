export const themeTemplate = `{
  "colors": {
    "base": {
      "primary": "#3B82F6",
      "secondary": "#6366F1",
      "background": "#FFFFFF",
      "surface": "#F9FAFB"
    },
    "text": {
      "main": "#111827",
      "muted": "#6B7280"
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

export const themeTemplateDark = `{
  "colors": {
    "base": {
      "primary": "#3B82F6",
      "secondary": "#6366F1",
      "background": "#FFFFFF",
      "surface": "#F9FAFB"
    },
    "text": {
      "main": "#111827",
      "muted": "#6B7280"
    }
  },
  "themes": {
    "dark": {
      "colors": {
        "base": {
          "background": "#111827",
          "surface": "#1F2937"
        },
        "text": {
          "main": "#F9FAFB",
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

export const getPluginTemplate = (
  themeRelPath: string,
) => `import { createStyleSystem, defineTheme, defineOptions, Breakpoint } from "@duydpdev/style-generator";
import themeJson from "${themeRelPath}";

// defineTheme() provides full TypeScript type-checking on your theme config (zero runtime cost)
const theme = defineTheme(themeJson);

const options = defineOptions({
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  enableCssVariables: true,
  // colorNamingMode: "v3",  // "v3" (default) | "v4" | "flat"
  enableResponsive: true,

  spacing: {
    enabled: true,
    // useMatchUtilities: true,  // Enable JIT: sp-p-4, sp-p-[24px] (in addition to .sp-p)
  },

  // typography: {
  //   cssVarDriven: true,  // Inject --typography-* vars into :root; override via CSS
  // },

  layout: {
    enabled: true,
    values: ["hidden", "block", "flex", "grid", "inline-block", "inline-flex", "items-center", "justify-center", "justify-between", "text-center"],
  },

  border: { enabled: true },
  rounded: { enabled: true },
  opacity: { enabled: true },
  zIndex: { enabled: true },

  responsiveModules: ["layout", "rounded"],
  dynamicClasses: [],
});

const { plugin, safelist, DesignTokens } = createStyleSystem(theme, options);

export default plugin;

// Safelist is managed by CLI: npx style-gen safelist
export { safelist, DesignTokens };
`;
