import type { RecipeTokens } from "design-system-example/recipes";

/** What `createUi` reads from `DesignTokens.Web` (structural, so any app's tokens fit). */
export type UiTokens = RecipeTokens;

export type ColorKey<W extends UiTokens> = W["colors"][number];
export type TypographyKey<W extends UiTokens> = W["typography"][number];
export type ShadowKey<W extends UiTokens> = W["shadows"][number];
export type BlurKey<W extends UiTokens> = W["backDropBlurs"][number];
export type RadiusKey<W extends UiTokens> = W["borderRadius"][number];
export type BorderWidthKey<W extends UiTokens> = W["borderWidth"][number];
export type SpacingPropertyKey<W extends UiTokens> =
  W["spacingProperties"][number];
export type BreakpointKey<W extends UiTokens> = W["breakpoints"][number];
