import type { StyleGuideState, ThemeName } from "./sections/types";

export const THEME_CYCLE: readonly ThemeName[] = [
  "base",
  "dark",
  "highContrast",
];

export const INITIAL: StyleGuideState = {
  palette: "base",
  theme: "base",
  voice: "editorial",
  geometry: "soft",
  surface: "lifted",
};

/**
 * Embedded in the style-generator site (`/examples`), the app follows the
 * site's light/dark theme: `?theme=light|dark` picks the first theme and the
 * shell posts `{ type: "sg-site-theme", theme }` on later toggles. Standalone
 * (no query, no message) it starts on `base`, exactly as before.
 */
export const SITE_THEME_MESSAGE = "sg-site-theme";
export const FRAME_THEME_MESSAGE = "sg-example-theme";

export const fromSiteTheme = (value: unknown): ThemeName | undefined => {
  if (value === "light") return "base";
  if (value === "dark") return "dark";
  return undefined;
};

export const initialState = (): StyleGuideState => {
  const theme = fromSiteTheme(
    new URLSearchParams(window.location.search).get("theme"),
  );
  return theme ? { ...INITIAL, theme } : INITIAL;
};
