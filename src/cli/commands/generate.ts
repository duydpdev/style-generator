import path from "node:path";

import { configCandidates } from "../../node/configSource";
import { errorMessage } from "../../node/errorMessage";
import {
  noConfigMessage,
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
import { styleGenCommand } from "../packageManager";

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

// A stale tokens file gets the generate hint, a missing theme `noConfig` (when set) and the init hint.
function reportFailure(
  cwd: string,
  failure: { stage: string; message: string },
  noConfig?: string,
): void {
  const missingTheme =
    failure.stage === "read" &&
    failure.message.startsWith("Theme file not found");
  if (failure.stage === "stale") {
    logger.error(`${failure.message} Run: ${styleGenCommand(cwd, "generate")}`);
    return;
  }
  if (!missingTheme) {
    logger.error(failure.message);
    return;
  }
  logger.error(
    [
      failure.message,
      ...(noConfig === undefined ? [] : [noConfig]),
      `💡 Run: ${styleGenCommand(cwd, "init")}`,
    ].join("\n"),
  );
}

function report(cwd: string, result: EmitResult, noConfig?: string): void {
  if (!result.ok) {
    reportFailure(cwd, result, noConfig);
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

// `--check` writes nothing. A malformed config fails it: falling back to the defaults would
// vouch for a tokens file nobody configured.
function check(
  cwd: string,
  target: EmitTarget,
  configError: string | undefined,
): number {
  if (configError !== undefined) {
    logger.error(`--check needs a readable config: ${configError}`);
    return 1;
  }
  const checked = checkTokensModule(target);
  if (!checked.ok) {
    reportFailure(cwd, checked);
    return 1;
  }
  logger.success(`Tokens up to date: ${path.relative(cwd, target.tokensFile)}`);
  return 0;
}

/**
 * Writes the CSS and `theme.tokens.ts` when they changed; `--watch` resolves 0
 * once attached and keeps the last valid config on an invalid edit.
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

  if (args.check) return check(cwd, target, file.error);

  const first = emitTheme(target);
  report(
    cwd,
    first,
    file.source === undefined ? noConfigMessage(cwd) : undefined,
  );

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
      // Both candidates, also when no config exists yet: creating one, or
      // moving it between the two files, is picked up.
      configFiles: configCandidates(cwd),
      reloadTarget,
      ...(hooks.watch !== undefined && { watch: hooks.watch }),
      ...(hooks.debounceMs !== undefined && { debounceMs: hooks.debounceMs }),
    },
  );
  hooks.onHandle?.(handle);
  await handle.ready;
  return 0;
}
