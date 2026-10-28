import { memo, type ComponentProps, type ElementType } from "react";
import {
  boxRecipe,
  cn,
  splitSpacingProps,
  tokens,
  type BoxSpacingProps,
  type BoxStyleProps,
} from "design-system-example";

export type BoxProps = Omit<ComponentProps<"div">, "color"> &
  BoxSpacingProps &
  BoxStyleProps & {
    innerBorder?: boolean;
    as?: ElementType;
  };

const BoxComponent = ({
  as,
  children,
  className,
  style,
  innerBorder,
  position,
  backgroundColor,
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
  shadow,
  backdropBlur,
  width,
  maxWidth,
  height,
  maxHeight,
  minHeight,
  minWidth,
  ...props
}: BoxProps) => {
  const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
  const Component = as ?? "div";

  return (
    <Component
      {...rest}
      className={cn(
        boxRecipe({
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
        spacing.className,
        className,
      )}
      style={{
        width,
        height,
        minHeight,
        maxWidth,
        maxHeight,
        minWidth,
        ...spacing.style,
        ...style,
      }}
    >
      {children}
      {innerBorder && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            boxRecipe({
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

export const Box = memo(BoxComponent);
