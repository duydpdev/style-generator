import {
  badgeRecipe,
  boxRecipe,
  buttonRecipe,
  cardRecipe,
  cn,
  dialogRecipe,
  inputRecipe,
  intents,
  splitSpacingProps,
  stackRecipe,
  textRecipe,
  tokens,
  type BoxSpacingProps,
} from "design-system-example";

import { ThemeSwitch } from "./ThemeSwitch";

/** Resolve the shared spacing props to the `sp-*` class and its CSS variables. */
const spaced = (props: BoxSpacingProps) =>
  splitSpacingProps(props, tokens.spacingProperties).spacing;

const BUTTON_VARIANTS = ["fill", "outline", "soft", "ghost", "link"] as const;

export default function Page() {
  const section = spaced({ py: { base: 6, md: 10 }, px: 4 });
  const gap = spaced({ gap: { base: 2, md: 4 } });

  return (
    <main
      className={cn(
        stackRecipe({ direction: "column" }),
        "mx-auto max-w-[960px]",
        section.className,
      )}
      style={section.style}
    >
      <header className={stackRecipe({ justify: "between", wrap: true })}>
        <div>
          <p className={textRecipe({ type: "text12Mono", color: "muted" })}>
            @duydpdev/style-generator · Next.js 16
          </p>
          <h1 className={textRecipe({ type: "display56Serif" })}>
            Shared design system
          </h1>
        </div>
        <ThemeSwitch />
      </header>

      <section
        className={cn(
          cardRecipe({ tone: "surface", padding: "lg" }),
          stackRecipe({ direction: "column" }),
          gap.className,
        )}
        style={gap.style}
      >
        <h2 className={textRecipe({ type: "text20Semibold" })}>Buttons</h2>
        {intents.map((color) => (
          <div
            key={color}
            className={cn(
              stackRecipe({ direction: "row", wrap: true }),
              "gap-2",
            )}
          >
            <span className={badgeRecipe({ color })}>{color}</span>
            {BUTTON_VARIANTS.map((variant) => (
              <button
                key={variant}
                type="button"
                className={buttonRecipe({ variant, color })}
              >
                {variant}
              </button>
            ))}
          </div>
        ))}
      </section>

      <section
        className={cn(
          cardRecipe({ tone: "outline", padding: "md" }),
          stackRecipe({ direction: "column" }),
          "gap-3",
        )}
      >
        <h2 className={textRecipe({ type: "text20Semibold" })}>Inputs</h2>
        <input
          className={inputRecipe({ size: "md" })}
          placeholder="Default input"
        />
        <input
          className={inputRecipe({ size: "md", invalid: true })}
          placeholder="Invalid input"
          aria-invalid="true"
        />
      </section>

      <section
        className={cn(
          boxRecipe({
            backgroundColor: "surface",
            rounded: "lg",
            shadow: "md",
          }),
          "relative p-6",
        )}
      >
        <div className={dialogRecipe({ size: "sm" })}>
          <h2 className={textRecipe({ type: "text20Semibold" })}>Dialog</h2>
          <p className={textRecipe({ type: "text14Regular", color: "muted" })}>
            Headless panel recipe; the app owns the open state and the overlay.
          </p>
        </div>
      </section>
    </main>
  );
}
