import { COMPONENTS } from "./dsDocs";
import type { Presets } from "./loadPreset";

/** Header format of the Design System type's bundle (`@ds-bundle`, reference/format.md). */
const BUNDLE_FORMAT = 4;
/** The global the precompiled runtime defines (`scripts/emit-ds-runtime.mjs`). */
const RUNTIME_GLOBAL = "__DsRuntime";

/** What the bundle holds. */
export interface BundleInput {
  /** The text of the packaged `ds/runtime.js`. */
  runtime: string;
  /** `generate().tokens.Web`. */
  tokens: object;
  /** The product's presets. */
  presets: Presets;
  /** The bundle's global name. */
  namespace: string;
}

/**
 * The bundle's `components/bundle.js`: the header, the precompiled runtime, then the six components bound to
 * the theme's tokens and the product's presets. Assembled from strings; nothing is bundled or evaluated here.
 * @param {BundleInput} input - What the bundle holds
 * @returns {string} The file's text
 */
export function assembleBundle({
  runtime,
  tokens,
  presets,
  namespace,
}: BundleInput): string {
  const header = `/* @ds-bundle: ${JSON.stringify({
    format: BUNDLE_FORMAT,
    namespace,
    components: COMPONENTS.map((c) => ({ name: c.name })),
  })} */`;
  const members = COMPONENTS.map(({ name, preset }) => {
    const args =
      preset === undefined
        ? "tokens"
        : `tokens, ${JSON.stringify(presets[preset as keyof Presets])}`;
    return `    ${name}: ${RUNTIME_GLOBAL}.create${name}(${args}),`;
  });
  return [
    header,
    `var ${namespace} = (function () {`,
    runtime.trimEnd(),
    `  var tokens = ${JSON.stringify(tokens)};`,
    "  return {",
    ...members,
    "  };",
    "})();",
    `window.${namespace} = ${namespace};`,
    "",
  ].join("\n");
}

/**
 * Gives every `html[data-<axis>="<variant>"]` block a second, unscoped selector, so a `data-*` attribute on any
 * wrapper switches the theme on a canvas, and re-declares there each `:root` alias the variant does not override
 * (an alias computed at `:root` would keep the light value inside the wrapper). The `html`-only CSS the library
 * emits for apps is unchanged; this copy is for the design-system bundle only.
 * @param {string} css - `generate().css`
 * @returns {string} The CSS with wrapper selectors and re-declared aliases
 */
export function withWrapperSelectors(css: string): string {
  const rootBlocks = [...css.matchAll(/(?<=^|\})\s*:root\s*\{([^{}]*)\}/g)];
  if (rootBlocks.length !== 1)
    throw new Error(
      `expected one :root block, found ${String(rootBlocks.length)}`,
    );
  const aliases = [
    ...(rootBlocks[0]?.[1] ?? "").matchAll(
      /(--sg-[\w-]+)\s*:\s*(var\(--sg-[\w-]+\))\s*;/g,
    ),
  ];
  return css.replaceAll(
    /html(\[data-[\w-]+="[^"]*"\])\s*\{([^{}]*)\}/g,
    (_whole, attr: string, body: string) => {
      const missing = aliases.filter(
        ([, name]) => !new RegExp(`${name ?? ""}\\s*:`).test(body),
      );
      const redeclared = missing
        .map(([, name, value]) => `  ${name ?? ""}: ${value ?? ""};\n`)
        .join("");
      return `html${attr}, ${attr} {${body.trimEnd()}\n${redeclared}}`;
    },
  );
}
