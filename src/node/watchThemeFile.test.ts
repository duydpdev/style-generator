import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmitResult, EmitTarget } from "./themeEmitter";
import { watchThemeFile } from "./watchThemeFile";
import type { ThemeWatchHandle, WatchThemeOptions } from "./watchThemeFile";

/** The slice of a chokidar `FSWatcher` the runner touches. */
class FakeWatcher extends EventEmitter {
  watched: string[];
  unwatched: string[] = [];
  added: string[] = [];
  closed = false;

  constructor(
    paths: string | string[],
    readonly options: object,
  ) {
    super();
    this.watched = Array.isArray(paths) ? paths : [paths];
  }

  unwatch(paths: string): this {
    this.unwatched.push(paths);
    return this;
  }

  add(paths: string): this {
    this.added.push(paths);
    return this;
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
}

const theme = (primary: string): string =>
  JSON.stringify({ colors: { primary } });

describe("watchThemeFile", () => {
  let dir: string;
  let themeFile: string;
  let outFile: string;
  let tokensFile: string;
  let configFile: string;
  let packageFile: string;
  let fake: FakeWatcher | undefined;
  let results: EmitResult[];
  let handle: ThemeWatchHandle | undefined;

  const start = (
    target: Partial<EmitTarget> = {},
    o: WatchThemeOptions = {},
  ): FakeWatcher => {
    handle = watchThemeFile(
      { themeFile, outFile, tokensFile, ...target },
      (r) => results.push(r),
      {
        debounceMs: 50,
        ...o,
        watch: ((paths: string | string[], options: object) => {
          fake = new FakeWatcher(paths, options);
          return fake;
        }) as never,
      },
    );
    if (fake === undefined) throw new Error("watch seam was not called");
    return fake;
  };

  // What an emit reports when both files were written (`true`) or both left alone.
  const ok = (
    changed: boolean,
    out: string = outFile,
    tokens: string = tokensFile,
  ): EmitResult => ({
    ok: true,
    outFile: out,
    tokensFile: tokens,
    changed,
    cssChanged: changed,
    tokensChanged: changed,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-watch-"));
    themeFile = path.join(dir, "theme.json");
    outFile = path.join(dir, "theme.css");
    tokensFile = path.join(dir, "theme.tokens.ts");
    configFile = path.join(dir, "style-gen.config.json");
    packageFile = path.join(dir, "package.json");
    fs.writeFileSync(themeFile, theme("#111"));
    results = [];
    fake = undefined;
    handle = undefined;
  });

  afterEach(async () => {
    await handle?.close();
    vi.useRealTimers();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("watches only the theme without a config file, persistent and not on start", () => {
    const w = start();

    expect(w.watched).toEqual([themeFile]);
    expect(w.options).toEqual({ persistent: true, ignoreInitial: true });
    expect(results).toEqual([]);
    expect(fs.existsSync(outFile)).toBe(false);
  });

  it("passes persistent: false and watches every config candidate next to the theme", () => {
    const w = start(
      {},
      { configFiles: [configFile, packageFile], persistent: false },
    );

    expect(w.watched).toEqual([themeFile, configFile, packageFile]);
    expect(w.options).toMatchObject({ persistent: false });
  });

  it("re-emits once for a burst of changes and reports it", () => {
    const w = start();

    w.emit("change", themeFile);
    vi.advanceTimersByTime(20);
    fs.writeFileSync(themeFile, theme("#222"));
    w.emit("change", themeFile);
    vi.advanceTimersByTime(49);
    expect(results).toEqual([]);
    vi.advanceTimersByTime(1);

    expect(results).toEqual([ok(true)]);
    expect(fs.existsSync(tokensFile)).toBe(true);
    expect(fs.readFileSync(outFile, "utf8")).toContain("#222");
  });

  it("emits again on `add` (an editor that replaces the file) and reports changed: false for identical CSS", () => {
    const w = start();
    w.emit("add", themeFile);
    vi.advanceTimersByTime(50);
    w.emit("add", themeFile);
    vi.advanceTimersByTime(50);

    expect(results).toEqual([ok(true), ok(false)]);
  });

  it("reports an invalid theme and keeps watching; the next good edit recovers", () => {
    const w = start();
    fs.writeFileSync(themeFile, "{ broken");
    w.emit("change", themeFile);
    vi.advanceTimersByTime(50);

    expect(results[0]).toMatchObject({ ok: false, stage: "parse" });
    expect(w.closed).toBe(false);

    fs.writeFileSync(themeFile, theme("#333"));
    w.emit("change", themeFile);
    vi.advanceTimersByTime(50);

    expect(results[1]).toEqual(ok(true));
  });

  it("forwards watcher errors as stage `watch` and keeps running", () => {
    const w = start();
    const boom = new Error("EMFILE");

    w.emit("error", boom);

    expect(results).toEqual([
      {
        ok: false,
        stage: "watch",
        message: "Watcher error: EMFILE",
        cause: boom,
      },
    ]);
    expect(w.closed).toBe(false);
  });

  describe("config reload", () => {
    it("re-emits with the reloaded options and keeps them for later theme edits", () => {
      const reloadTarget = vi.fn(
        (): EmitTarget => ({
          themeFile,
          outFile,
          tokensFile,
          options: { resetTailwindDefaults: ["colors"] },
        }),
      );
      const w = start({}, { configFiles: [configFile], reloadTarget });

      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      expect(reloadTarget).toHaveBeenCalledTimes(1);
      expect(results).toEqual([ok(true)]);
      expect(fs.readFileSync(outFile, "utf8")).toContain("--color-*: initial;");

      fs.writeFileSync(themeFile, theme("#444"));
      w.emit("change", themeFile);
      vi.advanceTimersByTime(50);

      // A theme-only change does not reload, and the new options still apply.
      expect(reloadTarget).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync(outFile, "utf8")).toContain("--color-*: initial;");
      expect(fs.readFileSync(outFile, "utf8")).toContain("#444");
    });

    it("reloads once when the config and the theme change in the same burst", () => {
      const reloadTarget = vi.fn(
        (): EmitTarget => ({ themeFile, outFile, tokensFile }),
      );
      const w = start({}, { configFiles: [configFile], reloadTarget });

      w.emit("change", configFile);
      w.emit("change", themeFile);
      vi.advanceTimersByTime(50);

      expect(reloadTarget).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });

    it("reports an invalid config, keeps the last valid target and keeps watching", () => {
      const opts = { resetTailwindDefaults: ["colors"] } as const;
      const reloadTarget = vi
        .fn<() => EmitTarget | { issues: string; source?: string }>()
        .mockReturnValueOnce({
          issues: "breakpoint → Unrecognized key",
          source: "style-gen.config.json",
        });
      const w = start(
        { options: opts },
        { configFiles: [configFile], reloadTarget },
      );

      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        ok: false,
        stage: "config",
        message:
          "Invalid config (style-gen.config.json):\nbreakpoint → Unrecognized key",
      });
      expect(fs.existsSync(outFile)).toBe(false);
      expect(w.closed).toBe(false);

      // The theme edit that follows uses the last valid target (with its options).
      fs.writeFileSync(themeFile, theme("#555"));
      w.emit("change", themeFile);
      vi.advanceTimersByTime(50);

      expect(results[1]).toEqual(ok(true));
      expect(fs.readFileSync(outFile, "utf8")).toContain("--color-*: initial;");
    });

    it("still emits a theme edit that arrives in the same burst as an invalid config", () => {
      const w = start(
        {},
        {
          configFiles: [configFile],
          reloadTarget: () => ({ issues: "x → bad" }),
        },
      );
      fs.writeFileSync(themeFile, theme("#666"));
      w.emit("change", configFile);
      w.emit("change", themeFile);
      vi.advanceTimersByTime(50);

      expect(results.map((r) => (r.ok ? "ok" : r.stage))).toEqual([
        "config",
        "ok",
      ]);
      expect(fs.readFileSync(outFile, "utf8")).toContain("#666");
    });

    it("falls back to the config file's basename when the issues carry no source", () => {
      const w = start(
        {},
        {
          configFiles: [configFile],
          reloadTarget: () => ({ issues: "x → bad" }),
        },
      );
      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      expect(results[0]).toMatchObject({
        stage: "config",
        message: "Invalid config (style-gen.config.json):\nx → bad",
      });
    });

    it("reports a reloadTarget that throws as a config failure", () => {
      const w = start(
        {},
        {
          configFiles: [configFile],
          reloadTarget: () => {
            throw new Error("disk gone");
          },
        },
      );
      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      expect(results[0]).toMatchObject({
        ok: false,
        stage: "config",
        message: "Cannot reload config: disk gone",
      });
    });

    it("unwatches the old theme, watches the new one and emits from it", () => {
      const other = path.join(dir, "other.json");
      const otherOut = path.join(dir, "other.css");
      const otherTokens = path.join(dir, "other.tokens.ts");
      fs.writeFileSync(other, theme("#999"));
      const w = start(
        {},
        {
          configFiles: [configFile],
          reloadTarget: () => ({
            themeFile: other,
            outFile: otherOut,
            tokensFile: otherTokens,
          }),
        },
      );

      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      expect(w.unwatched).toEqual([themeFile]);
      expect(w.added).toEqual([other]);
      expect(results).toEqual([ok(true, otherOut, otherTokens)]);
      expect(fs.readFileSync(otherOut, "utf8")).toContain("#999");
    });

    it("does not touch the watched paths when the theme file is unchanged", () => {
      const w = start(
        {},
        {
          configFiles: [configFile],
          reloadTarget: () => ({ themeFile, outFile, tokensFile }),
        },
      );
      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      expect(w.unwatched).toEqual([]);
      expect(w.added).toEqual([]);
    });

    it("reloads when the config file is removed, but a removed theme triggers nothing", () => {
      const reloadTarget = vi.fn(
        (): EmitTarget => ({ themeFile, outFile, tokensFile }),
      );
      const w = start({}, { configFiles: [configFile], reloadTarget });

      w.emit("unlink", themeFile);
      vi.advanceTimersByTime(50);
      expect(reloadTarget).not.toHaveBeenCalled();
      expect(results).toEqual([]);

      w.emit("unlink", configFile);
      vi.advanceTimersByTime(50);
      expect(reloadTarget).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
    });

    it("ignores config events when no reloadTarget is given", () => {
      const w = start({}, { configFiles: [configFile] });
      w.emit("change", configFile);
      vi.advanceTimersByTime(50);

      // Still re-emits (harmless, unchanged) but never reports a config stage.
      expect(results).toEqual([ok(true)]);
    });

    // N-L1: the config can move between `style-gen.config.json` and
    // `package.json#style-gen`; both candidates are watched.
    describe("config candidates (N-L1)", () => {
      const candidates = (): string[] => [configFile, packageFile];
      const withOptions = (): EmitTarget => ({
        themeFile,
        outFile,
        tokensFile,
        options: { resetTailwindDefaults: ["colors"] },
      });

      it("reloads when package.json gains the config while no style-gen.config.json exists", () => {
        const reloadTarget = vi.fn(withOptions);
        const w = start({}, { configFiles: candidates(), reloadTarget });

        w.emit("change", packageFile);
        vi.advanceTimersByTime(50);

        expect(reloadTarget).toHaveBeenCalledTimes(1);
        expect(results).toEqual([ok(true)]);
        expect(fs.readFileSync(outFile, "utf8")).toContain(
          "--color-*: initial;",
        );
      });

      it("reloads when style-gen.config.json appears while package.json is the source", () => {
        const reloadTarget = vi.fn(withOptions);
        const w = start({}, { configFiles: candidates(), reloadTarget });
        fs.writeFileSync(configFile, "{}");

        w.emit("add", configFile);
        vi.advanceTimersByTime(50);

        expect(reloadTarget).toHaveBeenCalledTimes(1);
        expect(results).toEqual([ok(true)]);
      });

      it("ignores package.json events while style-gen.config.json exists", () => {
        const reloadTarget = vi.fn(withOptions);
        const w = start({}, { configFiles: candidates(), reloadTarget });
        fs.writeFileSync(configFile, "{}");

        w.emit("change", packageFile);
        vi.advanceTimersByTime(50);

        expect(reloadTarget).not.toHaveBeenCalled();
        expect(results).toEqual([]);
      });

      it("emits and logs nothing for a package.json change that leaves the target as it is", () => {
        const unchanged: EmitTarget = { themeFile, outFile, tokensFile };
        const reloadTarget = vi.fn(() => unchanged);
        const w = start({}, { configFiles: candidates(), reloadTarget });

        w.emit("change", packageFile);
        vi.advanceTimersByTime(50);

        expect(reloadTarget).toHaveBeenCalledTimes(1);
        expect(results).toEqual([]);
        expect(fs.existsSync(outFile)).toBe(false);
      });

      it("still reports an unusable package.json section", () => {
        const w = start(
          {},
          {
            configFiles: candidates(),
            reloadTarget: () => ({ issues: "x → bad", source: "package.json" }),
          },
        );

        w.emit("change", packageFile);
        vi.advanceTimersByTime(50);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          ok: false,
          stage: "config",
          message: "Invalid config (package.json):\nx → bad",
        });
      });

      it("reloads when style-gen.config.json is removed, falling back to package.json", () => {
        const reloadTarget = vi.fn(withOptions);
        const w = start({}, { configFiles: candidates(), reloadTarget });

        w.emit("unlink", configFile);
        vi.advanceTimersByTime(50);

        expect(reloadTarget).toHaveBeenCalledTimes(1);
        expect(results).toEqual([ok(true)]);
      });
    });
  });

  describe("lifecycle", () => {
    it("resolves ready on the watcher's ready event", async () => {
      const w = start();
      let settled = false;
      void handle?.ready.then(() => {
        settled = true;
      });

      await Promise.resolve();
      expect(settled).toBe(false);
      w.emit("ready");
      await handle?.ready;
      expect(settled).toBe(true);
    });

    it("close() cancels a pending emit, closes the watcher and settles ready", async () => {
      const w = start();
      w.emit("change", themeFile);

      await handle?.close();
      vi.advanceTimersByTime(500);

      expect(w.closed).toBe(true);
      expect(results).toEqual([]);
      expect(fs.existsSync(outFile)).toBe(false);
      await expect(handle?.ready).resolves.toBeUndefined();
    });
  });
});

describe("watchThemeFile with the real chokidar", () => {
  it(
    "re-emits after the theme file is edited",
    { timeout: 15_000 },
    async () => {
      const dir = fs.mkdtempSync(
        path.join(os.tmpdir(), "style-gen-watch-real-"),
      );
      const themeFile = path.join(dir, "theme.json");
      const outFile = path.join(dir, "theme.css");
      const tokensFile = path.join(dir, "theme.tokens.ts");
      fs.writeFileSync(themeFile, theme("#111"));
      const results: EmitResult[] = [];
      const handle = watchThemeFile(
        { themeFile, outFile, tokensFile },
        (r) => results.push(r),
        { debounceMs: 20 },
      );
      try {
        await handle.ready;
        // An edit within the same mtime tick as the initial scan is not
        // reported by chokidar, so keep editing (a new value each poll) until
        // an event gets through.
        let edit = 0;
        await vi.waitFor(
          () => {
            fs.writeFileSync(themeFile, theme(`#00${String(edit++)}`));
            expect(results.some((r) => r.ok && r.changed)).toBe(true);
          },
          { timeout: 10_000, interval: 100 },
        );
        expect(fs.readFileSync(outFile, "utf8")).toMatch(/#00\d+/);
      } finally {
        await handle.close();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  );

  // N-L1: chokidar must report a candidate that does not exist yet.
  it(
    "reloads when a config candidate that did not exist is created",
    { timeout: 15_000 },
    async () => {
      const dir = fs.mkdtempSync(
        path.join(os.tmpdir(), "style-gen-watch-cand-"),
      );
      const themeFile = path.join(dir, "theme.json");
      const outFile = path.join(dir, "theme.css");
      const tokensFile = path.join(dir, "theme.tokens.ts");
      const configFile = path.join(dir, "style-gen.config.json");
      const packageFile = path.join(dir, "package.json");
      fs.writeFileSync(themeFile, theme("#111"));
      const reloadTarget = vi.fn(
        (): EmitTarget => ({
          themeFile,
          outFile,
          tokensFile,
          options: { resetTailwindDefaults: ["colors"] },
        }),
      );
      const handle = watchThemeFile(
        { themeFile, outFile, tokensFile },
        () => undefined,
        {
          debounceMs: 20,
          configFiles: [configFile, packageFile],
          reloadTarget,
        },
      );
      try {
        await handle.ready;
        // The first write creates the missing candidate; chokidar may miss an
        // event in the same mtime tick as its scan, so keep writing until one
        // gets through (a later write is a `change` of the now-existing file).
        let edit = 0;
        await vi.waitFor(
          () => {
            fs.writeFileSync(packageFile, JSON.stringify({ edit: edit++ }));
            expect(reloadTarget).toHaveBeenCalled();
          },
          { timeout: 10_000, interval: 100 },
        );
      } finally {
        await handle.close();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});
