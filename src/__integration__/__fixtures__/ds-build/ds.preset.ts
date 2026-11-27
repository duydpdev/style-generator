// Fixture presets for the ds build tests (same shape `style-gen ds build --preset` reads: `examples/design-system/src/recipes/button.ts`).
export const boxPreset = { base: "relative" } as const;

export const textPreset = {
  base: "wrap-anywhere whitespace-pre-wrap",
  defaultType: "text16Regular",
  defaultColor: "foreground",
} as const;

export const buttonPreset = {
  intents: ["primary", "danger"],
  background: "surface",
  radius: "md",
  type: "text16Regular",
  typeLg: "text20Semibold",
  height: { sm: "sm", md: "md", lg: "lg" },
  focusRing: "focus-visible:outline-focus",
  disabled: "disabled:opacity-disabled",
  hoverTint: {
    primary: "hover:bg-primary-subtle",
    danger: "hover:bg-danger-subtle",
  },
} as const;
