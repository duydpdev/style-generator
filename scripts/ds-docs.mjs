/**
 * Shared design-system data for `build-ds.mjs` and `check-design-canvas.mjs`, and the pure helpers that write
 * the design system's README and cover and check the producer's own output. No file I/O.
 */
import { toKebabCase } from "../dist/cva.js";

/** @typedef {import("./ds-tokens.mjs").ThemeInput} ThemeInput */

/** Header order = the page's component order; the bindings mirror examples/harness/src/ui.ts. */
export const COMPONENTS = [
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

/**
 * A Markdown table cell: `|` escaped, an empty value shown as `—`.
 * @param {unknown} value - The cell value
 * @returns {string} The cell text
 */
const cell = (value) =>
  value === undefined || value === null || value === ""
    ? "—"
    : String(value).replaceAll("|", "\\|");

/**
 * A Markdown table.
 * @param {string[]} head - Column titles
 * @param {unknown[][]} rows - Cell values
 * @returns {string[]} The table lines
 */
const table = (head, rows) => [
  `| ${head.join(" | ")} |`,
  `| ${head.map(() => "---").join(" | ")} |`,
  ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
];

/**
 * Every `themeAxes` variant with its colour overrides, in declaration order.
 * @param {ThemeInput} theme - The theme
 * @returns {{ name: string, colors: Record<string, string> }[]} The variants
 */
const colourVariants = (theme) =>
  Object.values(theme.themeAxes ?? {}).flatMap((axis) =>
    Object.entries(axis).map(([name, override]) => ({
      name,
      colors: override.colors ?? {},
    })),
  );

/**
 * The `## Colours` lines: literal primitives, then the semantic aliases per theme variant.
 * @param {ThemeInput} theme - The theme
 * @returns {string[]} The section body
 */
function colourLines(theme) {
  const entries = Object.entries(theme.colors);
  const isAlias = (/** @type {string} */ value) => value.startsWith("$");
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
          v,
          ...variants.map((variant) => variant.colors[k]),
        ]),
    ),
  ];
}

/**
 * The `## Components` lines: one `jsx` example per component, read from `window.<namespace>`.
 * @param {string} namespace - The bundle's global name
 * @param {string | undefined} firstType - The first typography key, if any
 * @param {string | undefined} intent - The Button preset's first intent
 * @returns {string[]} The section body
 */
function componentLines(namespace, firstType, intent) {
  const typeProp = firstType ? ` type="${firstType}"` : "";
  /** @type {(name: string) => string} */
  const example = (name) => {
    if (name === "Button")
      return `<Button color="${intent ?? ""}" variant="fill">Save</Button>`;
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

/**
 * The design system's README: a title, the provenance line, then `README_SECTIONS` in order.
 * @param {object} input - The README's inputs
 * @param {string} input.name - The design system's title
 * @param {string} input.themeFile - The theme's file name
 * @param {ThemeInput} input.theme - The theme
 * @param {string} input.namespace - The bundle's global name
 * @param {readonly string[]} input.intents - The Button preset's intents
 * @returns {string} The README
 */
export function buildReadme({ name, themeFile, theme, namespace, intents }) {
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
 * @param {string} template - `scripts/ds-cover.html.tmpl`
 * @returns {string[]} The keys
 */
const coverColourKeys = (template) => [
  ...new Set(
    [...template.matchAll(/\{\{v:(\w+)\}\}/g)].map(([, key]) => key ?? ""),
  ),
];

/**
 * The producer's input requirements, checked before the build: at least one typography key (the cover title and
 * the Text component read one) and every colour the cover reads. `borderRadius` is optional.
 * @param {object} input - The inputs
 * @param {ThemeInput} input.theme - The theme, already accepted by `generate()`
 * @param {string} input.coverTemplate - `scripts/ds-cover.html.tmpl`
 * @returns {string[]} One failure per missing input; empty when the theme can build a design system
 */
export function dsInputFailures({ theme, coverTemplate }) {
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
  return [...typography, ...colours];
}

/**
 * `&`, `<`, `>` and `"` as HTML entities.
 * @param {string} text - Plain text
 * @returns {string} The escaped text
 */
const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * The cover: `{{name}}` (HTML-escaped), `{{namespace}}`, `{{titleClass}}` and `{{v:<key>}}` filled in one pass.
 * `{{v:<key>}}` is the bundle.css variable of colour `<key>` (`--sg-color-<kebab>`); a key the theme lacks and any
 * unknown placeholder stay as they are, so `verifyDsOutput` reports them.
 * @param {string} template - `scripts/ds-cover.html.tmpl`
 * @param {object} input - The values
 * @param {string} input.name - The design system's title
 * @param {string} input.namespace - The bundle's global name
 * @param {ThemeInput} input.theme - The theme
 * @param {string} input.titleClass - The typography class of the title
 * @returns {string} The rendered cover
 */
export function renderCover(template, { name, namespace, theme, titleClass }) {
  /** @type {Record<string, string>} */
  const values = { name: escapeHtml(name), namespace, titleClass };
  for (const [, key] of template.matchAll(/\{\{v:(\w+)\}\}/g))
    if (key !== undefined && Object.hasOwn(theme.colors, key))
      values[`v:${key}`] = `--sg-color-${toKebabCase(key)}`;
  return template.replace(
    /\{\{([\w:]+)\}\}/g,
    (whole, /** @type {string} */ key) =>
      Object.hasOwn(values, key) ? (values[key] ?? whole) : whole,
  );
}

const TABLE_RULE = /^\|(?:\s*-+\s*\|)+$/;

/**
 * Whether a section line carries content: not blank, not a heading, not a table's rule or header row.
 * @param {string} line - The line
 * @param {string | undefined} next - The line after it
 * @returns {boolean} True for a content line
 */
const isContent = (line, next) =>
  line.trim() !== "" &&
  !line.startsWith("#") &&
  !TABLE_RULE.test(line) &&
  !TABLE_RULE.test(next ?? "");

/**
 * The README problems: a section of `README_SECTIONS` missing, or with no content line before the next `## `
 * (headings and table header rows alone do not count, so a table without rows is empty).
 * @param {string} readme - The README
 * @returns {string[]} One failure per problem
 */
function readmeFailures(readme) {
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

/**
 * The title-class problem: no class (a theme without typography), or a class bundle.css does not define.
 * @param {string} titleClass - The cover title's typography class
 * @param {string} bundleCss - The compiled `components/bundle.css`
 * @returns {string[]} At most one failure
 */
function titleClassFailures(titleClass, bundleCss) {
  if (titleClass === "")
    return ["theme has no typography key for the cover title"];
  const escaped = titleClass.replaceAll(/[^\w-]/g, "\\$&");
  return new RegExp(`\\.${escaped}(?![\\w-])`).test(bundleCss)
    ? []
    : [`cover title class .${titleClass} is not in bundle.css`];
}

/**
 * The producer's own output gate: README sections, cover variables, the title's class, no unfilled cover placeholder.
 * @param {object} output - The files to check
 * @param {string} output.readme - The README
 * @param {string} output.cover - The rendered cover
 * @param {ReadonlySet<string>} output.coverVars - The custom properties the cover may read
 * @param {string} output.titleClass - The cover title's typography class
 * @param {string} output.bundleCss - The compiled `components/bundle.css`
 * @returns {string[]} One failure per problem; empty when the output is consistent
 */
export function verifyDsOutput({
  readme,
  cover,
  coverVars,
  titleClass,
  bundleCss,
}) {
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
  ];
}
