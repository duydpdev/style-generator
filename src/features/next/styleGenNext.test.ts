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
import { dirname, join } from "node:path";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { watch } from "chokidar";

// A fake watcher per `watch()` call: this suite proves the singleton and the
// change → debounced re-emit wiring. chokidar's `ready` fires before macOS
// arms the kqueue watch, so a real-fs write right after it can be lost; real
// fs delivery is covered by the CLI watch test in `generate.test.ts`.
vi.mock("chokidar", () => ({
  watch: vi.fn(() =>
    Object.assign(new EventEmitter(), {
      close: vi.fn(() => Promise.resolve()),
    }),
  ),
}));

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
    theme: unknown = sampleTheme,
  ): string => {
    const abs = join(tmp, relPath);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(theme), "utf8");
    return abs;
  };

  it("emits from a themePath outside the project (monorepo-shared theme)", () => {
    writeTheme("shared/theme.json");
    const project = join(tmp, "packages/app");
    mkdirSync(project, { recursive: true });
    process.chdir(project);

    styleGenNext({ themePath: "../../shared/theme.json", outDir: "styles" })(
      {},
    )("phase-production-build");

    expect(existsSync(join(project, "styles/theme.css"))).toBe(true);
  });

  it("throws when outDir escapes the project root", () => {
    writeTheme();
    expect(() => {
      styleGenNext({ themePath: "theme.json", outDir: "/tmp" })({})(
        "phase-production-build",
      );
    }).toThrow(/outDir escapes project root/);
  });

  it("rejects an unknown option key and a missing themePath with a labelled message", () => {
    expect(() => {
      styleGenNext({ themePath: "theme.json", outdir: "gen" } as never)({})(
        "phase-production-build",
      );
    }).toThrow(/^\[style-gen-next\] Invalid options:\n.*outdir/);
    expect(() => {
      styleGenNext({ themepath: "theme.json" } as never)({})(
        "phase-production-build",
      );
    }).toThrow(/^\[style-gen-next\] Invalid options:\n[^]*themePath/);
  });

  it("writes theme.css and passes the Next config through unchanged", () => {
    writeTheme();
    const nextConfig = { reactStrictMode: true };

    const result = styleGenNext({ themePath: "theme.json" })(nextConfig)(
      "phase-production-build",
    );

    expect(result).toBe(nextConfig);
    const cssPath = join(tmp, "theme.css");
    expect(existsSync(cssPath)).toBe(true);
    const css = readFileSync(cssPath, "utf8");
    expect(css.length).toBeGreaterThan(0);
    expect(css).toMatch(/--sg-color-/);
  });

  it("writes theme.css under a custom outDir", () => {
    writeTheme("src/theme.json");

    styleGenNext({ themePath: "src/theme.json", outDir: "dist/styles" })({})(
      "phase-production-build",
    );

    expect(existsSync(join(tmp, "dist/styles/theme.css"))).toBe(true);
  });

  it("does not rewrite theme.css when a second evaluation produces the same CSS", () => {
    writeTheme();
    const wrapped = styleGenNext({ themePath: "theme.json" })({});
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

    expect(() => {
      styleGenNext({ themePath: "theme.json" })({})("phase-production-build");
    }).toThrow(`[style-gen-next] Invalid theme (${themeAbs}):`);
  });

  it("labels an options error as 'Invalid options', not as an invalid theme", () => {
    writeTheme();

    expect(() => {
      styleGenNext({
        themePath: "theme.json",
        options: { breakpoints: ["nope"] },
      })({})("phase-production-build");
    }).toThrow(/Invalid options:/);
  });

  it("names the missing theme file", () => {
    expect(() => {
      styleGenNext({ themePath: "missing.json" })({})("phase-production-build");
    }).toThrow(/Theme file not found: .*missing\.json/);
  });

  it("wraps a write failure with the output path and keeps it as cause", () => {
    writeTheme();
    // outDir is an existing file → mkdirSync throws ENOTDIR/EEXIST, not a ZodError.
    writeFileSync(join(tmp, "blocked"), "", "utf8");
    let thrown: unknown;
    try {
      styleGenNext({ themePath: "theme.json", outDir: "blocked" })({})(
        "phase-production-build",
      );
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

  describe("dev watcher", () => {
    it("does not start a watcher outside phase-development-server", () => {
      writeTheme();

      styleGenNext({ themePath: "theme.json" })({})("phase-production-build");

      expect(watch).not.toHaveBeenCalled();
    });

    it("starts exactly one chokidar watcher even when Next evaluates the config twice", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const themeAbs = writeTheme();
      const wrap = styleGenNext({ themePath: "theme.json" });

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

      styleGenNext({ themePath: "a.json" })({})("phase-development-server");
      styleGenNext({ themePath: "b.json" })({})("phase-development-server");

      expect(watch).toHaveBeenCalledTimes(2);
      expect(watcherAt(0).close).toHaveBeenCalledOnce();
      expect(watcherAt(1).close).not.toHaveBeenCalled();
      expect(vi.mocked(watch).mock.calls[1]?.[0]).toBe(join(tmp, "b.json"));
    });

    it("replaces the watcher when the same paths come back with other options", () => {
      writeTheme();
      styleGenNext({ themePath: "theme.json" })({})("phase-development-server");
      styleGenNext({
        themePath: "theme.json",
        options: { enableResponsive: false },
      })({})("phase-development-server");

      expect(watch).toHaveBeenCalledTimes(2);
      expect(watcherAt(0).close).toHaveBeenCalledOnce();
      expect(watcherAt(1).close).not.toHaveBeenCalled();
    });

    it("keeps the watcher when the same paths and equal options come back", () => {
      writeTheme();
      const opts = {
        themePath: "theme.json",
        options: { enableResponsive: false },
      };
      styleGenNext(opts)({})("phase-development-server");
      styleGenNext({ ...opts, options: { enableResponsive: false } })({})(
        "phase-development-server",
      );

      expect(watch).toHaveBeenCalledOnce();
    });

    it("does not surface a failure while closing the replaced watcher", () => {
      writeTheme("a.json");
      writeTheme("b.json");
      styleGenNext({ themePath: "a.json" })({})("phase-development-server");
      watcherAt(0).close.mockRejectedValueOnce(new Error("close failed"));

      expect(() => {
        styleGenNext({ themePath: "b.json" })({})("phase-development-server");
      }).not.toThrow();
    });

    it("logs a failed re-emit and keeps the watcher running", () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const error = vi.spyOn(console, "error").mockReturnValue(undefined);
      const themeAbs = writeTheme();
      styleGenNext({ themePath: "theme.json" })({})("phase-development-server");

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
      writeTheme();
      styleGenNext({ themePath: "theme.json" })({})("phase-development-server");

      expect(() =>
        watcherAt(0).emit("error", new Error("EMFILE")),
      ).not.toThrow();

      expect(error).toHaveBeenCalledWith(
        expect.stringMatching(/Re-emit failed:\nWatcher error: EMFILE/),
      );
    });
  });

  describe("no-argument form reads the config file", () => {
    const writeConfig = (config: unknown) => {
      writeFileSync(
        join(tmp, "style-gen.config.json"),
        JSON.stringify(config),
        "utf8",
      );
    };

    it("takes theme and output from style-gen.config.json", () => {
      writeTheme("design/tokens.json");
      writeConfig({ theme: "design/tokens.json", output: "gen/out.css" });

      styleGenNext()({})("phase-production-build");

      expect(existsSync(join(tmp, "gen/out.css"))).toBe(true);
    });

    it("passes axes from the config file to generate() (V5 go/no-go)", () => {
      writeTheme("styles/theme.json", {
        ...sampleTheme,
        themeAxes: { theme: { dark: { colors: { primary: "#000000" } } } },
      });
      writeConfig({ axes: { attribute: { theme: "data-mode" } } });

      styleGenNext()({})("phase-production-build");

      const css = readFileSync(join(tmp, "styles/theme.css"), "utf8");
      expect(css).toContain('html[data-mode="dark"]');
    });

    it("starts the dev watcher on the configured theme", () => {
      writeTheme("design/tokens.json");
      writeConfig({ theme: "design/tokens.json", output: "gen/out.css" });

      styleGenNext()({})("phase-development-server");

      expect(vi.mocked(watch).mock.calls[0]?.[0]).toBe(
        join(tmp, "design/tokens.json"),
      );
    });

    it("throws a labelled error for a config that violates the schema (no silent defaults)", () => {
      writeTheme("styles/theme.json");
      writeConfig({ breakpoint: ["xl"] });

      expect(() => {
        styleGenNext()({})("phase-production-build");
      }).toThrow(
        /\[style-gen-next\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
      );
      expect(existsSync(join(tmp, "styles/theme.css"))).toBe(false);
    });

    it("does not read the config outside the emitting phases", () => {
      writeConfig({ breakpoint: ["xl"] });

      expect(() => {
        styleGenNext()({})("phase-production-server");
      }).not.toThrow();
    });
  });

  describe("phase gating (X-08)", () => {
    it.each(["phase-development-server", "phase-production-build"])(
      "emits theme.css in %s",
      (phase) => {
        writeTheme();
        styleGenNext({ themePath: "theme.json" })({})(phase);
        expect(existsSync(join(tmp, "theme.css"))).toBe(true);
      },
    );

    it.each([
      "phase-production-server",
      "phase-export",
      "phase-info",
      "phase-test",
    ])("returns the config untouched and writes nothing in %s", (phase) => {
      writeTheme();
      const nextConfig = { reactStrictMode: true };
      const result = styleGenNext({ themePath: "theme.json" })(nextConfig)(
        phase,
      );
      expect(result).toBe(nextConfig);
      expect(existsSync(join(tmp, "theme.css"))).toBe(false);
    });

    it("does not throw on a missing theme file during phase-production-server", () => {
      expect(() =>
        styleGenNext({ themePath: "missing.json" })({})(
          "phase-production-server",
        ),
      ).not.toThrow();
    });

    it("calls a function-form config with the phase and Next's context and returns its result", () => {
      writeTheme();
      const ctx = { defaultConfig: { poweredByHeader: true } };
      const fn = vi.fn((_phase: string, c: typeof ctx) => ({
        poweredByHeader: !c.defaultConfig.poweredByHeader,
      }));
      const result = styleGenNext({ themePath: "theme.json" })(fn)(
        "phase-production-build",
        ctx,
      );
      expect(fn).toHaveBeenCalledWith("phase-production-build", ctx);
      expect(result).toEqual({ poweredByHeader: false });
      expect(existsSync(join(tmp, "theme.css"))).toBe(true);
    });
  });
});
