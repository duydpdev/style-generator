import type { StyleGeneratorOptions } from "../../core/Options";
import { defineTheme } from "../../core/defineTheme";

export const fixtureOptions: StyleGeneratorOptions = {
  breakpoints: ["md", "lg"],
};

export const fixtureTheme = defineTheme({
  colors: {
    primary: "#3B82F6",
    secondary: "#10B981",
    sidebarForeground: "#111827",
    blue500: "#3B82F6",
    background: "#FFFFFF",
    clear: "transparent",
  },
  typography: {
    text12Mono: {
      fontSize: "12px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    flat: "none",
  },
  backDropBlurs: {
    sm: "4px",
    soft: "2px",
  },
  borderRadius: {
    "2xl": "1rem",
    square: "0px",
  },
  fontFamily: {
    sans: "Inter, sans-serif",
  },
  borderWidth: {
    thin: "1px",
    "2xl": "8px",
    zero: "0px",
  },
  themes: {
    dark: {
      colors: {
        primary: "#60A5FA",
        background: "#111827",
      },
    },
  },
});
