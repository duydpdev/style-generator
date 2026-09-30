import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { watch } from "chokidar";
import type * as ChokidarModule from "chokidar";

vi.mock("chokidar", async (importOriginal) => {
  const actual = await importOriginal<typeof ChokidarModule>();
  return { ...actual, watch: vi.fn(actual.watch) };
});

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

// Real delay, not a fake-timer advance: this awaits a genuine chokidar fs
// watcher (real OS file-change events), so there is no deterministic hook
// to await instead. Plain executor, not `Promise.withResolvers()` — repo
// tsconfig targets ES2022, which has no types for it.
const delay = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

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

  it("does not start a watcher outside phase-development-server", () => {
    writeTheme();

    styleGenNext({ themePath: "theme.json" })({})("phase-production-build");

    expect(watch).not.toHaveBeenCalled();
  });

  it("starts exactly one chokidar watcher even when Next evaluates the config twice", async () => {
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

    // Real delays: let the just-started watcher finish attaching before the
    // write (native watch handles need a tick to subscribe), then give the
    // debounced re-emit real wall-clock time to land — proves the single
    // surviving watcher still reacts to a genuine fs event, racing against
    // chokidar's own real-time polling with no promise/event this test
    // could await instead.
    await delay(200);
    writeFileSync(
      themeAbs,
      JSON.stringify({
        ...sampleTheme,
        colors: { ...sampleTheme.colors, primary: "#FF0000" },
      }),
    );
    await delay(800);

    const css = readFileSync(join(tmp, "theme.css"), "utf8");
    expect(css).toMatch(/#FF0000/);
  });
});
