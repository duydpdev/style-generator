import {
  createCn,
  mergeStyle,
  splitSpacing,
  type RecipeTokens,
  type ThemeSpacingProps,
} from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import {
  createButtonRecipe,
  type ButtonPreset,
} from "design-system-example/recipes";
import type { CSSProperties, ElementType, JSX, ReactNode } from "react";

type ButtonOwnProps<
  W extends RecipeTokens,
  B extends string,
> = ThemeSpacingProps<W> & {
  readonly variant?: "fill" | "outline" | "soft" | "ghost" | "link" | undefined;
  /** One of `preset.intents`. */
  readonly color?: B | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly prefix?: ReactNode;
  readonly suffix?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Button`: variant × intent × size from the button recipe; a `<button>` gets `type="button"` unless one is passed. */
export const createButton = <
  W extends RecipeTokens,
  B extends W["colors"][number],
>(
  tokens: W,
  preset: ButtonPreset & { readonly intents: readonly B[] },
) => {
  const cn = createCn(tokens);
  const button = createButtonRecipe(tokens, preset);
  const spacingKeys = tokens.spacingProperties;
  return function Button<T extends ElementType = "button">({
    as,
    className,
    style,
    variant,
    color,
    size,
    prefix,
    suffix,
    children,
    ...props
  }: Polymorphic<T, ButtonOwnProps<W, B>>): JSX.Element {
    const Component: ElementType = as ?? "button";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        type={Component === "button" ? "button" : undefined}
        {...split.rest}
        data-slot="button"
        className={
          cn(button({ variant, color, size }), split.className, className) ||
          undefined
        }
        style={mergeStyle(split.style, style)}
      >
        {prefix != null && <span data-icon="start">{prefix}</span>}
        <span>{children}</span>
        {suffix != null && <span data-icon="end">{suffix}</span>}
      </Component>
    );
  };
};
