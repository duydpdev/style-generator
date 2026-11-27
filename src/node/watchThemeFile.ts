import fs from "node:fs";
import path from "node:path";

import { watch as chokidarWatch } from "chokidar";

import { liveConfigIndex, sameEmitTarget } from "./configSource";
import { errorMessage } from "./errorMessage";
import { emitTheme } from "./themeEmitter";
import type { EmitResult, EmitTarget } from "./themeEmitter";

/** What {@link WatchThemeOptions.reloadTarget} returns for an unusable config. */
export interface ConfigIssues {
  issues: string;
  source?: string;
}

export interface WatchThemeOptions {
  /** `configCandidates(root)`: all watched, existing or not; an event reloads the target. */
  configFiles?: readonly string[];
  /** Rebuild the target after a config change; {@link ConfigIssues} keeps the last valid one. */
  reloadTarget?: () => EmitTarget | ConfigIssues;
  /** Quiet period (ms) collapsing a burst of events into one emit; default 200. */
  debounceMs?: number;
  /** `false` lets the process exit while watching (Next.js owns it); default `true`. */
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

/**
 * Re-run {@link emitTheme} on theme/config changes (not on start), reporting all to `onResult`.
 * Apart from `themeEmitter` so `./vite` never imports chokidar.
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
  const { reloadTarget, debounceMs = 200, persistent = true } = o;
  const watchFn = o.watch ?? chokidarWatch;
  const candidates = (o.configFiles ?? []).map((file) => path.resolve(file));

  let current = target;
  let timer: NodeJS.Timeout | undefined;
  let configDirty = false;
  // A first-candidate (`style-gen.config.json`) event: always worth an emit.
  let primaryDirty = false;
  let themeDirty = false;

  // `failed`: config unusable, `current` stays; `same`: it describes `current`.
  const reload = (): "failed" | "same" | "changed" => {
    if (reloadTarget === undefined) return "changed";
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
      return "failed";
    }
    if ("issues" in next) {
      const first = candidates[0];
      const source =
        next.source ?? (first === undefined ? "config" : path.basename(first));
      onResult({
        ok: false,
        stage: "config",
        message: `Invalid config (${source}):\n${next.issues}`,
        cause: next,
      });
      return "failed";
    }
    const same = sameEmitTarget(next, current);
    if (next.themeFile !== current.themeFile) {
      watcher.unwatch(current.themeFile);
      watcher.add(next.themeFile);
    }
    current = next;
    return same ? "same" : "changed";
  };

  const run = (): void => {
    timer = undefined;
    // A theme removed for good: nothing to emit and nothing to log.
    if (!configDirty && !fs.existsSync(current.themeFile)) {
      primaryDirty = false;
      themeDirty = false;
      return;
    }
    const outcome = configDirty ? reload() : "changed";
    const nothingToEmit =
      (outcome === "failed" && !themeDirty) ||
      // A `package.json` edit outside the `style-gen` section: nothing to do.
      (outcome === "same" && !primaryDirty && !themeDirty);
    configDirty = false;
    primaryDirty = false;
    themeDirty = false;
    // An unusable config alone emits nothing (a theme edit in the burst still does).
    // Rationale: documents/architecture.md#watchthemefile-config-reload-semantics
    if (!nothingToEmit) onResult(emitTheme(current));
  };

  const schedule = (changedFile: string): void => {
    const abs = path.resolve(changedFile);
    if (candidates.includes(abs)) {
      // `undefined`: shadowed by an earlier config file that exists.
      const index = liveConfigIndex(candidates, abs);
      if (index === undefined) return;
      configDirty = true;
      if (index === 0) primaryDirty = true;
    } else {
      themeDirty = true;
    }
    clearTimeout(timer);
    timer = setTimeout(run, debounceMs);
  };

  const watcher = watchFn([current.themeFile, ...candidates], {
    persistent,
    ignoreInitial: true,
  });
  // `add`/`unlink` cover editors that save by replacing the file.
  watcher.on("change", schedule);
  watcher.on("add", schedule);
  watcher.on("unlink", (file) => {
    const abs = path.resolve(file);
    if (!candidates.includes(abs) && abs !== path.resolve(current.themeFile)) {
      return;
    }
    // chokidar drops a file's own watch on `unlink`; unwatch-then-add re-arms it.
    // Rationale: documents/architecture.md#watchthemefile-re-arming-the-watch-after-unlink
    watcher.unwatch(file);
    watcher.add(file);
    // Scheduled here: `ignoreInitial` drops the re-arm `add`; `run` skips a still-gone theme.
    schedule(file);
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
