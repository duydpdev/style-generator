import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../../node/errorMessage";
import { generate } from "../../../core/generate";
import type { ThemeConfig } from "../../../core/themeSchema";
import { toKebabCase } from "../../../shared/helpers";
import { logger } from "../../logger";
import { readCliVersion } from "../../version";
import { loadGeneratorOptions } from "../canvas/boardInputs";
import { createRuleCompiler, selectedClasses } from "../canvas/compileCss";
import { mergeDescriptions } from "../canvas/descriptions";
import {
  CanvasInputError,
  parseJson,
  readInput,
  readJson,
} from "../canvas/scan";
import { packagedStandard } from "../canvas/standardSchema";
import { roleOf } from "../canvas/themeRules";

import { assembleBundle, withWrapperSelectors } from "./bundle";
import {
  buildReadme,
  dsInputFailures,
  renderCover,
  verifyDsOutput,
} from "./dsDocs";
import { themeToDsTokens, type DsSpacing, type ThemeInput } from "./dsTokens";
import { indexDts } from "./indexDts";
import { DsInputError, loadPreset, type Presets } from "./loadPreset";
import { renderTrees, renderedClasses } from "./render";
import { makeStamp } from "./stamp";
import { COVER_TEMPLATE } from "./templates";

export const DS_BUILD_USAGE =
  "style-gen ds build --theme <file> --config <file> --preset <file> --namespace <Name> --out <dir> [--name <title>]";

type FlagValues = Record<
  string,
  string | boolean | (string | boolean)[] | undefined
>;

interface DsBuildArgs {
  theme: string;
  config: string;
  preset: string;
  namespace: string;
  out: string;
  name: string;
}

const REQUIRED = ["theme", "config", "preset", "namespace", "out"] as const;

/**
 * @param {FlagValues} values - Parsed flags of `ds build`
 * @returns {DsBuildArgs | string} The arguments, or the usage error
 */
export function parseDsBuildArgs(values: FlagValues): DsBuildArgs | string {
  const str = (key: string): string | undefined =>
    typeof values[key] === "string" && values[key] !== ""
      ? values[key]
      : undefined;
  const missing = REQUIRED.filter((key) => str(key) === undefined);
  if (missing.length > 0) return `missing --${missing.join(", --")}`;
  const namespace = str("namespace") ?? "";
  if (!/^[A-Za-z_$][\w$]*$/.test(namespace))
    return `--namespace must be a JavaScript identifier, got "${namespace}"`;
  return {
    theme: str("theme") ?? "",
    config: str("config") ?? "",
    preset: str("preset") ?? "",
    namespace,
    out: str("out") ?? "",
    name: str("name") ?? namespace,
  };
}

// The directory `scripts/emit-ds-runtime.mjs` filled: next to the CLI bundle, or the checkout's when run from source.
function runtimeDir(): string {
  for (const dir of ["../ds/", "../../../../dist/ds/"]) {
    const url = new URL(`${dir}runtime.js`, import.meta.url);
    if (existsSync(url)) return fileURLToPath(new URL(dir, import.meta.url));
  }
  throw new DsInputError(
    "the precompiled design-system runtime is missing from the installed package",
  );
}

const compareCodeUnits = (a: string, b: string): number =>
  Number(a > b) - Number(a < b);

const px = (size: string): number =>
  size.endsWith("rem") ? Number.parseFloat(size) * 16 : Number.parseFloat(size);

/**
 * The cover title's class: the first typography key of size ≥ 32px, else the largest one.
 * @param {Record<string, { fontSize: string }>} typography - The theme's typography
 * @returns {string} The kebab-cased class, or "" for a theme without typography
 */
export function coverTitleClass(
  typography: Record<string, { fontSize: string }>,
): string {
  const entries = Object.entries(typography);
  const large = entries.find(([, t]) => px(t.fontSize) >= 32);
  const largest = entries.reduce<[string, { fontSize: string }] | undefined>(
    (best, e) => (best && px(best[1].fontSize) >= px(e[1].fontSize) ? best : e),
    undefined,
  );
  const key = (large ?? largest)?.[0];
  return key === undefined ? "" : toKebabCase(key);
}

type Cell = string | number | boolean | null | undefined;

// A warning per colour the Design System page drops (it reads hex, plain colour functions and `{alias}` only).
function droppedColorWarnings(dsTokens: Record<string, unknown>): string[] {
  const color = dsTokens.color as {
    tokens: { name: string; value: Record<string, Cell> }[];
  };
  return color.tokens.flatMap((token) => {
    const dropped = Object.entries(token.value).filter(([, value]) =>
      /var\(|color-mix\(|url\(/.test(String(value)),
    );
    const [first] = dropped;
    return first === undefined
      ? []
      : [
          `color ${token.name} is ${String(first[1])} in ${dropped.map(([id]) => id).join(", ")}; the Design System page drops it`,
        ];
  });
}

// One sentence per colour key: the usage file, then the product's role text, then the packaged default.
function colourDescriptions(
  theme: ThemeInput,
  usage: Record<string, string>,
): Record<string, string> {
  const standard = packagedStandard();
  const merged = mergeDescriptions({ standard, usage });
  const grammar = standard.grammar;
  return Object.fromEntries(
    Object.keys(theme.colors).flatMap((key) => {
      const role = grammar === undefined ? null : roleOf(key, grammar);
      const text = merged[key] ?? (role === null ? undefined : merged[role]);
      return text === undefined ? [] : [[key, text]];
    }),
  );
}

interface UsageFile {
  usage?: Record<string, string>;
  spacing?: DsSpacing[];
}

/** Everything the build reads, computed before any file is written. */
interface Planned {
  files: [string, string][];
  warnings: string[];
  failures: string[];
}

function readTheme(file: string): { bytes: Buffer; theme: ThemeInput } {
  const bytes = readInput(file, file);
  return {
    bytes,
    theme: parseJson(bytes.toString("utf8"), file) as ThemeInput,
  };
}

// The class candidates the bundle needs: the runtime's own, the preset's strings and the typography classes.
function candidatesOf(
  runtimeCandidates: readonly string[],
  presets: Presets,
  theme: ThemeInput,
): string[] {
  const fromPreset: string[] = [];
  const visit = (node: unknown): void => {
    if (typeof node === "string") fromPreset.push(...node.split(/\s+/));
    else if (Array.isArray(node)) node.forEach(visit);
    else if (node !== null && typeof node === "object")
      Object.values(node).forEach(visit);
  };
  visit(presets);
  const typography = Object.keys(theme.typography ?? {}).map((k) =>
    toKebabCase(k),
  );
  return [
    ...new Set(
      [...runtimeCandidates, ...fromPreset, ...typography].filter(
        (c) => c !== "",
      ),
    ),
  ];
}

// Rendered classes that no rule of the stylesheet selects: the component would draw unstyled.
function unstyledClasses(rendered: ReadonlySet<string>, css: string): string[] {
  const selected = selectedClasses(css);
  return [...rendered]
    .filter((name) => !selected.has(name))
    .sort(compareCodeUnits);
}

async function plan(args: DsBuildArgs, cwd: string): Promise<Planned> {
  const themePath = resolve(cwd, args.theme);
  const configPath = resolve(cwd, args.config);
  const presetPath = resolve(cwd, args.preset);
  const { bytes: themeBytes, theme } = readTheme(themePath);
  const options = loadGeneratorOptions(configPath, args.config);
  const generated = generate(theme as unknown as ThemeConfig, options as never);
  const tokens = generated.tokens.Web as unknown as {
    opacities?: readonly number[];
    breakpoints: readonly string[];
    screens: Record<string, string>;
  };
  const presetBytes = readInput(presetPath, args.preset);
  const presets = await loadPreset(presetPath);

  const failures = dsInputFailures({
    theme,
    coverTemplate: COVER_TEMPLATE,
    buttonPreset: presets.buttonPreset,
  });
  if (failures.length > 0) return { files: [], warnings: [], failures };

  const usageFile = join(dirname(presetPath), "ds.usage.json");
  const { usage = {}, spacing } = (
    existsSync(usageFile) ? readJson(usageFile, usageFile) : {}
  ) as UsageFile;
  const dsTokens = themeToDsTokens(theme, {
    name: args.name,
    usage: colourDescriptions(theme, usage),
    spacing,
    opacities: tokens.opacities ?? [],
    screens: Object.fromEntries(
      tokens.breakpoints.map((b) => [b, tokens.screens[b]]),
    ) as Record<string, string>,
  });

  const dir = runtimeDir();
  const runtime = readFileSync(join(dir, "runtime.js"), "utf8");
  const runtimeCandidates = JSON.parse(
    readFileSync(join(dir, "candidates.json"), "utf8"),
  ) as string[];
  const code = assembleBundle({
    runtime,
    tokens,
    presets,
    namespace: args.namespace,
  });
  const compiler = await createRuleCompiler({
    css: withWrapperSelectors(generated.css),
    cwd,
    preflight: true,
  });

  const trees = renderTrees(code, args.namespace, presets.buttonPreset.intents);
  // The components build some classes from the theme at run time (`bg-<intent>-subtle`), which no scan of the
  // sources sees: the classes they render are candidates too, and the gate below fails the ones with no rule.
  const rendered = renderedClasses(trees);
  const css = compiler.build([
    ...candidatesOf(runtimeCandidates, presets, theme),
    ...rendered,
  ]);
  const titleClass = coverTitleClass(theme.typography ?? {});
  const readme = buildReadme({
    name: args.name,
    themeFile: basename(themePath),
    theme,
    namespace: args.namespace,
    intents: presets.buttonPreset.intents,
  });
  const cover = renderCover(COVER_TEMPLATE, {
    name: args.name,
    namespace: args.namespace,
    theme,
    titleClass,
  });
  const coverVars = new Set(
    [...generated.css.matchAll(/(--sg-[a-z0-9-]+)\s*:/g)].map(
      (m) => m[1] ?? "",
    ),
  );
  const gate = verifyDsOutput({
    readme,
    cover,
    coverVars,
    titleClass,
    bundleCss: css,
    unstyledClasses: unstyledClasses(rendered, css),
  });
  if (gate.length > 0) return { files: [], warnings: [], failures: gate };

  const stamp = makeStamp({
    libVersion: readCliVersion(),
    themeBytes,
    presetBytes,
    tailwindVersion: compiler.tailwindVersion,
  });
  return {
    files: [
      ["tokens.json", `${JSON.stringify(dsTokens, null, 2)}\n`],
      ["README.md", readme],
      ["ds-stamp.json", `${JSON.stringify(stamp, null, 2)}\n`],
      ["components/bundle.js", code],
      ["components/bundle.css", css],
      [
        "components/index.d.ts",
        indexDts({
          theme: theme as unknown as Record<string, Record<string, unknown>>,
          tokens,
          presets,
          namespace: args.namespace,
          themeFile: basename(themePath),
        }),
      ],
      ["components/Cover/preview.html", cover],
    ],
    warnings: droppedColorWarnings(dsTokens),
    failures: [],
  };
}

/**
 * `style-gen ds build`: the files of a design-system artifact from a theme, its config and a component preset.
 * Every file is computed in memory and written last, so a build that fails a gate writes nothing.
 * @param {FlagValues} values - Parsed flags
 * @param {string} cwd - The directory relative paths resolve from
 * @returns {Promise<number>} 0 written, 1 a gate failed, 2 a usage or input error
 */
export async function dsBuildCommand(
  values: FlagValues,
  cwd: string,
): Promise<number> {
  const args = parseDsBuildArgs(values);
  if (typeof args === "string") {
    logger.error(`${args}\nUsage: ${DS_BUILD_USAGE}`);
    return 2;
  }
  let planned: Planned;
  try {
    planned = await plan(args, cwd);
  } catch (error) {
    logger.error(
      error instanceof DsInputError || error instanceof CanvasInputError
        ? error.message
        : `ds build failed: ${errorMessage(error)}`,
    );
    return error instanceof DsInputError || error instanceof CanvasInputError
      ? 2
      : 1;
  }
  for (const warning of planned.warnings) logger.warn(warning);
  if (planned.failures.length > 0) {
    logger.error(planned.failures.join("\n"));
    return 1;
  }
  const out = resolve(cwd, args.out);
  for (const [path, text] of planned.files) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), text);
  }
  logger.info(`wrote ${String(planned.files.length)} files to ${out}`);
  return 0;
}
