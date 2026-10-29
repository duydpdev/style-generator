import { theme as baseTheme } from "design-system-example";

import type { PaletteId, ThemeName } from "./types";

/** `base` is the palette `theme.json` declares at the top level (no attribute on `<html>`). */
export const PALETTE_LIST = [
  {
    id: "base",
    label: "Cobalt",
    dots: ["#2647D9", "#6E5BFF", "#FAF7F2"],
  },
  {
    id: "forest",
    label: "Forest",
    dots: ["#2F5F47", "#B07C3A", "#F4F1EA"],
  },
  {
    id: "sunset",
    label: "Sunset",
    dots: ["#B23A1B", "#7A3E47", "#FAF3EA"],
  },
  {
    id: "mono",
    label: "Mono",
    dots: ["#0A0A0A", "#525252", "#FAFAFA"],
  },
] as const satisfies readonly {
  id: PaletteId;
  label: string;
  dots: readonly string[];
}[];

interface ColorTokens {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
}

interface PaletteSet {
  light: ColorTokens;
  dark: ColorTokens;
}

export const PALETTES: Record<PaletteId, PaletteSet> = {
  base: {
    light: {
      primary: "#2647D9",
      secondary: "#6E5BFF",
      success: "#2E7D5B",
      danger: "#C8462C",
      background: "#FAF7F2",
      surface: "#FFFFFF",
      foreground: "#0F1530",
      muted: "#6B6D7A",
    },
    dark: {
      primary: "#8FA6FF",
      secondary: "#A89AFF",
      success: "#6BBF93",
      danger: "#F08369",
      background: "#0B0E1D",
      surface: "#161A2D",
      foreground: "#F2EFE9",
      muted: "#8A8FA8",
    },
  },
  forest: {
    light: {
      primary: "#2F5F47",
      secondary: "#B07C3A",
      success: "#5C8A4A",
      danger: "#B84A2E",
      background: "#F4F1EA",
      surface: "#FFFFFE",
      foreground: "#1A2620",
      muted: "#6E7570",
    },
    dark: {
      primary: "#7DBA9E",
      secondary: "#E3B47A",
      success: "#9DCC85",
      danger: "#E8866A",
      background: "#0F1612",
      surface: "#1A2520",
      foreground: "#EAE5D9",
      muted: "#91998F",
    },
  },
  sunset: {
    light: {
      primary: "#B23A1B",
      secondary: "#7A3E47",
      success: "#5C7A4A",
      danger: "#991B1B",
      background: "#FAF3EA",
      surface: "#FFFDF8",
      foreground: "#1F1410",
      muted: "#8B6E55",
    },
    dark: {
      primary: "#F08967",
      secondary: "#C99098",
      success: "#9DBA8A",
      danger: "#E36868",
      background: "#1A0F0A",
      surface: "#251913",
      foreground: "#FAEEDF",
      muted: "#B59A82",
    },
  },
  mono: {
    light: {
      primary: "#0A0A0A",
      secondary: "#525252",
      success: "#166534",
      danger: "#B91C1C",
      background: "#FAFAFA",
      surface: "#FFFFFF",
      foreground: "#0A0A0A",
      muted: "#737373",
    },
    dark: {
      primary: "#FAFAFA",
      secondary: "#A3A3A3",
      success: "#6EE7B7",
      danger: "#F87171",
      background: "#0A0A0A",
      surface: "#141414",
      foreground: "#FAFAFA",
      muted: "#A3A3A3",
    },
  },
};

/** The high-contrast surfaces `palettes.css` forces on every non-base palette. */
const HIGH_CONTRAST_SURFACES = {
  background: "#000000",
  surface: "#000000",
  foreground: "#ffffff",
  muted: "#d0d0d0",
};

/**
 * The swatch colors the page resolves to for an axes state: `theme.json`'s
 * `highContrast` override on the base palette, the palette's dark brand colors
 * on black/white surfaces (the compound rules in `palettes.css`) otherwise.
 * @param palette - active `palette` axis variant
 * @param theme - active `theme` axis variant
 * @returns the eight role colors
 */
export const colorsFor = (
  palette: PaletteId,
  theme: ThemeName,
): ColorTokens => {
  const set = PALETTES[palette];
  if (theme === "base") return set.light;
  if (theme === "dark") return set.dark;
  return palette === "base"
    ? baseTheme.themeAxes.theme.highContrast.colors
    : { ...set.dark, ...HIGH_CONTRAST_SURFACES };
};

export const COLOR_ROWS = [
  { key: "primary", label: "Primary", desc: "Brand · CTAs · focus" },
  { key: "secondary", label: "Secondary", desc: "Accent · highlights" },
  { key: "success", label: "Success", desc: "Confirmations" },
  { key: "danger", label: "Danger", desc: "Errors · destructive" },
  { key: "background", label: "Background", desc: "Page surface" },
  { key: "surface", label: "Surface", desc: "Cards · sheets" },
  { key: "foreground", label: "Foreground", desc: "Body ink" },
  { key: "muted", label: "Muted", desc: "Subtle text · dividers" },
] as const;

export type ColorRow = (typeof COLOR_ROWS)[number];
export type ColorKey = ColorRow["key"];
