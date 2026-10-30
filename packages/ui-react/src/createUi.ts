import { createBox, createBoxStyles } from "./Box";
import type { Ui, UiPresets, UiTokens } from "./shared/uiTypes";

/**
 * Builds the app's components once from its `DesignTokens.Web` tokens
 * (`createDesignTokens(theme, options).DesignTokens.Web`) and its role
 * presets. Call it once per app, in that app's `ui.ts`.
 * @param tokens - The app's browser-safe token arrays
 * @param _presets - The app's role presets; `{}` while no preset-driven component exists
 * @returns The token-typed components
 */
export function createUi<W extends UiTokens>(
  tokens: W,
  // Fixes the final call shape now; the roles that read it arrive with the
  // preset-driven components.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- no role reads presets yet
  _presets: UiPresets,
): Ui<W> {
  return { Box: createBox(createBoxStyles(tokens.colors)) };
}
