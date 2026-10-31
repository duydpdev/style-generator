export const INSTALL_CMD = "yarn add @duydpdev/style-generator";

export const STATS = [
  { k: "Subpaths", v: "8", m: "gzip-budgeted · tree-shakeable", accent: true },
  { k: "Spacing utilities", v: "21", m: "from ~4 800 classes" },
  { k: "Tailwind", v: "v4", m: "the only target" },
  { k: "Runtime", v: "Build-time", m: "CSS generated before ship" },
] as const;

export const MARQUEE_TOKENS = [
  "generate",
  "defineTheme",
  "resolveSpacingProps",
  "createVariantMapper",
  "styleGenVite",
  "generateThemeCss",
  "ColorVariant<Theme>",
  "style-gen init",
  "style-gen doctor",
];
