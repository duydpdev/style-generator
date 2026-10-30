import { theme as baseTheme } from "design-system-example";

import { PALETTES, type ColorTokens } from "./paletteColors";
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
