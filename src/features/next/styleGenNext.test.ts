import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { watch } from "chokidar";

// A fake watcher per `watch()` call: this suite proves the singleton and the
// change → debounced re-emit wiring. chokidar's `ready` fires before macOS
// arms the kqueue watch, so a real-fs write right after it can be lost; real
// fs delivery is covered by the CLI watch test in `generate.test.ts`.
vi.mock("chokidar", () => ({
  watch: vi.fn(() =>
    Object.assign(new EventEmitter(), {
      add: vi.fn(),
      unwatch: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    }),
  ),
}));

import { writeTmpFile } from "../../__integration__/__fixtures__/tmpProject";

import { styleGenNext, __resetForTests } from "./styleGenNext";

const sampleTheme = {
  colors: { primary: "#3B82F6", background: "#FFFFFF", foreground: "#111827" },
  typography: {
    body: {
      fontSize: "16px",
      lineHeight: "1.5",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
};

interface FakeWatcher extends EventEmitter {
  close: ReturnType<typeof vi.fn>;
}

/**
 * The fake watcher returned by the n-th `watch()` call.
 * @param {number} index - Zero-based call index
 * @returns {FakeWatcher} The fake chokidar watcher
 */
const watcherAt = (index: number): FakeWatcher =>
  vi.mocked(watch).mock.results[index]?.value as FakeWatcher;

describe("styleGenNext", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    // realpath: `process.cwd()` is the resolved path (macOS /var → /private/var).
    tmp = realpathSync(mkdtempSync(join(tmpdir(), "style-gen-next-")));
    origCwd = process.cwd();
    process.chdir(tmp);
    __resetForTests();
    vi.mocked(watch).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    __resetForTests();
    process.chdir(origCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  const writeTheme = (
    relPath = "theme.json",
    theme: object = sampleTheme,
  ): string => {
    return writeTmpFile(tmp, relPath, theme);
  };

  /**
   * Write `style-gen.config.json`: `theme.json` and `theme.css` in the project
   * root, plus `extra`.
   * @param {object} extra - Config keys that override or add to the default
   * @returns {string} Absolute path of the config file
   */
  const writeConfig = (extra: object = {}): string =>
    writeTmpFile(tmp, "style-gen.config.json", {
      theme: "theme.json",
      output: "theme.css",
      ...extra,
    });

  const project = (extra: object = {}): void => {
    writeTheme();
    writeConfig(extra);
  };

  it("emits from a theme outside the project (monorepo-shared theme)", () => {
    writeTheme("shared/theme.json");
    const app = join(tmp, "packages/app");
    mkdirSync(app, { recursive: true });
    writeFileSync(
      join(app, "style-gen.config.json"),
      JSON.stringify({
        theme: "../../shared/theme.json",
        output: "styles/theme.css",
      }),
    );
    process.chdir(app);

    styleGenNext()({})("phase-production-build");

    expect(existsSync(join(app, "styles/theme.css"))).toBe(true);
  });

  it("throws when output escapes the project root", () => {
    project({ output: "../escape.css" });
    expect(() => {
      styleGenNext()({})("phase-production-build");
    }).toThrow(/\[style-gen-next\] output escapes project root/);
  });

  it("rejects the removed 7.x options when the wrapper is created, naming the key and the migration guide", () => {
    for (const removed of ["themePath", "outDir", "options"]) {
      expect(() => styleGenNext({ [removed]: "x" } as never)).toThrow(
        new RegExp(
          `^\\[style-gen-next\\] Invalid options:\\n[^]*${removed}[^]*7\\.x-to-8\\.0`,
        ),
      );
    }
    expect(() => styleGenNext({ root: "" })).toThrow(
      /^\[style-gen-next\] Invalid options:\n[^]*root/,
    );
  });

  it("writes theme.css and theme.tokens.ts and passes the Next config through unchanged", () => {
    project();
    const nextConfig = { reactStrictMode: true };

    const result = styleGenNext()(nextConfig)("phase-production-build");

    expect(result).toBe(nextConfig);
    const cssPath = join(tmp, "theme.css");
    expect(existsSync(cssPath)).toBe(true);
    const css = readFileSync(cssPath, "utf8");
    expect(css.length).toBeGreaterThan(0);
    expect(css).toMatch(/--sg-color-/);
    expect(existsSync(join(tmp, "theme.tokens.ts"))).toBe(true);
  });

  it("writes theme.css under a custom output", () => {
    writeTheme("src/theme.json");
    writeConfig({ theme: "src/theme.json", output: "dist/styles/theme.css" });

    styleGenNext()({})("phase-production-build");

    expect(existsSync(join(tmp, "dist/styles/theme.css"))).toBe(true);
  });

  it("does not rewrite theme.css when a second evaluation produces the same CSS", () => {
    project();
    const wrapped = styleGenNext()({});
    wrapped("phase-production-build");
    const first = statSync(join(tmp, "theme.css")).ino;

    wrapped("phase-production-build");

    // writeFileAtomic renames a fresh file into place: an unchanged emit keeps the inode.
    expect(statSync(join(tmp, "theme.css")).ino).toBe(first);
  });

  it("throws the staged message for an invalid theme", () => {
    const themeAbs = writeTheme("theme.json", {
      colors: { primary: "not#a#color;" },
    });
    writeConfig();

    expect(() => {
      styleGenNext()({})("phase-production-build");
    }).toThrow(`[style-gen-next] Invalid theme (${themeAbs}):`);
  });

  it("labels a bad option as an invalid config, not as an invalid theme", () => {
    project({ breakpoints: ["nope"] });

    expect(() => {
      styleGenNext()({})("phase-production-build");
    }).toThrow(
      /^\[style-gen-next\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoints\.0/,
    );
  });

  it("names the missing theme file", () => {
    writeConfig({ theme: "missing.json" });
    expect(() => {
      styleGenNext()({})("phase-production-build");
    }).toThrow(/Theme file not found: .*missing\.json/);
  });

  it("wraps a write failure with the output path and keeps it as cause", () => {
    project({ output: "blocked/theme.css" });
    // The output folder is an existing file → mkdirSync throws ENOTDIR/EEXIST, not a ZodError.
    writeFileSync(join(tmp, "blocked"), "", "utf8");
    let thrown: unknown;
    try {
      styleGenNext()({})("phase-production-build");
    } catch (caught) {
      thrown = caught;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain(
      `Cannot write ${join(tmp, "blocked/theme.css")}`,
    );
    expect(((thrown as Error).cause as NodeJS.ErrnoException).code).toMatch(
      /^E(EXIST|NOTDIR)$/,
    );
  });

  describe("root option", () => {
    it("reads the config from a folder below process.cwd()", () => {
      writeTheme("app/theme.json");
      writeTmpFile(tmp, "app/style-gen.config.json", {
        theme: "theme.json",
        output: "theme.css",
      });

      styleGenNext({ root: "app" })({})("phase-production-build");

      expect(existsSync(join(tmp, "app/theme.css"))).toBe(true);
    });

    it("accepts an absolute root", () => {
      writeTheme("app/theme.json");
      writeTmpFile(tmp, "app/style-gen.config.json", {
        theme: "theme.json",
        output: "theme.css",
      });
      const elsewhere = join(tmp, "elsewhere");
      mkdirSync(elsewhere);
      process.chdir(elsewhere);

      styleGenNext({ root: join(tmp, "app") })({})("phase-production-build");

      expect(existsSync(join(tmp, "app/theme.css"))).toBe(true);
    });
  });

  describe("dev watcher", () => {
    it("does not start a watcher outside phase-development-server", () => {
      project();

      styleGenNext()({})("phase-production-build");

      expect(watch).not.toHaveBeenCalled();
    });

    it("starts exactly one chokidar watcher even when Next evaluates the config twice", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      project();
      const themeAbs = join(tmp, "theme.json");
      const wrap = styleGenNext();

      // Simulate Next evaluating next.config.* more than once in the same
      // process (phase detection pass, then the real dev-server pass).
      wrap({})("phase-development-server");
      wrap({})("phase-development-server");

      expect(watch).toHaveBeenCalledTimes(1);
      expect(vi.mocked(watch).mock.calls[0]?.[1]).toMatchObject({
        persistent: false,
      });

      writeFileSync(
        themeAbs,
        JSON.stringify({
          ...sampleTheme,
          colors: { ...sampleTheme.colors, primary: "#FF0000" },
        }),
      );
      watcherAt(0).emit("change", themeAbs);

      const cssPath = join(tmp, "theme.css");
      vi.advanceTimersByTime(199);
      expect(readFileSync(cssPath, "utf8")).not.toMatch(/#FF0000/);
      vi.advanceTimersByTime(1);
      expect(readFileSync(cssPath, "utf8")).toMatch(/#FF0000/);
    });

    it("closes the old watcher and starts a new one when the theme path changes", () => {
      writeTheme("a.json");
      writeTheme("b.json");

      writeConfig({ theme: "a.json" });
      styleGenNext()({})("phase-development-server");
      writeConfig({ theme: "b.json" });
      styleGenNext()({})("phase-development-server");

      expect(watch).toHaveBeenCalledTimes(2);
      expect(watcherAt(0).close).toHaveBeenCalledOnce();
      expect(watcherAt(1).close).not.toHaveBeenCalled();
      expect(vi.mocked(watch).mock.calls[1]?.[0]).toEqual([
        join(tmp, "b.json"),
        join(tmp, "style-gen.config.json"),
      ]);
    });

    it("replaces the watcher when the same paths come back with other options", () => {
      project();
      styleGenNext()({})("phase-development-server");
      writeConfig({ enableResponsive: false });
      styleGenNext()({})("phase-development-server");

      expect(watch).toHaveBeenCalledTimes(2);
      expect(watcherAt(0).close).toHaveBeenCalledOnce();
      expect(watcherAt(1).close).not.toHaveBeenCalled();
    });

    it("keeps the watcher when the same paths and equal options come back", () => {
      project({ enableResponsive: false });
      styleGenNext()({})("phase-development-server");
      writeConfig({ enableResponsive: false });
      styleGenNext()({})("phase-development-server");

      expect(watch).toHaveBeenCalledOnce();
    });

    it("does not surface a failure while closing the replaced watcher", () => {
      writeTheme("a.json");
      writeTheme("b.json");
      writeConfig({ theme: "a.json" });
      styleGenNext()({})("phase-development-server");
      watcherAt(0).close.mockRejectedValueOnce(new Error("close failed"));

      writeConfig({ theme: "b.json" });
      expect(() => {
        styleGenNext()({})("phase-development-server");
      }).not.toThrow();
    });

    it("logs a failed re-emit and keeps the watcher running", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const error = vi.spyOn(console, "error").mockReturnValue(undefined);
      project();
      const themeAbs = join(tmp, "theme.json");
      styleGenNext()({})("phase-development-server");

      writeFileSync(themeAbs, "{ not valid json");
      watcherAt(0).emit("change", themeAbs);
      vi.advanceTimersByTime(200);

      expect(error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[style-gen-next\] Re-emit failed:\nInvalid JSON in /,
        ),
      );
      expect(watcherAt(0).close).not.toHaveBeenCalled();
    });

    it("logs a watcher error instead of throwing it", () => {
      const error = vi.spyOn(console, "error").mockReturnValue(undefined);
      project();
      styleGenNext()({})("phase-development-server");

      expect(() =>
        watcherAt(0).emit("error", new Error("EMFILE")),
      ).not.toThrow();

      expect(error).toHaveBeenCalledWith(
        expect.stringMatching(/Re-emit failed:\nWatcher error: EMFILE/),
      );
    });

    describe("config edits", () => {
      it("watches the config file next to the theme", () => {
        const configAbs = writeConfig();
        writeTheme();

        styleGenNext()({})("phase-development-server");

        expect(vi.mocked(watch).mock.calls[0]?.[0]).toEqual([
          join(tmp, "theme.json"),
          configAbs,
        ]);
      });

      it("re-emits with the edited options and output, keeping the same watcher", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        project();
        const configAbs = join(tmp, "style-gen.config.json");
        styleGenNext()({})("phase-development-server");

        writeConfig({
          output: "gen/theme.css",
          resetTailwindDefaults: ["colors"],
        });
        watcherAt(0).emit("change", configAbs);
        vi.advanceTimersByTime(200);

        expect(readFileSync(join(tmp, "gen/theme.css"), "utf8")).toContain(
          "--color-*: initial;",
        );
        expect(existsSync(join(tmp, "gen/theme.tokens.ts"))).toBe(true);
        expect(watch).toHaveBeenCalledOnce();
        expect(watcherAt(0).close).not.toHaveBeenCalled();
      });

      it("keeps the last valid config and logs when the edited config is invalid", () => {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        const error = vi.spyOn(console, "error").mockReturnValue(undefined);
        project();
        const configAbs = join(tmp, "style-gen.config.json");
        styleGenNext()({})("phase-development-server");

        writeFileSync(configAbs, JSON.stringify({ breakpoint: ["xl"] }));
        watcherAt(0).emit("change", configAbs);
        vi.advanceTimersByTime(200);

        expect(error).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[style-gen-next\] Re-emit failed:\nInvalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
          ),
        );
        expect(existsSync(join(tmp, "styles"))).toBe(false);
      });
    });
  });

  describe("no config file edits needed for the defaults", () => {
    const writeRawConfig = (config: unknown) => {
      writeFileSync(
        join(tmp, "style-gen.config.json"),
        JSON.stringify(config),
        "utf8",
      );
    };

    it("takes theme and output from style-gen.config.json", () => {
      writeTheme("design/tokens.json");
      writeRawConfig({ theme: "design/tokens.json", output: "gen/out.css" });

      styleGenNext()({})("phase-production-build");

      expect(existsSync(join(tmp, "gen/out.css"))).toBe(true);
    });

    it("passes options from the config file to generate()", () => {
      writeTheme("styles/theme.json");
      writeRawConfig({ resetTailwindDefaults: ["colors"] });

      styleGenNext()({})("phase-production-build");

      const css = readFileSync(join(tmp, "styles/theme.css"), "utf8");
      expect(css).toContain("--color-*: initial;");
    });

    it("starts the dev watcher on the configured theme", () => {
      writeTheme("design/tokens.json");
      writeRawConfig({ theme: "design/tokens.json", output: "gen/out.css" });

      styleGenNext()({})("phase-development-server");

      expect(vi.mocked(watch).mock.calls[0]?.[0]).toEqual([
        join(tmp, "design/tokens.json"),
        join(tmp, "style-gen.config.json"),
      ]);
    });

    it("throws a labelled error for a config that violates the schema (no silent defaults)", () => {
      writeTheme("styles/theme.json");
      writeRawConfig({ breakpoint: ["xl"] });

      expect(() => {
        styleGenNext()({})("phase-production-build");
      }).toThrow(
        /\[style-gen-next\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
      );
      expect(existsSync(join(tmp, "styles/theme.css"))).toBe(false);
    });

    it("does not read the config outside the emitting phases", () => {
      writeRawConfig({ breakpoint: ["xl"] });

      expect(() => {
        styleGenNext()({})("phase-production-server");
      }).not.toThrow();
    });
  });

  describe("phase gating (X-08)", () => {
    it.each(["phase-development-server", "phase-production-build"])(
      "emits theme.css in %s",
      (phase) => {
        project();
        styleGenNext()({})(phase);
        expect(existsSync(join(tmp, "theme.css"))).toBe(true);
      },
    );

    it.each([
      "phase-production-server",
      "phase-export",
      "phase-info",
      "phase-test",
    ])("returns the config untouched and writes nothing in %s", (phase) => {
      project();
      const nextConfig = { reactStrictMode: true };
      const result = styleGenNext()(nextConfig)(phase);
      expect(result).toBe(nextConfig);
      expect(existsSync(join(tmp, "theme.css"))).toBe(false);
    });

    it("does not throw on a missing theme file during phase-production-server", () => {
      writeConfig({ theme: "missing.json" });
      expect(() => styleGenNext()({})("phase-production-server")).not.toThrow();
    });

    it("calls a function-form config with the phase and Next's context and returns its result", () => {
      project();
      const ctx = { defaultConfig: { poweredByHeader: true } };
      const fn = vi.fn((_phase: string, c: typeof ctx) => ({
        poweredByHeader: !c.defaultConfig.poweredByHeader,
      }));
      const result = styleGenNext()(fn)("phase-production-build", ctx);
      expect(fn).toHaveBeenCalledWith("phase-production-build", ctx);
      expect(result).toEqual({ poweredByHeader: false });
      expect(existsSync(join(tmp, "theme.css"))).toBe(true);
    });
  });
});
