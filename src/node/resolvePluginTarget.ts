import { resolve } from "node:path";

import { z } from "zod";

import { formatZodError } from "../core/themeSchema";

import { loadStyleGenConfig } from "./loadStyleGenConfig";
import { resolveEmitTarget } from "./resolveEmitTarget";
import type { EmitTarget } from "./themeEmitter";

/** The only option the Vite plugin and the Next.js integration share. */
export interface PluginRootOptions {
  /** Directory holding `style-gen.config.json` (or `package.json#style-gen`). */
  root?: string | undefined;
}

const PluginRootOptionsSchema = z.strictObject({
  root: z.string().min(1).optional(),
});

/**
 * Validate the options object of `styleGenVite()` / `styleGenNext()`. Only
 * `root` exists since 8.0; a JS caller (`next.config.mjs` has no type check)
 * that still passes `themePath`, `outDir` or `options` gets an error that
 * names the key and points at the migration guide.
 * @param {unknown} opts - What the caller passed
 * @param {string} label - Integration name for messages (`"style-gen-vite"`)
 * @returns {PluginRootOptions} The validated options
 * @throws {Error} For an unknown key or a non-string or empty `root`
 */
export function parsePluginRootOptions(
  opts: unknown,
  label: string,
): PluginRootOptions {
  if (opts === undefined) return {};
  const parsed = PluginRootOptionsSchema.safeParse(opts);
  if (!parsed.success) {
    throw new Error(
      `[${label}] Invalid options:\n${formatZodError(parsed.error)}\n` +
        `Only { root } is accepted: every generator option lives in style-gen.config.json (see documents/migration/7.x-to-8.0.md).`,
    );
  }
  return parsed.data;
}

/** Where a bundler integration reads the theme and writes the generated files. */
export interface PluginTarget {
  /** Absolute theme, output and tokens files plus the generator options. */
  target: EmitTarget;
  /** Absolute path of the config file to watch (it may not exist yet). */
  configFile: string;
}

/**
 * Resolve where a bundler integration reads the theme from and writes the CSS
 * and `theme.tokens.ts` to: everything comes from `style-gen.config.json`
 * (else `package.json#style-gen`) in `root`, the file the CLI reads, together
 * with every `generate()` option in it. A config that is malformed or violates
 * the schema throws instead of silently falling back to the defaults.
 *
 * Path rules (`resolveProjectPath`): the theme may live anywhere (a monorepo
 * shares one); the generated files must stay inside `root`.
 * @param {string} root - Directory holding the config (Vite's `config.root`, Next's `process.cwd()`, or the plugin's `root` option)
 * @param {string} label - Integration name for messages (`"style-gen-vite"`)
 * @returns {PluginTarget} The emit target and the config file to watch
 * @throws {Error} For an invalid config file or an output path that escapes `root`
 */
export function resolvePluginTarget(root: string, label: string): PluginTarget {
  const loaded = loadStyleGenConfig(root);
  const problem = loaded.error ?? loaded.issues;
  if (problem !== undefined) {
    throw new Error(
      `[${label}] Invalid config (${loaded.source ?? "style-gen.config.json"}):\n${problem}`,
    );
  }
  return {
    target: resolveEmitTarget(root, loaded.config, `[${label}] `),
    configFile: resolve(root, loaded.source ?? "style-gen.config.json"),
  };
}
