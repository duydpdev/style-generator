import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
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

describe("styleGenNext", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "style-gen-next-"));
    origCwd = process.cwd();
    process.chdir(tmp);
    __resetForTests();
    vi.mocked(watch).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("throws when themePath escapes the project root", () => {
    expect(() => {
      styleGenNext({ themePath: "../../x" })({})("phase-production-build");
    }).toThrow(/escapes project root/);
  });

  it("throws when outDir escapes the project root", () => {
    writeTheme();
    expect(() => {
      styleGenNext({ themePath: "theme.json", outDir: "/tmp" })({})(
        "phase-production-build",
      );
    }).toThrow(/escapes project root/);
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
    expect(css).toMatch(/--sg-/);
  });

  it("writes theme.css under a custom outDir", () => {
    writeTheme("src/theme.json");

    styleGenNext({ themePath: "src/theme.json", outDir: "dist/styles" })({})(
      "phase-production-build",
    );

    expect(existsSync(join(tmp, "dist/styles/theme.css"))).toBe(true);
  });

  it("throws a formatted error for an invalid theme", () => {
    writeTheme("theme.json", { colors: { primary: "not#a#color;" } });

    expect(() => {
      styleGenNext({ themePath: "theme.json" })({})("phase-production-build");
    }).toThrow(/invalid theme/);
  });

  it("wraps a non-Zod emit failure with the theme path and keeps it as cause", () => {
    const themeAbs = writeTheme();
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
    expect((thrown as Error).message).toContain(themeAbs);
    expect(((thrown as Error).cause as NodeJS.ErrnoException).code).toMatch(
      /^E(EXIST|NOTDIR)$/,
    );
  });

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

    const watcher = vi.mocked(watch).mock.results[0]?.value as EventEmitter;
    writeFileSync(
      themeAbs,
      JSON.stringify({
        ...sampleTheme,
        colors: { ...sampleTheme.colors, primary: "#FF0000" },
      }),
    );
    watcher.emit("change", themeAbs);

    const cssPath = join(tmp, "theme.css");
    vi.advanceTimersByTime(199);
    expect(readFileSync(cssPath, "utf8")).not.toMatch(/#FF0000/);
    vi.advanceTimersByTime(1);
    expect(readFileSync(cssPath, "utf8")).toMatch(/#FF0000/);
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
