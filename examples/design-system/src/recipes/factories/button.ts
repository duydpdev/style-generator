import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";

import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export type ButtonTint = "outline" | "soft" | "ghost" | "link";
export const BUTTON_TINTS = [
  "outline",
  "soft",
  "ghost",
  "link",
] as const satisfies readonly ButtonTint[];

/** Button roles. `focusRing`/`tint` are literal classes: the registry emits no `outline-*` or `/10` classes. */
export interface ButtonPreset {
  /** Colour keys offered as `color`; `<intent>Hover` / `on<Intent>` siblings come from `tokens.colors`. */
  readonly intents: readonly string[];
  /** Outline-variant fill, and the text colour of a filled intent without an `on<Intent>` sibling. */
  readonly background: string;
  readonly radius: string;
  readonly type: string;
  readonly typeLg: string;
  readonly focusRing: Readonly<Record<string, string>>;
  readonly tint: Readonly<Record<string, Readonly<Record<ButtonTint, string>>>>;
}

export const buttonTables = (
  t: RecipeTokens,
  preset: ButtonPreset,
): RecipeTables => {
  // `bg-primary hover:bg-primary-hover active:bg-primary-active` when the theme declares the state siblings.
  const bgStates = createVariantMapper("bg", t.colors, {
    states: COLOR_STATES,
  });
  const bg = createVariantMapper("bg", t.colors);
  const rounded = createVariantMapper("rounded", t.borderRadius);
  const type = createVariantMapper("", t.typography);
  const fill = (intent: string): string[] => {
    const classes = [
      pick(bgStates, intent),
      contrastText(t.colors, intent, preset.background),
    ];
    if (!t.colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
    return classes;
  };
  return {
    base: [
      "inline-flex shrink-0 items-center justify-center gap-1.5",
      `${pick(rounded, preset.radius)} border`,
      `cursor-pointer ${pick(type, preset.type)} whitespace-nowrap outline-hidden select-none`,
      "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2",
      "transition-[background-color,color,opacity] duration-150",
      "disabled:cursor-not-allowed disabled:opacity-50",
    ],
    variants: {
      variant: {
        fill: "border-transparent active:scale-[0.98]",
        outline: `${pick(bg, preset.background)} active:scale-[0.98]`,
        soft: "border-transparent active:scale-[0.98]",
        ghost: "border-transparent active:scale-[0.98]",
        link: "border-transparent underline-offset-4 hover:underline",
      },
      color: Object.fromEntries(
        preset.intents.map((intent) => [
          intent,
          pick(preset.focusRing, intent),
        ]),
      ),
      size: {
        sm: "h-7 px-2.5",
        md: "h-9 px-3.5",
        lg: `h-11 px-5 ${pick(type, preset.typeLg)}`,
      },
    },
    compoundVariants: preset.intents.flatMap((intent) => [
      { color: intent, variant: "fill", class: fill(intent) },
      ...BUTTON_TINTS.map((variant) => ({
        color: intent,
        variant,
        class: pick(preset.tint[intent] ?? {}, variant),
      })),
    ]),
    defaultVariants: {
      variant: "fill",
      color: preset.intents[0],
      size: "md",
    },
  };
};

export const createButtonRecipe = (
  t: RecipeTokens,
  preset: ButtonPreset,
): RecipeFn => recipeFromTables(buttonTables(t, preset));
