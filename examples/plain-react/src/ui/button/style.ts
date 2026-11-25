import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

const BUTTON_TINTS = ["outline", "soft", "ghost", "link"] as const;

type ButtonTint = (typeof BUTTON_TINTS)[number];

// #region docs:button-preset
/**
 * The intents `color` offers. `satisfies` is the DX anchor: rename or
 * remove one of these colors in theme.json and the compiler fails here.
 * Each needs `<intent>Subtle` and `<intent>SubtleForeground` for `soft`.
 */
export const buttonIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `hover:` variant of a `Subtle` key. */
const hoverTint = {
  primary: "hover:bg-primary-subtle",
  secondary: "hover:bg-secondary-subtle",
  success: "hover:bg-success-subtle",
  danger: "hover:bg-danger-subtle",
} as const satisfies Record<ButtonIntent, string>;

/** Literal classes keyed by the theme key they name: the generator emits no `focus-visible:`/`disabled:` variant of a theme key, so Tailwind finds these by scanning this file. `satisfies` fails when a key leaves the theme. */
const stateClasses = {
  focus: { focus: "focus-visible:outline-focus" },
  disabled: { disabled: "disabled:opacity-disabled" },
} as const satisfies {
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles, one `controlHeight` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
  height: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  background: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  typeLg: TextVariant<typeof theme>;
  height: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};
// #endregion docs:button-preset

export type ButtonIntent = (typeof buttonIntents)[number];

const colors: readonly string[] = tokens.colors;
// `bg-primary hover:bg-primary-hover active:bg-primary-active` when the theme declares the state siblings.
const bgStates = createVariantMapper("bg", tokens.colors, {
  states: COLOR_STATES,
});
const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const border = createVariantMapper("border", tokens.colors);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const height = createVariantMapper("h-control", tokens.controlHeight);
const type = createVariantMapper("", tokens.typography);

/** A solid intent: state backgrounds, `<intent>Foreground` text (else `text-background`), `hover:opacity-90` without an `<intent>Hover` color. */
const solid = (intent: ButtonIntent): string[] => {
  const classes = [
    pick(bgStates, intent),
    contrastText(colors, intent, themeKeys.background),
  ];
  if (!colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
  return classes;
};

/** The other variants: `outline`/`ghost` hover on `<intent>Subtle`, `soft` is `<intent>Subtle` with `<intent>SubtleForeground` text. */
const tint = (intent: ButtonIntent): Record<ButtonTint, string[]> => ({
  outline: [pick(border, intent), pick(text, intent), hoverTint[intent]],
  soft: [
    pick(bg, `${intent}Subtle`),
    pick(text, `${intent}SubtleForeground`),
    "hover:opacity-90",
  ],
  ghost: [pick(text, intent), hoverTint[intent]],
  link: [pick(text, intent)],
});

/** Button as data: variant × intent × size. */
export const buttonTables = {
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    `${pick(rounded, themeKeys.radius)} border`,
    `cursor-pointer ${pick(type, themeKeys.type)} whitespace-nowrap outline-hidden select-none`,
    `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
    "transition-[background-color,color,opacity] duration-150",
    `disabled:cursor-not-allowed ${stateClasses.disabled.disabled}`,
  ],
  variants: {
    variant: {
      solid: "border-transparent active:scale-[0.98]",
      outline: `${pick(bg, themeKeys.background)} active:scale-[0.98]`,
      soft: "border-transparent active:scale-[0.98]",
      ghost: "border-transparent active:scale-[0.98]",
      link: "border-transparent underline-offset-4 hover:underline",
    },
    color: Object.fromEntries(buttonIntents.map((intent) => [intent, ""])),
    size: {
      sm: `${pick(height, themeKeys.height.sm)} px-2.5`,
      md: `${pick(height, themeKeys.height.md)} px-3.5`,
      lg: `${pick(height, themeKeys.height.lg)} px-5 ${pick(type, themeKeys.typeLg)}`,
      icon: `${pick(height, themeKeys.height.md)} aspect-square px-0`,
    },
    // Set by the components when there is no label and exactly one icon slot.
    // `px-0` must beat the size's `px-*`: the components pass the recipe through `cn` (tailwind-merge), which keeps the later class, so `iconOnly` stays after `size`.
    iconOnly: { true: "aspect-square px-0" },
  },
  compoundVariants: buttonIntents.flatMap((intent) => {
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
    color: buttonIntents[0],
    size: "md",
  },
} satisfies RecipeTables;

export const buttonRecipe = recipeFromTables(buttonTables);
