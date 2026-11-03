export const REPO_URL = "https://github.com/duydpdev/style-generator";
export const DOCS_URL = `${REPO_URL}/tree/main/documents`;
export const INSTALL_URL = `${REPO_URL}#install`;
export const INSTALL_COMMAND =
  "yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge";

export interface Feature {
  readonly tag: string;
  readonly title: string;
  readonly body: string;
}

export const FEATURES: readonly Feature[] = [
  {
    tag: "CSS",
    title: "One theme, one CSS file",
    body: "generate() turns theme.json into Tailwind v4 variables, utilities and class coverage.",
  },
  {
    tag: "Types",
    title: "Typed tokens",
    body: "Every color, radius and shadow key becomes a union your props can use.",
  },
  {
    tag: "Theming",
    title: "Light and dark",
    body: "themeAxes overrides switch on with one data attribute on <html>.",
  },
  {
    tag: "Kit",
    title: "Styleless UI kit",
    body: "./ui gives you recipes, cn and prop splitters. You own the components.",
  },
  {
    tag: "Spacing",
    title: "Spacing props",
    body: "p, m and gap props compile to CSS variables, per breakpoint.",
  },
  {
    tag: "CLI",
    title: "CLI and plugins",
    body: "style-gen, styleGenVite and styleGenNext keep the CSS in sync.",
  },
];

export interface Plan {
  readonly name: string;
  readonly price: string;
  readonly summary: string;
  readonly items: readonly string[];
  readonly featured: boolean;
  readonly href: string;
  readonly action: string;
}

export const PLANS: readonly Plan[] = [
  {
    name: "Generator",
    price: "$0",
    summary: "The core package.",
    items: [
      "generate() and the CLI",
      "Vite and Next.js plugins",
      "JSON Schema for theme.json",
    ],
    featured: false,
    href: DOCS_URL,
    action: "Read the guide",
  },
  {
    name: "UI kit",
    price: "$0",
    summary: "Build your own components.",
    items: [
      "./ui recipes and cn",
      "./ui-react Polymorphic type",
      "Ten copy-paste components",
    ],
    featured: true,
    href: `${REPO_URL}/tree/main/examples/plain-react`,
    action: "Copy a component",
  },
  {
    name: "Examples",
    price: "$0",
    summary: "Start from a working app.",
    items: ["React + Vite with Storybook", "Next.js App Router", "Nuxt 4"],
    featured: false,
    href: `${REPO_URL}/tree/main/examples`,
    action: "Browse examples",
  },
];

export const FOOTER_LINKS = [
  { label: "GitHub", href: REPO_URL },
  { label: "Docs", href: DOCS_URL },
  { label: "Changelog", href: `${REPO_URL}/blob/main/CHANGELOG.md` },
] as const;
