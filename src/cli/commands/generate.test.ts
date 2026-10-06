import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { logger } from "../logger";

import { generateCommand } from "./generate";

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
  let origCwd: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-generate-"));
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("writes theme.css with theme-derived CSS", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    const outPath = path.join(tmp, "styles/theme.css");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    expect(content).toMatch(/--sg-primary/);
    expect(content).toMatch(/@utility h-1 \{/);
    expect(content).toMatch(/shadow-sm/);
  });

  it("warns about a malformed style-gen.config.json and still generates with defaults", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    fs.writeFileSync(path.join(tmp, "style-gen.config.json"), "{ not json");
    const warnSpy = vi
      .spyOn(logger, "warn")
      .mockImplementation(() => undefined);

    generateCommand({});

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Ignoring style-gen\.config\.json is not valid JSON .*; using defaults$/,
      ),
    );
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it("writes atomically: the output path is only ever produced by renameSync from a sibling temp file", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    const outPath = path.join(tmp, "styles/theme.css");
    // `process.chdir(tmp)` + macOS `/var` -> `/private/var` symlink means the
    // command's resolved path may differ textually from `outPath`; compare
    // by basename + dir realpath instead of raw string equality.
    const isOutPath = (p: unknown): boolean =>
      typeof p === "string" &&
      path.basename(p) === "theme.css" &&
      fs.realpathSync(path.dirname(p)) ===
        fs.realpathSync(path.dirname(outPath));

    const writeSpy = vi.spyOn(fs, "writeFileSync");
    const renameSpy = vi.spyOn(fs, "renameSync");

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(writeSpy.mock.calls.some(([target]) => isOutPath(target))).toBe(
      false,
    );
    expect(renameSpy).toHaveBeenCalledTimes(1);
    const [from, to] = renameSpy.mock.calls[0] ?? [];
    expect(isOutPath(to)).toBe(true);
    expect(path.dirname(String(from))).toBe(path.dirname(String(to)));
    expect(path.basename(String(from))).toMatch(/\.tmp$/);
    expect(fs.existsSync(String(from))).toBe(false);
    expect(fs.readFileSync(outPath, "utf8")).toMatch(/--sg-primary/);
  });

  it("removes the temp file and leaves no partial output when the rename fails", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("EXDEV: simulated rename failure");
    });
    vi.spyOn(logger, "error").mockImplementation(() => undefined);

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(fs.readdirSync(path.join(tmp, "styles"))).toEqual(["theme.json"]);
    expect(process.exitCode).toBe(1);
  });

  it("threads extraSources/spacing/typography from style-gen.config.json into generate()", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({
        theme: "styles/theme.json",
        output: "styles/theme.css",
        extraSources: ["hover:bg-{primary,background}"],
      }),
    );

    generateCommand({});

    const content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toContain(
      '@source inline("hover:bg-{primary,background}");',
    );
  });

  it("exits 1 when theme file missing", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);

    expect(() => {
      generateCommand({ theme: "styles/missing.json", out: "out.css" });
    }).toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when theme path is a directory", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);

    expect(() => {
      generateCommand({ theme: "styles", out: "out.css" });
    }).toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("creates output directory if missing", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    generateCommand({
      theme: "styles/theme.json",
      out: "dist/nested/theme.css",
    });

    expect(fs.existsSync(path.join(tmp, "dist/nested/theme.css"))).toBe(true);
  });

  it("threads breakpoints from style-gen.config.json into generate()", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ breakpoints: ["sm", "lg"] }),
    );

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    const content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toMatch(/--breakpoint-sm/);
    expect(content).toMatch(/--breakpoint-lg/);
  });

  it("exits 1 without writing output when the theme JSON is malformed", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "styles/theme.json"), "not valid json{");
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(/^Failed to generate CSS:/);
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(false);
  });

  it("exits 1 without writing output when the theme fails validation", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify({ colors: { primary_x: "#fff" } }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(
      /^Invalid theme \(styles\/theme\.json\):\ncolors\.primary_x → /,
    );
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(false);
  });

  it("reports an invalid extraSources entry in style-gen.config.json as a config error with its path", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ extraSources: ["bg-primary", "bad;entry"] }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(
      /^Invalid config \(style-gen\.config\.json\):\nextraSources\.1 → /,
    );
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(false);
  });

  it("exits 1 on a misspelled config key (breakpoint) without writing output", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ breakpoint: ["xl"] }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(
      /^Invalid config \(style-gen\.config\.json\):\nbreakpoint → /,
    );
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(false);
  });

  it("exits 1 when config breakpoints is not an array", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );
    fs.writeFileSync(
      path.join(tmp, "style-gen.config.json"),
      JSON.stringify({ breakpoints: "md" }),
    );
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    expect(process.exitCode).toBe(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(
      /^Invalid config \(style-gen\.config\.json\):\nbreakpoints → /,
    );
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(false);
  });

  it("watch mode: regenerates theme.css when theme.json changes", async () => {
    // Real delays, not fake timers: this drives a genuine chokidar fs
    // watcher plus the command's own setTimeout debounce, both racing
    // against real OS file-change events — there is no promise/event this
    // test can await instead, and mocking the clock would desync from
    // chokidar's own real-time polling.
    // Repo tsconfig targets ES2022 (no Promise.withResolvers types), so a
    // plain executor is used here instead.
    const delay = (ms: number): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, ms));

    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
      watch: true,
    });

    // Initial (debounced) generation.
    await delay(300);
    expect(fs.existsSync(path.join(tmp, "styles/theme.css"))).toBe(true);

    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify({
        ...sampleTheme,
        colors: { ...sampleTheme.colors, primary: "#FF0000" },
      }),
    );

    await delay(400);
    let content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toMatch(/#FF0000/);

    // An invalid edit is logged, keeps the last good output, does not mark
    // the process failed, and watching continues.
    const errorSpy = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify({ colors: { primary_x: "#00FF00" } }),
    );
    await delay(400);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(/^Invalid theme /);
    expect(process.exitCode).toBeUndefined();
    content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toMatch(/#FF0000/);

    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify({
        ...sampleTheme,
        colors: { ...sampleTheme.colors, primary: "#0000FF" },
      }),
    );
    await delay(400);
    content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toMatch(/#0000FF/);
  });
});
