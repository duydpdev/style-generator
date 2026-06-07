import { memo } from "react";
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

import { cn } from "../../lib/utils";

import { boxStyle } from "./style";
import type { BoxProps } from "./type";

const BoxComponent = ({
  children,
  as,
  position,
  backgroundColor,
  borderColor,
  width,
  maxWidth,
  height,
  maxHeight,
  minHeight,
  minWidth,
  style,
  innerBorder,
  shadow,
  backdropBlur,
  className,
  // Spacing
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  top,
  left,
  right,
  bottom,
  gap,
  gapX,
  gapY,
  // Border / rounded
  border,
  borderX,
  borderY,
  borderT,
  borderB,
  borderL,
  borderR,
  rounded,
  roundedT,
  roundedB,
  roundedL,
  roundedR,
  ...props
}: BoxProps) => {
  const { classNames: spacingClasses, style: spacingStyle } =
    resolveSpacingProps({
      p,
      px,
      py,
      pt,
      pb,
      pl,
      pr,
      m,
      mx,
      my,
      mt,
      mb,
      ml,
      mr,
      top,
      left,
      right,
      bottom,
      gap,
      "gap-x": gapX,
      "gap-y": gapY,
    });

  const Component = as ?? "div";

  return (
    <Component
      className={cn(
        boxStyle({
          backgroundColor,
          position,
          borderColor,
          innerBorder,
          border,
          borderX,
          borderY,
          borderT,
          borderB,
          borderL,
          borderR,
          rounded,
          roundedT,
          roundedB,
          roundedL,
          roundedR,
          shadow,
          backdropBlur,
        }),
        ...spacingClasses,
        className,
      )}
      style={{
        width,
        height,
        minHeight,
        maxWidth,
        maxHeight,
        minWidth,
        ...spacingStyle,
        ...style,
      }}
      {...props}
    >
      {children}
      {innerBorder && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            boxStyle({
              position: "absolute",
              borderColor,
              border,
              borderX,
              borderY,
              borderT,
              borderB,
              borderL,
              borderR,
              rounded,
              roundedT,
              roundedB,
              roundedL,
              roundedR,
            }),
          )}
        />
      )}
    </Component>
  );
};

const Box = memo(BoxComponent);

export { Box };
