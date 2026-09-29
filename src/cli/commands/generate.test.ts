import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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

  it("writes atomically: no leftover .tmp files remain in the output directory", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
    });

    const entries = fs.readdirSync(path.join(tmp, "styles"));
    expect(entries).toEqual(["theme.css", "theme.json"]);
    expect(entries.some((name) => name.endsWith(".tmp"))).toBe(false);
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

  it("passes breakpoints from args", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    generateCommand({
      theme: "styles/theme.json",
      out: "styles/theme.css",
      breakpoints: "sm,lg",
    });

    const content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toMatch(/--breakpoint-sm/);
    expect(content).toMatch(/--breakpoint-lg/);
  });

  it("handles malformed theme JSON gracefully", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "styles/theme.json"), "not valid json{");

    // Should not throw — logs error internally
    expect(() => {
      generateCommand({
        theme: "styles/theme.json",
        out: "styles/theme.css",
      });
    }).not.toThrow();
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
    const content = fs.readFileSync(path.join(tmp, "styles/theme.css"), "utf8");
    expect(content).toMatch(/#FF0000/);
  });
});
