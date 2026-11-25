import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

export type ButtonTint = "outline" | "soft" | "ghost" | "link";
export const BUTTON_TINTS = [
  "outline",
  "soft",
  "ghost",
  "link",
] as const satisfies readonly ButtonTint[];

/** The tokens the button reads: the recipe tokens plus the `controlHeight` keys. */
export interface ButtonTokens extends RecipeTokens {
  readonly controlHeight: readonly string[];
}

/** Button roles. `focusRing`, `disabled` and `hoverTint` are literal classes: the registry emits no `focus-visible:`, `disabled:` or `hover:bg-<key>-subtle` variant. */
export interface ButtonPreset {
  /** Colour keys offered as `color`; `<intent>Hover` / `<intent>Foreground` / `<intent>Subtle` / `<intent>SubtleForeground` siblings come from `tokens.colors`. */
  readonly intents: readonly string[];
  /** Outline-variant fill, and the text colour of a solid intent without an `<intent>Foreground` sibling. */
  readonly background: string;
  readonly radius: string;
  readonly type: string;
  readonly typeLg: string;
  /** `controlHeight` key per size; `icon` uses `md`. */
  readonly height: Readonly<Record<"sm" | "md" | "lg", string>>;
  readonly focusRing: string;
  readonly disabled: string;
  /** Per intent: the `outline`/`ghost` hover fill. */
  readonly hoverTint: Readonly<Record<string, string>>;
}

export const buttonTables = (t: ButtonTokens, preset: ButtonPreset) => {
  // `bg-primary hover:bg-primary-hover active:bg-primary-active` when the theme declares the state siblings.
  const bgStates = createVariantMapper("bg", t.colors, {
    states: COLOR_STATES,
  });
  const bg = createVariantMapper("bg", t.colors);
  const text = createVariantMapper("text", t.colors);
  const border = createVariantMapper("border", t.colors);
  const rounded = createVariantMapper("rounded", t.borderRadius);
  const height = createVariantMapper("h-control", t.controlHeight);
  const type = createVariantMapper("", t.typography);
  const solid = (intent: string): string[] => {
    const classes = [
      pick(bgStates, intent),
      contrastText(t.colors, intent, preset.background),
    ];
    if (!t.colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
    return classes;
  };
  const tint = (intent: string): Record<ButtonTint, string[]> => {
    const hover = pick(preset.hoverTint, intent);
    return {
      outline: [pick(border, intent), pick(text, intent), hover],
      soft: [
        pick(bg, `${intent}Subtle`),
        pick(text, `${intent}SubtleForeground`),
        "hover:opacity-90",
      ],
      ghost: [pick(text, intent), hover],
      link: [pick(text, intent)],
    };
  };
  return {
    base: [
      "inline-flex shrink-0 items-center justify-center gap-1.5",
      `${pick(rounded, preset.radius)} border`,
      `cursor-pointer ${pick(type, preset.type)} whitespace-nowrap outline-hidden select-none`,
      `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${preset.focusRing}`,
      "transition-[background-color,color,opacity] duration-150",
      `disabled:cursor-not-allowed ${preset.disabled}`,
    ],
    variants: {
      variant: {
        solid: "border-transparent active:scale-[0.98]",
        outline: `${pick(bg, preset.background)} active:scale-[0.98]`,
        soft: "border-transparent active:scale-[0.98]",
        ghost: "border-transparent active:scale-[0.98]",
        link: "border-transparent underline-offset-4 hover:underline",
      },
      color: Object.fromEntries(preset.intents.map((intent) => [intent, ""])),
      size: {
        sm: `${pick(height, preset.height.sm)} px-2.5`,
        md: `${pick(height, preset.height.md)} px-3.5`,
        lg: `${pick(height, preset.height.lg)} px-5 ${pick(type, preset.typeLg)}`,
        icon: `${pick(height, preset.height.md)} aspect-square px-0`,
      },
      // Set by the components when there is no label and exactly one icon slot.
      // `px-0` must beat the size's `px-*`: the components pass the recipe through `cn` (tailwind-merge), which keeps the later class, so `iconOnly` stays after `size`.
      iconOnly: { true: "aspect-square px-0" },
    },
    compoundVariants: preset.intents.flatMap((intent) => {
      const tints = tint(intent);
      return [
        { color: intent, variant: "solid", class: solid(intent) },
        ...BUTTON_TINTS.map((variant) => ({
          color: intent,
          variant,
          class: tints[variant],
        })),
      ];
    }),
    defaultVariants: {
      variant: "solid",
      color: preset.intents[0],
      size: "md",
    },
  } satisfies RecipeTables;
};

export const createButtonRecipe = (t: ButtonTokens, preset: ButtonPreset) =>
  recipeFromTables(buttonTables(t, preset));
