import path from "node:path";

import { errorMessage } from "../../node/errorMessage";
import {
  readConfigFile,
  resolveConfig,
  type StyleGenConfigFlags,
} from "../../node/loadStyleGenConfig";
import { resolveEmitTarget } from "../../node/resolveEmitTarget";
import { checkTokensModule, emitTheme } from "../../node/themeEmitter";
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
  check?: boolean;
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
 * Print one failure the way the command always has.
 * @param {{stage: string, message: string}} failure - The failed outcome
 * @param {string} failure.stage - Pipeline stage that failed
 * @param {string} failure.message - The message to print
 */
function reportFailure(failure: { stage: string; message: string }): void {
  const hint =
    failure.stage === "read" &&
    failure.message.startsWith("Theme file not found")
      ? "\n💡 Run: yarn style-gen init"
      : "";
  logger.error(`${failure.message}${hint}`);
}

/**
 * Print one emit outcome the way the command always has.
 * @param {string} cwd - Project root, for the relative output paths
 * @param {EmitResult} result - What `emitTheme`/`watchThemeFile` reported
 */
function report(cwd: string, result: EmitResult): void {
  if (!result.ok) {
    reportFailure(result);
    return;
  }
  const out = path.relative(cwd, result.outFile);
  const tokens = path.relative(cwd, result.tokensFile);
  logger.success(
    result.cssChanged ? `CSS written to ${out}` : `CSS is up to date: ${out}`,
  );
  logger.success(
    result.tokensChanged
      ? `Tokens written to ${tokens}`
      : `Tokens up to date: ${tokens}`,
  );
}

/**
 * `--check`: report whether the tokens file matches the theme and config,
 * writing nothing.
 * @param {string} cwd - Project root, for the relative path in the message
 * @param {EmitTarget} target - The resolved emit target
 * @returns {number} 0 when current, 1 otherwise
 */
function check(cwd: string, target: EmitTarget): number {
  const checked = checkTokensModule(target);
  if (!checked.ok) {
    reportFailure(checked);
    return 1;
  }
  logger.success(`Tokens up to date: ${path.relative(cwd, target.tokensFile)}`);
  return 0;
}

/**
 * Generate command handler: reads the theme, validates it, runs the same
 * pipeline as `generate()` (through the shared Node runner) and writes the
 * resulting CSS (`@theme`/`@theme inline`/typography/spacing/`@source
 * inline` blocks) and the typed `theme.tokens.ts` to disk, only when a file
 * changed. Consumers `@import` the CSS directly next to `@import
 * "tailwindcss";` and import `tokens` from the tokens module.
 *
 * One-shot: returns 1 on any failure so scripts and CI stop. `--check`
 * writes nothing and returns 1 when the tokens file is missing or differs
 * from what the theme and config generate (it cannot be combined with
 * `--watch`). `--watch`: emits once, then re-emits when the theme or the
 * config file changes. A failure after startup is logged and watching
 * continues; an invalid config edit keeps the last valid one. An unreadable
 * theme or an invalid config at startup still returns 1, before any watcher
 * starts. In watch mode the promise resolves 0 once the watcher is attached;
 * chokidar then keeps the process alive.
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
    target = resolveEmitTarget(cwd, config);
  } catch (error) {
    logger.error(errorMessage(error));
    return 1;
  }

  if (args.check && args.watch) {
    logger.error("--check and --watch cannot be combined");
    return 1;
  }

  if (args.check) return check(cwd, target);

  const first = emitTheme(target);
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
    return resolveEmitTarget(cwd, resolveConfig(flags, reloaded));
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
