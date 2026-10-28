import type { axisAttributes } from "design-system-example";

type AxesState = Parameters<typeof axisAttributes>[0];

/**
 * SSR-safe axis state: `useState` seeds the same value on the server and the
 * client, so the `<html data-*>` attributes match across hydration.
 * @returns The shared `{ theme, palette }` state.
 */
export const useThemeAxes = () =>
  useState<AxesState>("theme-axes", () => ({ theme: "base", palette: "base" }));
