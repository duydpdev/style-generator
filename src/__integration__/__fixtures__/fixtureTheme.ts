import type { StyleGeneratorOptions } from "../../core/Options";
import { defineTheme } from "../../core/defineTheme";

export const fixtureOptions: StyleGeneratorOptions = {
  breakpoints: ["md", "lg"],
};

export const fixtureTheme = defineTheme({
  colors: {
    primary: "#3B82F6",
    primaryHover: "#2563EB",
    primaryActive: "#1D4ED8",
    primarySelected: "#1E40AF",
    accent: "#F59E0B",
    "accent-hover": "#D97706",
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
  backdropBlurs: {
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
  motionDuration: { fast: "150ms", slow: "0.4s" },
  motionEasing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)",
    emphasized: "ease-out",
  },
  controlHeight: { sm: "32px", md: "2.5rem" },
  iconSize: { sm: "16px", md: "1.25rem" },
  opacity: { disabled: 0.4, muted: 0.64 },
  zIndex: { overlay: 40, modal: 50 },
  themeAxes: {
    theme: {
      dark: {
        colors: {
          primary: "#60A5FA",
          background: "#111827",
        },
      },
    },
  },
});
