import { dirname, resolve } from "node:path";

import { z } from "zod";

import type { StyleGeneratorOptions } from "../core/Options";
import { formatZodError } from "../core/themeSchema";

import { loadStyleGenConfig, toGeneratorOptions } from "./loadStyleGenConfig";
import { resolveProjectPath } from "./resolveProjectPath";
import type { EmitTarget } from "./themeEmitter";

/** The options the Vite plugin and the Next.js integration share. */
export interface PluginTargetOptions {
  /** Theme JSON path, relative to the project root (or absolute). */
  themePath: string;
  /** Directory for `theme.css`; defaults to `dirname(themePath)`. */
  outDir?: string;
  /** Forwarded to `generate()`. */
  options?: StyleGeneratorOptions;
}

// `options` is validated by `prepareGenerate` when the theme is emitted.
const PluginTargetOptionsSchema = z.strictObject({
  themePath: z.string().min(1),
  outDir: z.string().min(1).optional(),
  options: z.unknown().optional(),
});

/**
 * Resolve where a bundler integration reads the theme from and writes the CSS
 * to. With `opts` the paths come from it (`theme.css` inside `outDir`); with
 * none they come from `style-gen.config.json` (else `package.json#style-gen`)
 * in `root`, the file the CLI reads, together with every `generate()` option
 * in it. A config that is malformed or violates the schema throws instead of
 * silently falling back to the defaults.
 *
 * Path rules (`resolveProjectPath`): the theme may live anywhere (a monorepo
 * shares one); the generated CSS must stay inside `root`.
 * @param {string} root - Project root (Vite's `config.root`, Next's `process.cwd()`)
 * @param {PluginTargetOptions | undefined} opts - Integration options, if any
 * @param {string} label - Integration name for messages (`"style-gen-vite"`)
 * @returns {EmitTarget} Absolute theme and output files plus the options
 * @throws {Error} For unknown or mistyped keys in `opts`, an invalid config file or an output path that escapes `root`
 */
export function resolvePluginTarget(
  root: string,
  opts: PluginTargetOptions | undefined,
  label: string,
): EmitTarget {
  if (opts) {
    const parsed = PluginTargetOptionsSchema.safeParse(opts);
    if (!parsed.success) {
      throw new Error(
        `[${label}] Invalid options:\n${formatZodError(parsed.error)}`,
      );
    }
    // Say where an inherited outDir came from: with a theme outside the root
    // `dirname(themePath)` is outside it too, and the error must not read as
    // if the caller had passed that outDir.
    const outDirLabel =
      opts.outDir === undefined
        ? `[${label}] outDir (defaults to dirname(themePath); set outDir inside the project root)`
        : `[${label}] outDir`;
    const outDir = resolveProjectPath(
      root,
      opts.outDir ?? dirname(opts.themePath),
      outDirLabel,
    );
    return {
      themeFile: resolveProjectPath(
        root,
        opts.themePath,
        `[${label}] themePath`,
        { allowOutsideRoot: true },
      ),
      outFile: resolve(outDir, "theme.css"),
      options: opts.options ?? {},
    };
  }

  const loaded = loadStyleGenConfig(root);
  const problem = loaded.error ?? loaded.issues;
  if (problem !== undefined) {
    throw new Error(
      `[${label}] Invalid config (${loaded.source ?? "style-gen.config.json"}):\n${problem}`,
    );
  }
  return {
    themeFile: resolveProjectPath(
      root,
      loaded.config.theme,
      `[${label}] theme`,
      {
        allowOutsideRoot: true,
      },
    ),
    outFile: resolveProjectPath(
      root,
      loaded.config.output,
      `[${label}] output`,
    ),
    options: toGeneratorOptions(loaded.config),
  };
}
