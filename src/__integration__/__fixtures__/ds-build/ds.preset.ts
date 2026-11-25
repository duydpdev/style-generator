// Fixture presets for build-ds.test.ts (same shape the producer's --preset reads).
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
  focusRing: {
    primary: "focus-visible:outline-primary",
    danger: "focus-visible:outline-danger",
  },
  tint: {
    primary: {
      outline: "border-primary text-primary hover:bg-primary/10",
      soft: "bg-primary/10 text-primary hover:bg-primary/15",
      ghost: "text-primary hover:bg-primary/10",
      link: "text-primary",
    },
    danger: {
      outline: "border-danger text-danger hover:bg-danger/10",
      soft: "bg-danger/10 text-danger hover:bg-danger/15",
      ghost: "text-danger hover:bg-danger/10",
      link: "text-danger",
    },
  },
} as const;
