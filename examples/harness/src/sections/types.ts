import type { axisAttributes } from "design-system-example";

type AxesState = Parameters<typeof axisAttributes>[0];

/** `"base" | "dark" | "highContrast"`: the variants of `theme.json`'s `theme` axis. */
export type ThemeName = NonNullable<AxesState["theme"]>;
/** `"base" | "forest" | "sunset" | "mono"`: the variants of the `palette` axis. */
export type PaletteId = NonNullable<AxesState["palette"]>;
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
