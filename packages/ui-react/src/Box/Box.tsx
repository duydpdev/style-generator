import { useMemo, type ReactElement } from "react";

import type { BoxStyles } from "./Box.styles";
import type { BoxProps } from "./Box.types";

/**
 * Binds `Box` to one app's styles; `createUi` calls it once per app.
 * @param styles - Lookup from `createBoxStyles(tokens.colors)`
 * @returns The app's `Box`
 */
export function createBox(styles: BoxStyles) {
  return function Box({
    backgroundColor,
    className,
    ...rest
  }: BoxProps): ReactElement {
    // useMemo keeps the class string stable across renders. It is also the
    // hook that fails fast ("Invalid hook call") if an app bundles a second React.
    const classes = useMemo(
      () =>
        [styles(backgroundColor), className].filter(Boolean).join(" ") ||
        undefined,
      [backgroundColor, className],
    );
    return <div {...rest} className={classes} />;
  };
}
