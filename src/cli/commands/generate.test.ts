import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
  type MockInstance,
} from "vitest";

import type { WatchThemeOptions } from "../../node/watchThemeFile";
import { logger } from "../logger";

import { generateCommand, type GenerateWatchHandle } from "./generate";

const sampleTheme = {
  colors: { primary: "#3B82F6", background: "#FFFFFF" },
  typography: {
    h1: {
      fontSize: "32px",
      lineHeight: "40px",
      fontWeight: 700,
      letterSpacing: "0",
    },
  },
  shadows: { sm: "0 1px 2px #0000000d" },
};

describe("generateCommand", () => {
  let tmp: string;
  let watchHandle: GenerateWatchHandle | undefined;
  let errorSpy: MockInstance<typeof logger.error>;
  let successSpy: MockInstance<typeof logger.success>;
  let warnSpy: MockInstance<typeof logger.warn>;

  const file = (rel: string): string => path.join(tmp, rel);
  const write = (rel: string, content: string | object): void => {
    fs.mkdirSync(path.dirname(file(rel)), { recursive: true });
    fs.writeFileSync(
      file(rel),
      typeof content === "string" ? content : JSON.stringify(content),
    );
  };
  const read = (rel: string): string => fs.readFileSync(file(rel), "utf8");
  const exists = (rel: string): boolean => fs.existsSync(file(rel));

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-generate-"));
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    successSpy = vi
      .spyOn(logger, "success")
      .mockImplementation(() => undefined);
    vi.spyOn(logger, "info").mockImplementation(() => undefined);
    warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await watchHandle?.close();
    watchHandle = undefined;
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("one-shot", () => {
    it("writes theme.css with theme-derived CSS and returns 0", async () => {
      write("styles/theme.json", sampleTheme);

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(0);
      const content = read("styles/theme.css");
      expect(content).toMatch(/--sg-color-primary/);
      expect(content).toMatch(/@utility h-1 \{/);
      expect(content).toMatch(/shadow-sm/);
      expect(successSpy).toHaveBeenCalledWith(
        `CSS written to ${path.join("styles", "theme.css")}`,
      );
    });

    it("says the CSS is up to date, and leaves the file alone, on an identical second run", async () => {
      write("styles/theme.json", sampleTheme);
      const args = { theme: "styles/theme.json", out: "styles/theme.css" };
      await generateCommand(args, tmp);
      const before = fs.statSync(file("styles/theme.css")).mtimeMs;
      successSpy.mockClear();

      expect(await generateCommand(args, tmp)).toBe(0);

      expect(successSpy).toHaveBeenCalledWith(
        `CSS is up to date: ${path.join("styles", "theme.css")}`,
      );
      expect(fs.statSync(file("styles/theme.css")).mtimeMs).toBe(before);
    });

    it("uses the config's theme and output when no flags are given", async () => {
      write("src/t.json", sampleTheme);
      write("style-gen.config.json", {
        theme: "src/t.json",
        output: "src/t.css",
      });

      expect(await generateCommand({}, tmp)).toBe(0);

      expect(exists("src/t.css")).toBe(true);
    });

    it("warns about a malformed style-gen.config.json and still generates with defaults", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", "{ not json");

      expect(await generateCommand({}, tmp)).toBe(0);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^Ignoring style-gen\.config\.json is not valid JSON .*; using defaults$/,
        ),
      );
      expect(exists("styles/theme.css")).toBe(true);
    });

    it("writes atomically: the output path is only ever produced by renameSync from a sibling temp file", async () => {
      write("styles/theme.json", sampleTheme);
      const outPath = file("styles/theme.css");
      // macOS maps `/var` -> `/private/var`: compare by basename + dir
      // realpath instead of raw string equality.
      const isOutPath = (p: unknown): boolean =>
        typeof p === "string" &&
        path.basename(p) === "theme.css" &&
        fs.realpathSync(path.dirname(p)) ===
          fs.realpathSync(path.dirname(outPath));

      const writeSpy = vi.spyOn(fs, "writeFileSync");
      const renameSpy = vi.spyOn(fs, "renameSync");

      await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(writeSpy.mock.calls.some(([target]) => isOutPath(target))).toBe(
        false,
      );
      expect(renameSpy).toHaveBeenCalledTimes(1);
      const [from, to] = renameSpy.mock.calls[0] ?? [];
      expect(isOutPath(to)).toBe(true);
      expect(path.dirname(String(from))).toBe(path.dirname(String(to)));
      expect(path.basename(String(from))).toMatch(/\.tmp$/);
      expect(fs.existsSync(String(from))).toBe(false);
      expect(read("styles/theme.css")).toMatch(/--sg-color-primary/);
    });

    it("removes the temp file, leaves no partial output and returns 1 when the rename fails", async () => {
      write("styles/theme.json", sampleTheme);
      vi.spyOn(fs, "renameSync").mockImplementation(() => {
        throw new Error("EXDEV: simulated rename failure");
      });

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(fs.readdirSync(file("styles"))).toEqual(["theme.json"]);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(/EXDEV/);
    });

    it("threads extraSources from style-gen.config.json into generate()", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", {
        theme: "styles/theme.json",
        output: "styles/theme.css",
        extraSources: ["hover:bg-{primary,background}"],
      });

      expect(await generateCommand({}, tmp)).toBe(0);

      expect(read("styles/theme.css")).toContain(
        '@source inline("hover:bg-{primary,background}");',
      );
    });

    it("returns 1 with an init hint when the theme file is missing", async () => {
      const code = await generateCommand(
        { theme: "styles/missing.json", out: "out.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /Theme file not found.*\n💡 Run: yarn style-gen init$/s,
      );
      expect(exists("out.css")).toBe(false);
    });

    it("returns 1 when the theme path is a directory", async () => {
      fs.mkdirSync(file("styles"), { recursive: true });

      expect(
        await generateCommand({ theme: "styles", out: "out.css" }, tmp),
      ).toBe(1);
      expect(exists("out.css")).toBe(false);
    });

    it("creates the output directory when missing", async () => {
      write("styles/theme.json", sampleTheme);

      await generateCommand(
        { theme: "styles/theme.json", out: "dist/nested/theme.css" },
        tmp,
      );

      expect(exists("dist/nested/theme.css")).toBe(true);
    });

    it("threads breakpoints from style-gen.config.json into generate()", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", { breakpoints: ["sm", "xl"] });

      await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      // `@theme` always lists every screen, so only the breakpoint-driven
      // output (spacing fallback chains) tells the configured list apart from
      // the `["md", "lg"]` default.
      const content = read("styles/theme.css");
      expect(content).toContain("@media (width >= 640px)");
      expect(content).toContain("--sg-sp-p-sm");
      expect(content).toContain("--sg-sp-p-xl");
      expect(content).not.toContain("--sg-sp-p-md");
      expect(content).not.toContain("--sg-sp-p-lg");
    });

    it("returns 1 without writing output when the theme JSON is malformed", async () => {
      write("styles/theme.json", "not valid json{");

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(/^Invalid JSON in /);
      expect(exists("styles/theme.css")).toBe(false);
    });

    it("returns 1 without writing output when the theme fails validation", async () => {
      write("styles/theme.json", { colors: { primary_x: "#fff" } });

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /^Invalid theme \(.*styles\/theme\.json\):\ncolors\.primary_x → /s,
      );
      expect(exists("styles/theme.css")).toBe(false);
    });

    it("reports an invalid extraSources entry in style-gen.config.json as a config error with its path", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", {
        extraSources: ["bg-primary", "bad;entry"],
      });

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /^Invalid config \(style-gen\.config\.json\):\nextraSources\.1 → /,
      );
      expect(exists("styles/theme.css")).toBe(false);
    });

    it('labels a theme × options conflict (axes.scope "element" with a stale alias) "Invalid theme/options"', async () => {
      write("styles/theme.json", {
        colors: { brand: "#00f", primary: "$brand" },
        themeAxes: { theme: { dark: { colors: { brand: "#0af" } } } },
      });
      write("style-gen.config.json", { axes: { scope: "element" } });

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /^Invalid theme\/options:\nthemeAxes\.theme\.dark\.colors\.brand → /,
      );
      expect(exists("styles/theme.css")).toBe(false);
    });

    it.each([
      ["a misspelled key", { breakpoint: ["xl"] }, /\nbreakpoint → /],
      ["a non-array breakpoints", { breakpoints: "md" }, /\nbreakpoints → /],
    ])(
      "returns 1 without writing output on %s in the config",
      async (_label, config, issue) => {
        write("styles/theme.json", sampleTheme);
        write("style-gen.config.json", config);

        const code = await generateCommand(
          { theme: "styles/theme.json", out: "styles/theme.css" },
          tmp,
        );

        expect(code).toBe(1);
        expect(errorSpy.mock.calls[0]?.[0]).toMatch(
          /^Invalid config \(style-gen\.config\.json\):/,
        );
        expect(errorSpy.mock.calls[0]?.[0]).toMatch(issue);
        expect(exists("styles/theme.css")).toBe(false);
      },
    );
  });

  describe("project root", () => {
    it("accepts a theme outside the project root", async () => {
      const shared = fs.mkdtempSync(
        path.join(os.tmpdir(), "style-gen-generate-shared-"),
      );
      try {
        fs.writeFileSync(
          path.join(shared, "theme.json"),
          JSON.stringify(sampleTheme),
        );

        const code = await generateCommand(
          { theme: path.join(shared, "theme.json"), out: "styles/theme.css" },
          tmp,
        );

        expect(code).toBe(0);
        expect(exists("styles/theme.css")).toBe(true);
      } finally {
        fs.rmSync(shared, { recursive: true, force: true });
      }
    });

    it("refuses an output outside the project root and writes nothing", async () => {
      write("styles/theme.json", sampleTheme);

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "../escaped.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "output escapes project root: ../escaped.css",
      );
      expect(fs.existsSync(path.join(tmp, "..", "escaped.css"))).toBe(false);
    });

    it("treats a leading-slash path as absolute, not project-relative", async () => {
      write("styles/theme.json", sampleTheme);

      const code = await generateCommand(
        { theme: "/styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(exists("styles/theme.css")).toBe(false);
    });
  });

  describe("--watch", () => {
    // chokidar can miss a write made right after `ready`, so an edit is
    // repeated (same content: harmless, the emit is write-if-changed) until
    // its effect shows up instead of sleeping a guessed time.
    const until = (edit: () => void, assertion: () => void): Promise<void> =>
      vi.waitFor(
        () => {
          edit();
          assertion();
        },
        { timeout: 4000, interval: 150 },
      );
    const start = async (
      args: Parameters<typeof generateCommand>[0],
      hooks: Parameters<typeof generateCommand>[2] = {},
    ): Promise<number> =>
      generateCommand({ ...args, watch: true }, tmp, {
        debounceMs: 50,
        onHandle: (handle) => {
          watchHandle = handle;
        },
        ...hooks,
      });

    it(
      "regenerates theme.css when theme.json changes, survives an invalid edit and recovers",
      { timeout: 10_000 },
      async () => {
        write("styles/theme.json", sampleTheme);

        // A genuine chokidar watcher reacting to real fs events.
        const code = await start({
          theme: "styles/theme.json",
          out: "styles/theme.css",
        });
        expect(code).toBe(0);
        expect(read("styles/theme.css")).toMatch(/#3B82F6/);

        await until(
          () => {
            write("styles/theme.json", {
              ...sampleTheme,
              colors: { ...sampleTheme.colors, primary: "#FF0000" },
            });
          },
          () => {
            expect(read("styles/theme.css")).toMatch(/#FF0000/);
          },
        );

        // An invalid edit is logged, keeps the last good output, and
        // watching continues.
        errorSpy.mockClear();
        await until(
          () => {
            write("styles/theme.json", { colors: { primary_x: "#00FF00" } });
          },
          () => {
            expect(errorSpy.mock.calls.map((c) => c[0])).toContainEqual(
              expect.stringMatching(/^Invalid theme /),
            );
          },
        );
        expect(read("styles/theme.css")).toMatch(/#FF0000/);

        await until(
          () => {
            write("styles/theme.json", {
              ...sampleTheme,
              colors: { ...sampleTheme.colors, primary: "#0000FF" },
            });
          },
          () => {
            expect(read("styles/theme.css")).toMatch(/#0000FF/);
          },
        );
      },
    );

    it(
      "reloads style-gen.config.json: a config edit re-emits with the new options",
      { timeout: 10_000 },
      async () => {
        write("styles/theme.json", sampleTheme);
        write("style-gen.config.json", {
          theme: "styles/theme.json",
          output: "styles/theme.css",
        });

        await start({});
        expect(read("styles/theme.css")).not.toContain("hover:bg-primary");

        await until(
          () => {
            write("style-gen.config.json", {
              theme: "styles/theme.json",
              output: "styles/theme.css",
              extraSources: ["hover:bg-primary"],
            });
          },
          () => {
            expect(read("styles/theme.css")).toContain(
              '@source inline("hover:bg-primary");',
            );
          },
        );
      },
    );

    it(
      "watch mode keeps running and keeps the last valid config when the config file becomes invalid (V5-06)",
      { timeout: 15_000 },
      async () => {
        write("styles/theme.json", sampleTheme);
        const validConfig = {
          theme: "styles/theme.json",
          output: "styles/theme.css",
          extraSources: ["hover:bg-primary"],
        };
        write("style-gen.config.json", validConfig);

        expect(await start({})).toBe(0);
        expect(read("styles/theme.css")).toContain(
          '@source inline("hover:bg-primary");',
        );

        // Malformed JSON, then a schema violation: both are reported with
        // their source and neither touches the output.
        errorSpy.mockClear();
        await until(
          () => {
            write("style-gen.config.json", "{ not json");
          },
          () => {
            expect(errorSpy.mock.calls.map((c) => c[0])).toContainEqual(
              expect.stringMatching(
                /^Invalid config \(style-gen\.config\.json\):\nstyle-gen\.config\.json is not valid JSON/,
              ),
            );
          },
        );

        errorSpy.mockClear();
        await until(
          () => {
            write("style-gen.config.json", {
              ...validConfig,
              extraSources: ["bad;entry"],
            });
          },
          () => {
            expect(errorSpy.mock.calls.map((c) => c[0])).toContainEqual(
              expect.stringMatching(
                /^Invalid config \(style-gen\.config\.json\):\nextraSources\.0 → /,
              ),
            );
          },
        );
        expect(read("styles/theme.css")).toContain(
          '@source inline("hover:bg-primary");',
        );

        // The process is still watching: a theme edit regenerates with the
        // LAST VALID config (still carrying extraSources), not the defaults.
        await until(
          () => {
            write("styles/theme.json", {
              ...sampleTheme,
              colors: { ...sampleTheme.colors, primary: "#FF0000" },
            });
          },
          () => {
            expect(read("styles/theme.css")).toMatch(/#FF0000/);
          },
        );
        expect(read("styles/theme.css")).toContain(
          '@source inline("hover:bg-primary");',
        );

        // Fixing the config applies it.
        await until(
          () => {
            write("style-gen.config.json", {
              ...validConfig,
              extraSources: ["hover:bg-background"],
            });
          },
          () => {
            expect(read("styles/theme.css")).toContain(
              '@source inline("hover:bg-background");',
            );
          },
        );
        expect(read("styles/theme.css")).not.toContain("hover:bg-primary");
      },
    );

    it("returns 1 and starts no watcher when the theme cannot be read", async () => {
      const watch = vi.fn();

      const code = await start(
        { theme: "styles/missing.json", out: "out.css" },
        { watch: watch as unknown as WatchThemeOptions["watch"] },
      );

      expect(code).toBe(1);
      expect(watch).not.toHaveBeenCalled();
      expect(watchHandle).toBeUndefined();
    });

    it("returns 1 and starts no watcher when the config is invalid at startup", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", { breakpoint: ["xl"] });
      const watch = vi.fn();

      const code = await start(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        { watch: watch as unknown as WatchThemeOptions["watch"] },
      );

      expect(code).toBe(1);
      expect(watch).not.toHaveBeenCalled();
    });

    it("still starts watching when the first emit fails validation, so the fix is picked up", async () => {
      write("styles/theme.json", { colors: { primary_x: "#fff" } });

      const code = await start({
        theme: "styles/theme.json",
        out: "styles/theme.css",
      });

      expect(code).toBe(0);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(/^Invalid theme /);
      expect(exists("styles/theme.css")).toBe(false);

      await until(
        () => {
          write("styles/theme.json", sampleTheme);
        },
        () => {
          expect(read("styles/theme.css")).toMatch(/#3B82F6/);
        },
      );
    });

    it("watches the config file even when none exists yet, and applies it once created", async () => {
      write("styles/theme.json", sampleTheme);
      let watched: unknown;
      const fakeWatch = ((paths: unknown) => {
        watched = paths;
        return fakeWatcher().watcher;
      }) as unknown as WatchThemeOptions["watch"];

      await start(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        { watch: fakeWatch },
      );

      expect(watched).toEqual([
        path.join(tmp, "styles/theme.json"),
        path.join(tmp, "style-gen.config.json"),
      ]);
    });

    it("close() cancels the pending debounced generation", async () => {
      write("styles/theme.json", sampleTheme);
      const { watcher, emit } = fakeWatcher();
      const fakeWatch = (() =>
        watcher) as unknown as WatchThemeOptions["watch"];

      await start(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        { watch: fakeWatch, debounceMs: 200 },
      );
      fs.rmSync(file("styles/theme.css"));

      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      emit("change", path.join(tmp, "styles/theme.json"));
      const closing = watchHandle?.close();
      vi.advanceTimersByTime(1000);
      vi.useRealTimers();
      await closing;

      expect(exists("styles/theme.css")).toBe(false);
      expect(watcher.close).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * A stand-in for a chokidar watcher: records listeners, reports `ready` on the
 * next tick and lets a test fire events by hand.
 * @returns {{ watcher: object; emit: (event: string, file: string) => void }} The fake and its trigger
 */
function fakeWatcher(): {
  watcher: {
    on: (event: string, cb: (file: string) => void) => unknown;
    once: (event: string, cb: () => void) => unknown;
    add: Mock;
    unwatch: Mock;
    close: Mock;
  };
  emit: (event: string, file: string) => void;
} {
  const listeners = new Map<string, ((file: string) => void)[]>();
  const watcher = {
    on: (event: string, cb: (file: string) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), cb]);
      return watcher;
    },
    once: (event: string, cb: () => void) => {
      if (event === "ready") queueMicrotask(cb);
      return watcher;
    },
    add: vi.fn(),
    unwatch: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
  };
  return {
    watcher,
    emit: (event, file) => {
      for (const cb of listeners.get(event) ?? []) cb(file);
    },
  };
}
