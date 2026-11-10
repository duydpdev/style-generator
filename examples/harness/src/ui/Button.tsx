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

/**
 * An icon slot is a flex box so an inline-level icon (an inline-block wrapper,
 * `<iconify-icon>`) is centred instead of sitting on the 24px line box's baseline.
 * `empty:hidden` drops a slot whose content rendered nothing, so it takes no `gap`.
 */
const ICON_SLOT = "flex shrink-0 items-center empty:hidden";

/** Content React renders: not `null`/`undefined`, a boolean (`{open && "Label"}`) or `""`. */
const present = (node: ReactNode): boolean =>
  node != null && typeof node !== "boolean" && node !== "";

/**
 * `Button`: variant × intent × size from the button recipe; a `<button>` gets `type="button"` unless one is passed.
 * An icon-only button passes the icon as `prefix` (or `suffix`) with no label and an `aria-label`:
 * no label span is rendered, so `gap` cannot push the icon off centre, and the button is square.
 */
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
    const iconOnly = !present(children) && present(prefix) !== present(suffix);
    return (
      <Component
        type={Component === "button" ? "button" : undefined}
        {...split.rest}
        data-slot="button"
        className={
          cn(
            button({ variant, color, size, iconOnly }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      >
        {present(prefix) && (
          <span data-icon="start" className={ICON_SLOT}>
            {prefix}
          </span>
        )}
        {present(children) && <span className="empty:hidden">{children}</span>}
        {present(suffix) && (
          <span data-icon="end" className={ICON_SLOT}>
            {suffix}
          </span>
        )}
      </Component>
    );
  };
};
