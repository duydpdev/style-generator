import type { JSX } from "react";

import { mergeStyle, splitStyleProps } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { BoxDeps } from "./Box.types";

const OVERLAY_KEYS = [
  "borderColor",
  "border",
  "borderX",
  "borderY",
  "borderT",
  "borderB",
  "borderL",
  "borderR",
  "rounded",
  "roundedT",
  "roundedB",
  "roundedL",
  "roundedR",
] as const;

export const createBox = (deps: BoxDeps) =>
  function Box({
    as,
    className,
    style,
    innerBorder,
    children,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "div";
    const framed = innerBorder === true;
    const extra = framed
      ? { innerBorder: true, position: props.position ?? "relative" }
      : {};
    const split = splitStyleProps(props, deps.box, deps.spacing, extra);
    const overlay = Object.fromEntries(
      OVERLAY_KEYS.map((key) => [key, split.variants[key]]),
    );
    return (
      <Component
        {...split.rest}
        className={deps.cn(split.className, className)}
        style={mergeStyle(split.style, style)}
      >
        {children}
        {framed && (
          <span
            aria-hidden="true"
            className={deps.cn(
              deps.box({
                ...overlay,
                overlay: true,
                position: "absolute",
              }),
            )}
          />
        )}
      </Component>
    );
  };
