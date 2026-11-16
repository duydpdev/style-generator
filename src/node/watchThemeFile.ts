import path from "node:path";

import { watch as chokidarWatch } from "chokidar";

import { liveConfigIndex, sameEmitTarget } from "./configSource";
import { errorMessage } from "./errorMessage";
import { emitTheme } from "./themeEmitter";
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
   * The files the config can live in, highest precedence first
   * (`configCandidates(root)`). All are watched, also when they do not exist
   * yet or are removed and created again; a change, creation or removal of one
   * calls {@link WatchThemeOptions.reloadTarget} and re-emits. An event of a file
   * shadowed by an earlier one that exists is ignored, and an edit of a later
   * one (`package.json`) that leaves the reloaded target unchanged emits nothing.
   */
  configFiles?: readonly string[];
  /**
   * Build the target again after a config file changed. Return
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

/**
 * Re-run {@link emitTheme} whenever the theme file (or the config file)
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
  const { reloadTarget, debounceMs = 200, persistent = true } = o;
  const watchFn = o.watch ?? chokidarWatch;
  const candidates = (o.configFiles ?? []).map((file) => path.resolve(file));

  let current = target;
  let timer: NodeJS.Timeout | undefined;
  let configDirty = false;
  // A first-candidate (`style-gen.config.json`) event: always worth an emit.
  let primaryDirty = false;
  let themeDirty = false;

  // `failed`: the config could not be used and `current` stays in force.
  // `same`: it loaded and describes the target already in force.
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
    const outcome = configDirty ? reload() : "changed";
    const nothingToEmit =
      (outcome === "failed" && !themeDirty) ||
      // `package.json` changed (`yarn add`, a version bump) without touching
      // the `style-gen` section: nothing to emit and nothing to log.
      (outcome === "same" && !primaryDirty && !themeDirty);
    configDirty = false;
    primaryDirty = false;
    themeDirty = false;
    // An unusable config alone changes nothing: report it and leave the
    // output as the last valid config made it. A theme edit in the same
    // burst still emits (with that last valid target).
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
    const isConfig = candidates.includes(abs);
    // chokidar watches a file that existed at start through a watch on the
    // file itself and drops that watch on `unlink`: without a re-arm its
    // re-creation (`git checkout`, `git stash`) and later edits are never
    // seen. Unwatching first clears chokidar's ignore entry, so `add` really
    // starts a fresh watch; the re-created file then reports one `add`.
    if (isConfig || abs === path.resolve(current.themeFile)) {
      watcher.unwatch(file);
      watcher.add(file);
    }
    // A config file being removed means "the next candidate, else defaults":
    // reload. A removed theme needs nothing more: its `add` event re-emits
    // when it comes back.
    if (isConfig) schedule(file);
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
