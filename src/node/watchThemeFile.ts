import path from "node:path";

import { watch as chokidarWatch } from "chokidar";

import { emitThemeCss } from "./themeEmitter";
import type { EmitResult, EmitTarget } from "./themeEmitter";

/** What {@link WatchThemeOptions.reloadTarget} returns for an unusable config. */
export interface ConfigIssues {
  /** The schema violations or the read error, ready to print. */
  issues: string;
  /** Where the config was read from (`style-gen.config.json`, `package.json`). */
  source?: string;
}

export interface WatchThemeOptions {
  /**
   * A config file to watch next to the theme. A change (or its creation or
   * removal) calls {@link WatchThemeOptions.reloadTarget} and re-emits.
   */
  configFile?: string;
  /**
   * Build the target again after `configFile` changed. Return
   * {@link ConfigIssues} for a config that cannot be used: it is reported
   * (`stage: "config"`), the last valid target stays in force and watching
   * goes on. A target with another `themeFile` makes the watcher unwatch the
   * old theme and watch the new one.
   */
  reloadTarget?: () => EmitTarget | ConfigIssues;
  /**
   * Quiet period collapsing a burst of events into one emit.
   * @default 200
   */
  debounceMs?: number;
  /**
   * `false` lets the process exit while the watcher is alive (Next.js dev
   * servers own the process lifetime).
   * @default true
   */
  persistent?: boolean;
  /** Test seam: replaces `chokidar.watch`. */
  watch?: typeof chokidarWatch;
}

/** Handle on a running watcher. */
export interface ThemeWatchHandle {
  /** Resolves once the watcher is attached (also when it was closed first). */
  ready: Promise<void>;
  /** Cancel a pending emit and stop watching. */
  close: () => Promise<void>;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Re-run {@link emitThemeCss} whenever the theme file (or the config file)
 * changes. Does not emit on start: callers emit once themselves and hand the
 * watcher the follow-ups. Every emit — successful, unchanged or failed — and
 * every watcher error reaches `onResult`; nothing here throws or stops the
 * watcher, so a broken edit is reported and the next good one recovers.
 *
 * Lives apart from `themeEmitter` so `./vite` never imports chokidar.
 * @param {EmitTarget} target - Theme file, output file and options to start with
 * @param {(r: EmitResult) => void} onResult - Receives every emit outcome and error
 * @param {WatchThemeOptions} [o] - Config reload, debounce, persistence and the `watch` seam
 * @returns {ThemeWatchHandle} `ready` and `close`
 */
export function watchThemeFile(
  target: EmitTarget,
  onResult: (r: EmitResult) => void,
  o: WatchThemeOptions = {},
): ThemeWatchHandle {
  const { configFile, reloadTarget, debounceMs = 200, persistent = true } = o;
  const watchFn = o.watch ?? chokidarWatch;
  const configAbs =
    configFile === undefined ? undefined : path.resolve(configFile);

  let current = target;
  let timer: NodeJS.Timeout | undefined;
  let configDirty = false;
  let themeDirty = false;

  // `false`: the config could not be used and `current` stays in force.
  const reload = (): boolean => {
    if (reloadTarget === undefined) return true;
    let next: EmitTarget | ConfigIssues;
    try {
      next = reloadTarget();
    } catch (error) {
      onResult({
        ok: false,
        stage: "config",
        message: `Cannot reload config: ${errorMessage(error)}`,
        cause: error,
      });
      return false;
    }
    if ("issues" in next) {
      const source =
        next.source ??
        (configAbs === undefined ? "config" : path.basename(configAbs));
      onResult({
        ok: false,
        stage: "config",
        message: `Invalid config (${source}):\n${next.issues}`,
        cause: next,
      });
      return false;
    }
    if (next.themeFile !== current.themeFile) {
      watcher.unwatch(current.themeFile);
      watcher.add(next.themeFile);
    }
    current = next;
    return true;
  };

  const run = (): void => {
    timer = undefined;
    const reloadFailed = configDirty && !reload();
    const nothingToEmit = reloadFailed && !themeDirty;
    configDirty = false;
    themeDirty = false;
    // An unusable config alone changes nothing: report it and leave the
    // output as the last valid config made it. A theme edit in the same
    // burst still emits (with that last valid target).
    if (!nothingToEmit) onResult(emitThemeCss(current));
  };

  const schedule = (changedFile: string): void => {
    if (configAbs !== undefined && path.resolve(changedFile) === configAbs) {
      configDirty = true;
    } else {
      themeDirty = true;
    }
    clearTimeout(timer);
    timer = setTimeout(run, debounceMs);
  };

  const watcher = watchFn(
    configAbs === undefined
      ? current.themeFile
      : [current.themeFile, configAbs],
    { persistent, ignoreInitial: true },
  );
  // `add`/`unlink` cover editors that save by replacing the file.
  watcher.on("change", schedule);
  watcher.on("add", schedule);
  watcher.on("unlink", (file) => {
    // The config being removed means "defaults again": reload. A removed
    // theme needs nothing: its `add` event re-emits when it comes back.
    if (configAbs !== undefined && path.resolve(file) === configAbs) {
      schedule(file);
    }
  });
  watcher.on("error", (error) => {
    onResult({
      ok: false,
      stage: "watch",
      message: `Watcher error: ${errorMessage(error)}`,
      cause: error,
    });
  });

  // Plain executor: the repo's ES2022 lib has no Promise.withResolvers.
  let markReady: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });
  watcher.once("ready", markReady);

  return {
    ready,
    close: () => {
      clearTimeout(timer);
      timer = undefined;
      // chokidar never emits `ready` once closed; don't leave awaiters hanging.
      markReady();
      return watcher.close();
    },
  };
}
