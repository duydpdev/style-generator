import { createVariantMapper } from "@duydpdev/style-generator/cva";

/** Maps a color key to its `bg-*` class; `undefined` → no class. */
export type BoxStyles = (
  backgroundColor: string | undefined,
) => string | undefined;

/**
 * Builds the `Box` class lookup from the app's color tokens.
 * @param colors - `tokens.colors` of the app
 * @returns The lookup `createBox` binds
 */
export function createBoxStyles(colors: readonly string[]): BoxStyles {
  const backgroundColor = createVariantMapper("bg", colors);
  return (key) => (key === undefined ? undefined : backgroundColor[key]);
}
