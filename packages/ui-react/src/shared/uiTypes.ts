import type { ReactElement } from "react";

import type { BoxProps } from "../Box/Box.types";

/**
 * The token arrays `createUi` reads: structurally a subset of
 * `DesignTokens.Web` (`createDesignTokens(theme, options).DesignTokens.Web`),
 * so any app's tokens fit without naming its theme.
 */
export interface UiTokens {
  readonly colors: readonly string[];
}

/** The app's color keys (`"primary" | "bg" | …`). */
export type ColorKey<W extends UiTokens> = W["colors"][number];

/**
 * The app's role presets (intents, role color/radius/type keys, literal
 * class tables). Every role is optional; an omitted role means its
 * component is not returned. No preset-driven component exists yet, so
 * the map has no roles and `{}` is the value every app passes.
 */
export type UiPresets = Readonly<Record<never, never>>;

/** The components `createUi(tokens, presets)` returns, typed by that app's tokens. */
export interface Ui<W extends UiTokens> {
  /** A `div`; `backgroundColor` accepts only the app's color keys. Needs tokens only. */
  Box: (
    props: Omit<BoxProps, "backgroundColor"> & {
      backgroundColor?: ColorKey<W> | undefined;
    },
  ) => ReactElement;
}
