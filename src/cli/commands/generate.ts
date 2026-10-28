import path from "node:path";

import {
  readConfigFile,
  resolveConfig,
  toGeneratorOptions,
  type StyleGenConfig,
  type StyleGenConfigFlags,
} from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { emitThemeCss } from "../../node/themeEmitter";
import type { EmitResult, EmitTarget } from "../../node/themeEmitter";
import {
  watchThemeFile,
  type ConfigIssues,
  type ThemeWatchHandle,
  type WatchThemeOptions,
} from "../../node/watchThemeFile";
import { loadCliConfig } from "../loadCliConfig";
import { logger } from "../logger";

export interface GenerateArgs {
  theme?: string;
  out?: string;
  watch?: boolean;
}

/** Handle on a `--watch` run, so callers can stop it. */
export type GenerateWatchHandle = ThemeWatchHandle;

/** Test seams of {@link generateCommand}; the CLI passes none. */
export interface GenerateHooks {
  /** Receives the watcher handle in `--watch` mode as soon as it exists. */
  onHandle?: (handle: GenerateWatchHandle) => void;
  /** Replaces `chokidar.watch`. */
  watch?: WatchThemeOptions["watch"];
  /** Quiet period before a change is re-emitted. */
  debounceMs?: number;
}

/**
 * The emit target a resolved configuration points at. The theme may live
 * outside the project root (a theme shared by a monorepo); the CSS output
 * may not.
 * @param {string} cwd - Project root
 * @param {StyleGenConfig} config - Resolved configuration
 * @returns {EmitTarget} Absolute theme and output paths plus the generator options
 * @throws {Error} When the output path escapes the project root
 */
function toEmitTarget(cwd: string, config: StyleGenConfig): EmitTarget {
  return {
    themeFile: resolveProjectPath(cwd, config.theme, "theme", {
      allowOutsideRoot: true,
    }),
    outFile: resolveProjectPath(cwd, config.output, "output"),
    options: toGeneratorOptions(config),
  };
}

/**
 * Print one emit outcome the way the command always has.
 * @param {string} cwd - Project root, for the relative output path
 * @param {EmitResult} result - What `emitThemeCss`/`watchThemeFile` reported
 */
function report(cwd: string, result: EmitResult): void {
  if (result.ok) {
    const out = path.relative(cwd, result.outFile);
    logger.success(
      result.changed ? `CSS written to ${out}` : `CSS is up to date: ${out}`,
    );
    return;
  }
  const hint =
    result.stage === "read" && result.message.startsWith("Theme file not found")
      ? "\n💡 Run: yarn style-gen init"
      : "";
  logger.error(`${result.message}${hint}`);
}

/**
 * Generate command handler: reads the theme, validates it, runs the same
 * pipeline as `generate()` (through the shared Node runner) and writes the
 * resulting CSS (`@theme`/`@theme inline`/typography/spacing/`@source
 * inline` blocks) to disk, only when it changed. Consumers `@import` the
 * written file directly next to `@import "tailwindcss";`.
 *
 * One-shot: returns 1 on any failure so scripts and CI stop. `--watch`:
 * emits once, then re-emits when the theme or the config file changes. A
 * failure after startup is logged and watching continues; an invalid config
 * edit keeps the last valid one. An unreadable theme or an invalid config at
 * startup still returns 1, before any watcher starts. In watch mode the
 * promise resolves 0 once the watcher is attached; chokidar then keeps the
 * process alive.
 * @param {GenerateArgs} args - Generate arguments from CLI
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @param {GenerateHooks} [hooks] - Test seams
 * @returns {Promise<number>} The process exit code
 */
export async function generateCommand(
  args: GenerateArgs,
  cwd: string = process.cwd(),
  hooks: GenerateHooks = {},
): Promise<number> {
  const flags: StyleGenConfigFlags = {
    ...(args.theme !== undefined && { theme: args.theme }),
    ...(args.out !== undefined && { output: args.out }),
  };

  const loaded = loadCliConfig(cwd, flags);
  if (!loaded) return 1;
  const { config, file } = loaded;

  let target: EmitTarget;
  try {
    target = toEmitTarget(cwd, config);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const first = emitThemeCss(target);
  report(cwd, first);

  if (!args.watch) return first.ok ? 0 : 1;

  // A theme that cannot be read at all (missing, a directory) is a usage
  // error, not an edit in progress: do not start watching.
  if (!first.ok && first.stage === "read") return 1;

  logger.info(`Watching for changes in ${config.theme}...`);

  // Flags still win after a reload; a malformed or invalid config keeps the
  // last valid target (the watcher reports it) instead of falling back to
  // defaults halfway through an edit.
  const reloadTarget = (): EmitTarget | ConfigIssues => {
    const reloaded = readConfigFile(cwd);
    const problem = reloaded.issues ?? reloaded.error;
    if (problem !== undefined) {
      return {
        issues: problem,
        ...(reloaded.source !== undefined && { source: reloaded.source }),
      };
    }
    return toEmitTarget(cwd, resolveConfig(flags, reloaded));
  };

  const handle = watchThemeFile(
    target,
    (result) => {
      report(cwd, result);
    },
    {
      // Also when no config exists yet: creating one is picked up.
      configFile: path.resolve(cwd, file.source ?? "style-gen.config.json"),
      reloadTarget,
      ...(hooks.watch !== undefined && { watch: hooks.watch }),
      ...(hooks.debounceMs !== undefined && { debounceMs: hooks.debounceMs }),
    },
  );
  hooks.onHandle?.(handle);
  await handle.ready;
  return 0;
}
