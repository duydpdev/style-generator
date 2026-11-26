// Builds the files of a claude.ai Design System artifact from a theme, its config and a component preset:
// tokens.json, components/bundle.js, components/bundle.css, components/index.d.ts, components/Cover/preview.html,
// README.md, ds-stamp.json. The Design System type generates tokens.css, api/*.md and manifest.json itself.
//
// usage: node scripts/build-ds.mjs --theme <file> --config <file> --preset <file> --namespace <Name> --out <dir> [--name <title>]
//
// The bundle is built from this checkout (`dist/` + examples/harness/src/ui), so `gitSha`/`srcDirty` in
// ds-stamp.json identify it. A theme without typography, without a colour the cover reads, or without a key the
// Button preset reads (`controlHeight`, `<intent>Subtle*`) is refused before the build (`dsInputFailures`;
// `borderRadius` is optional). Every file is computed in memory and written last: a
// bundle that throws when a component renders writes nothing, and so does output that fails `verifyDsOutput`
// (README sections, cover variables and title class, no unfilled cover placeholder).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import vm from "node:vm";

import { compile } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { build } from "vite";

import { toKebabCase } from "../dist/cva.js";
import { generate } from "../dist/index.js";

import {
  COMPONENTS,
  buildReadme,
  dsInputFailures,
  renderCover,
  verifyDsOutput,
} from "./ds-docs.mjs";
import { themeToDsTokens } from "./ds-tokens.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const UI_DIR = join(ROOT, "examples/harness/src/ui");
/** Header format of the Design System type's bundle (`@ds-bundle`, reference/format.md). */
const BUNDLE_FORMAT = 4;
/** Files whose change makes the bundle differ from the commit `gitSha` names. */
const STAMP_PATHS = [
  "src/",
  "examples/harness/src/ui",
  "examples/design-system/src/recipes",
  "scripts/build-ds.mjs",
  "scripts/ds-tokens.mjs",
  "scripts/ds-index.d.ts.tmpl",
  "scripts/ds-docs.mjs",
  "scripts/ds-cover.html.tmpl",
];
/** Keys of style-gen.config.json that are not `generate()` options. */
const CONFIG_ONLY_KEYS = new Set([
  "$schema",
  "theme",
  "output",
  "tokensOutput",
]);
const USAGE =
  "usage: node scripts/build-ds.mjs --theme <file> --config <file> --preset <file> --namespace <Name> --out <dir> [--name <title>]";

/**
 * @param {string} path - A JSON file
 * @returns {Record<string, unknown>} Its parsed content
 */
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** @typedef {{ type: string, code: string, moduleIds: string[] }} OutputChunk */

/**
 * @param {unknown} result - Vite's `build()` result with `write: false`
 * @returns {OutputChunk} The first chunk of the output
 */
function firstChunk(result) {
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    (r) => /** @type {{ output?: OutputChunk[] }} */ (r).output ?? [],
  );
  const chunk = outputs.find((o) => o.type === "chunk");
  if (!chunk) throw new Error("vite produced no chunk");
  return chunk;
}

/**
 * The preset file imports without extensions, so Node cannot load it directly: bundle it, then import the chunk.
 * Throws when the module lacks one of the presets the components bind.
 * @param {string} file - The preset module
 * @returns {Promise<Presets & Record<string, unknown>>} The preset module's exports
 */
async function loadPreset(file) {
  const chunk = firstChunk(
    await build({
      configFile: false,
      logLevel: "silent",
      publicDir: false,
      build: {
        write: false,
        minify: false,
        lib: { entry: file, formats: ["es"], fileName: "preset" },
      },
    }),
  );
  /** @type {Presets & Record<string, unknown>} */
  const presets = await import(
    `data:text/javascript;base64,${Buffer.from(chunk.code).toString("base64")}`
  );
  for (const name of ["boxPreset", "buttonPreset", "textPreset"])
    if (!presets[name]) throw new Error(`${file} does not export ${name}`);
  return presets;
}

/**
 * The IIFE bundle of the six components bound to `tokens`, and the ids of the modules it contains.
 * @param {object} tokens - `generate().tokens.Web`
 * @param {string} presetFile - The preset module
 * @param {string} namespace - The bundle's global name
 * @returns {Promise<{ code: string, sources: string[] }>} The bundle and the source files it was built from
 */
async function buildBundle(tokens, presetFile, namespace) {
  const tmp = mkdtempSync(join(tmpdir(), "build-ds-"));
  try {
    // The canvas page has a global React without `jsx`/`jsxs`: route the automatic JSX runtime to createElement.
    const shim = join(tmp, "jsx-runtime.js");
    writeFileSync(
      shim,
      `import { createElement, Fragment } from "react";
export const jsx = (type, props, key) => createElement(type, key === undefined ? props : { ...props, key });
export { jsx as jsxs, Fragment };
`,
    );
    const entry = join(tmp, "entry.js");
    const presets = COMPONENTS.flatMap((c) => (c.preset ? [c.preset] : []));
    writeFileSync(
      entry,
      [
        ...COMPONENTS.map((c) => {
          const file = JSON.stringify(join(UI_DIR, c.name + ".tsx"));
          return `import { create${c.name} } from ${file};`;
        }),
        `import { ${presets.join(", ")} } from ${JSON.stringify(presetFile)};`,
        `const tokens = ${JSON.stringify(tokens)};`,
        ...COMPONENTS.map((c) => {
          const args = c.preset ? "tokens, " + c.preset : "tokens";
          return `export const ${c.name} = create${c.name}(${args});`;
        }),
      ].join("\n"),
    );
    const chunk = firstChunk(
      await build({
        configFile: false,
        logLevel: "silent",
        publicDir: false,
        resolve: {
          alias: [{ find: /^react\/jsx-runtime$/, replacement: shim }],
        },
        // The bundle must not depend on NODE_ENV: development JSX imports react/jsx-dev-runtime, which bypasses the shim.
        oxc: { jsx: { development: false } },
        build: {
          write: false,
          minify: false,
          lib: {
            entry,
            formats: ["iife"],
            name: namespace,
            fileName: () => "bundle.js",
          },
          rollupOptions: {
            external: ["react", "react-dom"],
            // No per-module path comments: they would carry the mkdtemp path and differ on every run.
            experimental: { attachDebugInfo: "none" },
            output: { globals: { react: "React", "react-dom": "ReactDOM" } },
          },
        },
      }),
    );
    const header = `/* @ds-bundle: ${JSON.stringify({
      format: BUNDLE_FORMAT,
      namespace,
      components: COMPONENTS.map((c) => ({ name: c.name })),
    })} */`;
    const code = `${header}\n${chunk.code.trimEnd()}\nwindow.${namespace} = ${namespace};\n`;
    const dependencyDir = `${sep}${"node_modules"}${sep}`;
    const sources = chunk.moduleIds.filter(
      (id) =>
        !id.startsWith("\0") &&
        !id.includes("?") &&
        !id.includes(dependencyDir) &&
        !id.startsWith(tmp),
    );
    return { code, sources };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Runs the bundle against a fake React and renders every Button intent × fill|outline and a Text.
 * @param {string} code - The bundle
 * @param {string} namespace - The bundle's global name
 * @param {readonly string[]} intents - The Button preset's intents
 */
function selfCheck(code, namespace, intents) {
  /** @type {Record<string, unknown> & { window?: unknown }} */
  const ctx = {
    React: {
      createElement: (
        /** @type {unknown} */ type,
        /** @type {unknown} */ props,
      ) => ({ type, props }),
      Fragment: "fragment",
      isValidElement: () => false,
    },
    ReactDOM: {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  // eslint-disable-next-line sonarjs/code-eval -- runs the design-system bundle this script just built, never external input
  vm.runInContext(code, ctx);
  const lib =
    /** @type {Record<string, (props: object) => unknown> | undefined} */ (
      ctx[namespace]
    );
  const keys = Object.keys(lib ?? {}).sort();
  const expected = COMPONENTS.map((c) => c.name).sort();
  if (
    keys.join() !== expected.join() ||
    !lib ||
    keys.some((k) => typeof lib[k] !== "function")
  )
    throw new Error(
      `window.${namespace} has [${keys.join(", ")}], expected six functions [${expected.join(", ")}]`,
    );
  for (const color of intents)
    for (const variant of ["solid", "outline"])
      lib.Button({ color, variant, children: "x" });
  lib.Text({ children: "x" });
}

/**
 * Gives every `html[data-<axis>="<variant>"]` block a second, unscoped selector, so a `data-*` attribute on any
 * wrapper switches the theme on a canvas, and re-declares there each `:root` alias the variant does not override
 * (an alias computed at `:root` would keep the light value inside the wrapper). The `html`-only CSS the library
 * emits for apps is unchanged; this copy is for the design-system bundle only.
 * @param {string} css - `generate().css`
 * @returns {string} The CSS with wrapper selectors and re-declared aliases
 */
export function withWrapperSelectors(css) {
  const rootBlocks = [...css.matchAll(/(?<=^|\})\s*:root\s*\{([^{}]*)\}/g)];
  if (rootBlocks.length !== 1)
    throw new Error(
      `expected one :root block, found ${String(rootBlocks.length)}`,
    );
  const aliases = [
    ...rootBlocks[0][1].matchAll(
      /(--sg-[\w-]+)\s*:\s*(var\(--sg-[\w-]+\))\s*;/g,
    ),
  ];
  return css.replace(
    /html(\[data-[\w-]+="[^"]*"\])\s*\{([^{}]*)\}/g,
    (_whole, attr, body) => {
      const missing = aliases.filter(
        ([, name]) => !new RegExp(`${name}\\s*:`).test(body),
      );
      const redeclared = missing
        .map(([, name, value]) => `  ${name}: ${value};\n`)
        .join("");
      return `html${attr}, ${attr} {${body.trimEnd()}\n${redeclared}}`;
    },
  );
}

/**
 * The bundle's stylesheet: Tailwind over the theme CSS, the bundle's sources and the forced classes.
 * @param {string} css - `generate().css`
 * @param {string[]} sources - Files Tailwind scans for class candidates
 * @param {string[]} forced - Classes to build even if no source names them
 * @returns {Promise<string>} The compiled CSS
 */
async function buildCss(css, sources, forced) {
  const input = `@import "tailwindcss";\n${withWrapperSelectors(css)}\n@source inline("${forced.join(" ")}");\n`;
  const compiler = await compile(input, {
    base: ROOT,
    onDependency: () => undefined,
  });
  const scanner = new Scanner({
    sources: sources.map((file) => ({
      base: dirname(file),
      pattern: basename(file),
      negated: false,
    })),
  });
  return compiler.build(scanner.scan());
}

/**
 * @param {readonly string[]} keys - Token keys
 * @returns {string} A TypeScript union of the keys, or `never`
 */
const union = (keys) =>
  keys.length > 0 ? keys.map((k) => JSON.stringify(k)).join(" | ") : "never";

/** @typedef {{ textPreset: { defaultType: string, defaultColor: string }, buttonPreset: { intents: string[], height: Record<string, string> } }} Presets */

/**
 * The components' `index.d.ts`: the template filled with this theme's keys and the presets' defaults.
 * @param {Record<string, Record<string, unknown> | undefined>} theme - The theme
 * @param {{ opacities?: ReadonlyArray<number>, breakpoints: ReadonlyArray<string> }} tokens - `generate().tokens.Web`
 * @param {Presets} presets - The preset module's exports
 * @param {string} namespace - The bundle's global name
 * @param {string} themeFile - The theme's file name
 * @returns {string} The declaration file
 */
function indexDts(theme, tokens, presets, namespace, themeFile) {
  const keys = (/** @type {string} */ category) =>
    Object.keys(theme[category] ?? {});
  const steps = tokens.opacities ?? [];
  /** @type {Record<string, string>} */
  const fill = {
    namespace,
    themeFile: `\`${themeFile}\``,
    ColorToken: union(keys("colors")),
    ColorValue:
      steps.length > 0
        ? `ColorToken | \`\${ColorToken}/\${${steps.join(" | ")}}\``
        : "ColorToken",
    TypographyToken: union(keys("typography")),
    RadiusToken: union(keys("borderRadius")),
    ShadowToken: union(keys("shadows")),
    BlurToken: union(keys("backdropBlurs")),
    BorderWidthToken: union(keys("borderWidth")),
    Breakpoint: union(tokens.breakpoints),
    SpacingBreakpoints: ["base", ...tokens.breakpoints]
      .map((b) => `${b}?: number;`)
      .join(" "),
    defaultType: presets.textPreset.defaultType,
    defaultColor: presets.textPreset.defaultColor,
    defaultIntent: presets.buttonPreset.intents[0],
    Intent: union(presets.buttonPreset.intents),
  };
  const template = readFileSync(
    join(ROOT, "scripts/ds-index.d.ts.tmpl"),
    "utf8",
  );
  const out = template.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    if (!(key in fill) || fill[key] === undefined)
      throw new Error(`index.d.ts template: no value for {{${key}}}`);
    return fill[key];
  });
  return out;
}

/**
 * Warns once per color the Design System page drops (it reads hex, plain color functions and `{alias}` only).
 * @param {Record<string, unknown>} dsTokens - The tokens.json object
 */
function warnDroppedColors(dsTokens) {
  const color =
    /** @type {{ tokens: { name: string, value: Record<string, unknown> }[] }} */ (
      dsTokens.color
    );
  for (const token of color.tokens) {
    const dropped = Object.entries(token.value).filter(([, value]) =>
      /var\(|color-mix\(|url\(/.test(String(value)),
    );
    if (dropped.length > 0)
      console.warn(
        `warning: color ${token.name} is ${String(dropped[0][1])} in ${dropped.map(([id]) => id).join(", ")}; the Design System page drops it`,
      );
  }
}

/**
 * The cover title's class: the first typography key of size ≥ 32px, else the largest one.
 * @param {Record<string, { fontSize: string }>} typography - The theme's typography
 * @returns {string} The kebab-cased class, or "" for a theme without typography
 */
function coverTitleClass(typography) {
  const px = (/** @type {string} */ size) =>
    size.endsWith("rem")
      ? Number.parseFloat(size) * 16
      : Number.parseFloat(size);
  const entries = Object.entries(typography);
  const large = entries.find(([, t]) => px(t.fontSize) >= 32);
  const largest = entries.reduce(
    (/** @type {[string, { fontSize: string }] | undefined} */ best, e) =>
      best && px(best[1].fontSize) >= px(e[1].fontSize) ? best : e,
    undefined,
  );
  const key = (large ?? largest)?.[0];
  return key ? toKebabCase(key) : "";
}

/**
 * The README and the cover, and the failures of the producer's output gate.
 * @param {object} input - The inputs
 * @param {string} input.name - The design system's title
 * @param {string} input.themeFile - The theme's file name
 * @param {import("./ds-tokens.mjs").ThemeInput} input.theme - The theme
 * @param {string} input.namespace - The bundle's global name
 * @param {readonly string[]} input.intents - The Button preset's intents
 * @param {string} input.themeCss - `generate().css`, which declares the `--sg-*` variables the cover may read
 * @param {string} input.bundleCss - The compiled `components/bundle.css`
 * @param {string} input.coverTemplate - `scripts/ds-cover.html.tmpl`
 * @returns {{ readme: string, cover: string, failures: string[] }} The two files and the gate's failures
 */
function buildDocs({
  name,
  themeFile,
  theme,
  namespace,
  intents,
  themeCss,
  bundleCss,
  coverTemplate,
}) {
  const readme = buildReadme({ name, themeFile, theme, namespace, intents });
  const titleClass = coverTitleClass(theme.typography ?? {});
  const cover = renderCover(coverTemplate, {
    name,
    namespace,
    theme,
    titleClass,
  });
  const coverVars = new Set(
    [...themeCss.matchAll(/(--sg-[a-z0-9-]+)\s*:/g)].map((m) => m[1] ?? ""),
  );
  const failures = verifyDsOutput({
    readme,
    cover,
    coverVars,
    titleClass,
    bundleCss,
  });
  return { readme, cover, failures };
}

/**
 * Reads the cover template and checks the theme against the producer's input requirements.
 * @param {import("./ds-tokens.mjs").ThemeInput} theme - The theme, already accepted by `generate()`
 * @param {Presets["buttonPreset"]} buttonPreset - The preset module's `buttonPreset`
 * @returns {{ coverTemplate: string, failures: string[] }} The template and one failure per missing input
 */
function checkInputs(theme, buttonPreset) {
  const coverTemplate = readFileSync(
    join(ROOT, "scripts/ds-cover.html.tmpl"),
    "utf8",
  );
  return {
    coverTemplate,
    failures: dsInputFailures({ theme, coverTemplate, buttonPreset }),
  };
}

/**
 * Parses the flags, builds every file in memory, self-checks the bundle, then writes the files.
 * @returns {Promise<number>} The exit code: 0 written, 1 failed, 2 usage
 */
async function main() {
  /** @type {Record<string, string | undefined>} */
  let flags;
  try {
    ({ values: flags } = parseArgs({
      options: {
        theme: { type: "string" },
        config: { type: "string" },
        preset: { type: "string" },
        namespace: { type: "string" },
        out: { type: "string" },
        name: { type: "string" },
      },
      strict: true,
    }));
  } catch (error) {
    console.error(
      `${error instanceof Error ? error.message : String(error)}\n${USAGE}`,
    );
    return 2;
  }
  const missing = ["theme", "config", "preset", "namespace", "out"].filter(
    (f) => !flags[f],
  );
  if (missing.length > 0) {
    console.error(`missing --${missing.join(", --")}\n${USAGE}`);
    return 2;
  }
  const namespace = String(flags.namespace);
  if (!/^[A-Za-z_$][\w$]*$/.test(namespace)) {
    console.error(
      `--namespace must be a JavaScript identifier, got "${namespace}"\n${USAGE}`,
    );
    return 2;
  }
  const themePath = resolve(String(flags.theme));
  const configPath = resolve(String(flags.config));
  const presetPath = resolve(String(flags.preset));
  const outDir = resolve(String(flags.out));

  const themeBytes = readFileSync(themePath);
  const theme = JSON.parse(themeBytes.toString("utf8"));
  const configFile = readJson(configPath);
  const config = /** @type {Record<string, unknown>} */ (
    basename(configPath) === "package.json"
      ? (configFile["style-gen"] ?? {})
      : configFile
  );
  const options = Object.fromEntries(
    Object.entries(config).filter(([key]) => !CONFIG_ONLY_KEYS.has(key)),
  );
  // generate() validates the options with its strict schema; an unknown key throws there.
  const generated = generate(theme, /** @type {never} */ (options));
  const tokens = generated.tokens.Web;
  const presets = await loadPreset(presetPath);
  const { coverTemplate, failures: inputFailures } = checkInputs(
    theme,
    presets.buttonPreset,
  );
  if (inputFailures.length > 0) {
    console.error(inputFailures.join("\n"));
    return 1;
  }

  const usageFile = join(dirname(presetPath), "ds.usage.json");
  const { usage, spacing } =
    /** @type {{ usage?: Record<string, string>, spacing?: { name: string, value: string, usage?: string }[] }} */ (
      existsSync(usageFile) ? readJson(usageFile) : {}
    );
  const screens = Object.fromEntries(
    tokens.breakpoints.map((/** @type {string} */ b) => [b, tokens.screens[b]]),
  );
  const dsTokens = themeToDsTokens(theme, {
    name: flags.name ?? namespace,
    usage,
    spacing,
    opacities: tokens.opacities,
    screens,
  });
  warnDroppedColors(dsTokens);

  const bundle = await buildBundle(tokens, presetPath, namespace);
  try {
    selfCheck(bundle.code, namespace, presets.buttonPreset.intents);
  } catch (error) {
    console.error(
      `bundle self-check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
  const forced = Object.keys(theme.typography ?? {}).map((k) => toKebabCase(k));
  const css = await buildCss(generated.css, bundle.sources, forced);

  const git = (/** @type {string[]} */ ...args) =>
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- git is resolved from the developer's PATH; this script never runs on untrusted input
    execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  const stamp = {
    libVersion: String(readJson(join(ROOT, "package.json")).version),
    gitSha: git("rev-parse", "HEAD"),
    srcDirty: git("status", "--porcelain", "--", ...STAMP_PATHS) !== "",
    themeSha256: createHash("sha256").update(themeBytes).digest("hex"),
    namespace,
  };
  const { readme, cover, failures } = buildDocs({
    name: flags.name ?? namespace,
    themeFile: basename(themePath),
    theme,
    namespace,
    intents: presets.buttonPreset.intents,
    themeCss: generated.css,
    bundleCss: css,
    coverTemplate,
  });
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    return 1;
  }

  /** @type {[string, string][]} */
  const files = [
    ["tokens.json", `${JSON.stringify(dsTokens, null, 2)}\n`],
    ["README.md", readme],
    ["ds-stamp.json", `${JSON.stringify(stamp, null, 2)}\n`],
    ["components/bundle.js", bundle.code],
    ["components/bundle.css", css],
    [
      "components/index.d.ts",
      indexDts(theme, tokens, presets, namespace, basename(themePath)),
    ],
    ["components/Cover/preview.html", cover],
  ];
  for (const [path, text] of files) {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), text);
  }
  console.log(`wrote ${String(files.length)} files to ${outDir}`);
  return 0;
}

process.exitCode = await main();
