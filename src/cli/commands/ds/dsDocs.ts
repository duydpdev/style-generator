/**
 * Shared design-system data for `style-gen ds build` and `style-gen canvas check`, and the pure helpers that
 * write the design system's README and cover and check the producer's own output. No file I/O.
 */
import { toKebabCase } from "../../../shared/helpers";

import type { ThemeInput } from "./dsTokens";

/** Header order = the page's component order; the bindings mirror `examples/harness/src/ui.ts`. */
export const COMPONENTS: readonly { name: string; preset?: string }[] = [
  { name: "Box", preset: "boxPreset" },
  { name: "Text", preset: "textPreset" },
  { name: "Stack" },
  { name: "Flex" },
  { name: "Grid" },
  { name: "Button", preset: "buttonPreset" },
];

/** The README's level-2 sections, in order; `verifyDsOutput` requires each one, non-empty. */
export const README_SECTIONS = [
  "Naming",
  "Colours",
  "Typography",
  "Radius",
  "Components",
];

// A Markdown table cell: `|` escaped, an empty value shown as `—`.
type Cell = string | number | undefined;

const cell = (value: Cell): string =>
  value === undefined || value === ""
    ? "—"
    : String(value).replaceAll("|", "\\|");

const table = (head: string[], rows: Cell[][]): string[] => [
  `| ${head.join(" | ")} |`,
  `| ${head.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
];

// Every `themeAxes` variant with its colour overrides, in declaration order.
const colourVariants = (
  theme: ThemeInput,
): { name: string; colors: Record<string, string> }[] =>
  Object.values(theme.themeAxes ?? {}).flatMap((axis) =>
    Object.entries(axis).map(([name, override]) => ({
      name,
      colors: override.colors ?? {},
    })),
  );

// A colour value for the README: `$navy700/8` reads `$navy700 at 8%`, anything else is kept.
const aliasLabel = (value: string | undefined): string | undefined =>
  value?.replace(/^(\$[A-Za-z\d][A-Za-z\d-]*)\/(\d+)$/, "$1 at $2%");

// The `## Colours` lines: literal primitives, then the semantic aliases per theme variant.
function colourLines(theme: ThemeInput): string[] {
  const entries = Object.entries(theme.colors);
  const isAlias = (value: string): boolean => value.startsWith("$");
  const variants = colourVariants(theme);
  return [
    "### Primitives",
    "",
    ...table(
      ["key", "value"],
      entries.filter(([, v]) => !isAlias(v)).map(([k, v]) => [`\`${k}\``, v]),
    ),
    "",
    "### Semantic",
    "",
    ...table(
      ["key", "base", ...variants.map((v) => v.name)],
      entries
        .filter(([, v]) => isAlias(v))
        .map(([k, v]) => [
          `\`${k}\``,
          aliasLabel(v),
          ...variants.map((variant) => aliasLabel(variant.colors[k])),
        ]),
    ),
  ];
}

// The `## Components` lines: one `jsx` example per component, read from `window.<namespace>`.
function componentLines(
  namespace: string,
  firstType: string | undefined,
  intent: string | undefined,
): string[] {
  const typeProp = firstType ? ` type="${firstType}"` : "";
  const example = (name: string): string => {
    if (name === "Button")
      return `<Button color="${intent ?? ""}" variant="solid">Save</Button>`;
    if (name === "Text") return `<Text${typeProp}>Body copy</Text>`;
    return `<${name}>\n  <Text>One</Text>\n  <Text>Two</Text>\n</${name}>`;
  };
  return COMPONENTS.flatMap(({ name }) => {
    const uses = name === "Button" || name === "Text" ? [name] : [name, "Text"];
    return [
      `### ${name}`,
      "",
      "```jsx",
      `const { ${uses.join(", ")} } = window.${namespace};`,
      example(name),
      "```",
      "",
    ];
  });
}

/** What the README is written from. */
export interface ReadmeInput {
  /** The design system's title. */
  name: string;
  /** The theme's file name. */
  themeFile: string;
  theme: ThemeInput;
  /** The bundle's global name. */
  namespace: string;
  /** The Button preset's intents. */
  intents: readonly string[];
}

/**
 * The design system's README: a title, the provenance line, then `README_SECTIONS` in order.
 * @param {ReadmeInput} input - The README's inputs
 * @returns {string} The README
 */
export function buildReadme({
  name,
  themeFile,
  theme,
  namespace,
  intents,
}: ReadmeInput): string {
  const typography = Object.entries(theme.typography ?? {});
  const radius = Object.entries(theme.borderRadius ?? {});
  return [
    `# ${name}`,
    "",
    `Built from \`${themeFile}\` by the style-generator design-system producer; do not edit token values here.`,
    "",
    "## Naming",
    "",
    "- Primitive colours are named after their value: `<hue><100..900>`, with an optional `Alpha<pct>` suffix.",
    "- Semantic colour keys name a role and alias a primitive (`$<primitive>`).",
    "- Typography keys are `text<size><Weight>`; a font family is a separate `font-<family>` class.",
    "",
    'Full convention: style-generator documents/agent-contract.md → "Naming convention".',
    "",
    "## Colours",
    "",
    ...colourLines(theme),
    "",
    "## Typography",
    "",
    ...table(
      ["key", "size", "line height", "weight", "family"],
      typography.map(([k, t]) => [
        `\`${k}\``,
        t.fontSize,
        t.lineHeight,
        t.fontWeight,
        t.fontFamily,
      ]),
    ),
    "",
    "## Radius",
    "",
    ...(radius.length === 0
      ? ["This theme defines no `borderRadius` keys."]
      : table(
          ["key", "value"],
          radius.map(([k, v]) => [`\`${k}\``, v]),
        )),
    "",
    "## Components",
    "",
    ...componentLines(namespace, typography[0]?.[0], intents[0]),
  ].join("\n");
}

/**
 * The colour keys the cover reads: every `{{v:<key>}}` placeholder of the template, in order, without repeats.
 * @param {string} template - The cover template
 * @returns {string[]} The keys
 */
export const coverColourKeys = (template: string): string[] => [
  ...new Set(
    [...template.matchAll(/\{\{v:(\w+)\}\}/g)].map(([, key]) => key ?? ""),
  ),
];

/** The parts of a Button preset the input check reads. */
export interface ButtonPresetInput {
  intents: readonly string[];
  height?: Record<string, string> | undefined;
}

/**
 * The theme keys the build reads (typography, the cover's colours, the Button preset's), checked before the build.
 * @param {object} input - The inputs
 * @param {ThemeInput} input.theme - The theme, already accepted by `generate()`
 * @param {string} input.coverTemplate - The cover template
 * @param {ButtonPresetInput} input.buttonPreset - The preset module's `buttonPreset`
 * @returns {string[]} One failure per missing input; empty when the theme can build a design system
 */
export function dsInputFailures({
  theme,
  coverTemplate,
  buttonPreset,
}: {
  theme: ThemeInput;
  coverTemplate: string;
  buttonPreset: ButtonPresetInput;
}): string[] {
  const keys = coverColourKeys(coverTemplate);
  const typography =
    Object.keys(theme.typography ?? {}).length === 0
      ? [
          "theme has no typography: a design system needs at least one typography key (the cover title and the Text component use one)",
        ]
      : [];
  const colours = keys
    .filter((key) => !Object.hasOwn(theme.colors, key))
    .map(
      (key) =>
        `theme has no colour key "${key}": the cover reads ${keys.join(", ")}`,
    );
  const heights = buttonPreset.height
    ? Object.entries(buttonPreset.height)
        .filter(([, key]) => !Object.hasOwn(theme.controlHeight ?? {}, key))
        .map(
          ([size, key]) =>
            `theme has no controlHeight key "${key}": the Button preset's size ${size} reads it`,
        )
    : [
        "button preset has no height map: it needs one controlHeight key per size (height: { sm, md, lg })",
      ];
  const subtle = buttonPreset.intents
    .flatMap((intent) => [`${intent}Subtle`, `${intent}SubtleForeground`])
    .filter((key) => !Object.hasOwn(theme.colors, key))
    .map(
      (key) =>
        `theme has no colour key "${key}": the Button's soft variant reads <intent>Subtle and <intent>SubtleForeground; outline and ghost hover on <intent>Subtle`,
    );
  return [...typography, ...colours, ...heights, ...subtle];
}

// `&`, `<`, `>` and `"` as HTML entities.
const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** What the cover is filled with. */
export interface CoverInput {
  /** The design system's title. */
  name: string;
  /** The bundle's global name. */
  namespace: string;
  theme: ThemeInput;
  /** The typography class of the title. */
  titleClass: string;
}

/**
 * The cover: `{{name}}` (HTML-escaped), `{{namespace}}`, `{{titleClass}}` and `{{v:<key>}}` (the `--sg-color-<kebab>`
 * variable of colour `<key>`) filled in one pass; an unknown placeholder stays, so `verifyDsOutput` reports it.
 * @param {string} template - The cover template
 * @param {CoverInput} input - The values
 * @returns {string} The rendered cover
 */
export function renderCover(
  template: string,
  { name, namespace, theme, titleClass }: CoverInput,
): string {
  const values: Record<string, string> = {
    name: escapeHtml(name),
    namespace,
    titleClass,
  };
  for (const [, key] of template.matchAll(/\{\{v:(\w+)\}\}/g))
    if (key !== undefined && Object.hasOwn(theme.colors, key))
      values[`v:${key}`] = `--sg-color-${toKebabCase(key)}`;
  return template.replaceAll(/\{\{([\w:]+)\}\}/g, (whole, key: string) =>
    Object.hasOwn(values, key) ? (values[key] ?? whole) : whole,
  );
}

const TABLE_RULE = /^\|(?:\s*-+\s*\|)+$/;

// Whether a section line carries content: not blank, not a heading, not a table's rule or header row.
const isContent = (line: string, next: string | undefined): boolean =>
  line.trim() !== "" &&
  !line.startsWith("#") &&
  !TABLE_RULE.test(line) &&
  !TABLE_RULE.test(next ?? "");

// A section of `README_SECTIONS` missing, or with no content line before the next `## `.
function readmeFailures(readme: string): string[] {
  const lines = readme.split("\n");
  return README_SECTIONS.flatMap((section) => {
    const start = lines.indexOf(`## ${section}`);
    if (start === -1) return [`README misses section ## ${section}`];
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.startsWith("## "));
    const body = end === -1 ? rest : rest.slice(0, end);
    return body.some((line, i) => isContent(line, body[i + 1]))
      ? []
      : [`README section ## ${section} is empty`];
  });
}

// No class (a theme without typography), or a class bundle.css does not define.
function titleClassFailures(titleClass: string, bundleCss: string): string[] {
  if (titleClass === "")
    return ["theme has no typography key for the cover title"];
  const escaped = titleClass.replaceAll(/[^\w-]/g, String.raw`\$&`);
  return new RegExp(String.raw`\.${escaped}(?![\w-])`).test(bundleCss)
    ? []
    : [`cover title class .${titleClass} is not in bundle.css`];
}

/** The files `verifyDsOutput` checks. */
export interface DsOutput {
  readme: string;
  /** The rendered cover. */
  cover: string;
  /** The custom properties the cover may read. */
  coverVars: ReadonlySet<string>;
  /** The cover title's typography class. */
  titleClass: string;
  /** The compiled `components/bundle.css`. */
  bundleCss: string;
  /** Classes the components render that no rule of `bundleCss` selects. */
  unstyledClasses?: readonly string[];
}

/**
 * The producer's own output gate: README sections, cover variables, the title's class, no unfilled cover placeholder.
 * @param {DsOutput} output - The files to check
 * @returns {string[]} One failure per problem; empty when the output is consistent
 */
export function verifyDsOutput({
  readme,
  cover,
  coverVars,
  titleClass,
  bundleCss,
  unstyledClasses = [],
}: DsOutput): string[] {
  const placeholders = [...cover.matchAll(/\{\{[\w:]*\}\}/g)].map(
    ([whole]) => `cover keeps placeholder ${whole}`,
  );
  const vars = new Set(
    [...cover.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1] ?? ""),
  );
  const unknownVars = [...vars]
    .filter((v) => !coverVars.has(v))
    .map((v) => `cover reads var(${v}), which the theme does not produce`);
  return [
    ...placeholders,
    ...readmeFailures(readme),
    ...unknownVars,
    ...titleClassFailures(titleClass, bundleCss),
    ...(unstyledClasses.length > 0
      ? [
          `components render classes that bundle.css has no rule for: ${unstyledClasses.join(" ")}`,
        ]
      : []),
  ];
}
