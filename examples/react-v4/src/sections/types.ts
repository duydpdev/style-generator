import type { PaletteId } from "./palettes";

export type ThemeName = "light" | "dark";
export type Voice = "editorial" | "industrial" | "humanist";
export type Geometry = "sharp" | "soft" | "pillowy";
export type Surface = "flat" | "lifted" | "glass";

export interface StyleGuideState {
  palette: PaletteId;
  theme: ThemeName;
  voice: Voice;
  geometry: Geometry;
  surface: Surface;
}

export type TweakSetter = <K extends keyof StyleGuideState>(
  key: K,
  value: StyleGuideState[K],
) => void;
