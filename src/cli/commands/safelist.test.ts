import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { safelistCommand } from "./safelist";

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

describe("safelistCommand", () => {
  let tmp: string;
  let origCwd: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-safelist-"));
    origCwd = process.cwd();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(origCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes safelist.txt with theme-derived classes", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    safelistCommand({
      theme: "styles/theme.json",
      out: "styles/safelist.txt",
    });

    const outPath = path.join(tmp, "styles/safelist.txt");
    expect(fs.existsSync(outPath)).toBe(true);

    const content = fs.readFileSync(outPath, "utf8");
    const classes = content.split("\n").filter(Boolean);
    expect(classes.length).toBeGreaterThan(0);
    // Typography keys are h1, h2, ... — toKebabCase("h1") === "h-1"
    expect(classes).toContain("h-1");
    expect(classes).toContain("shadow-sm");
  });

  it("exits 1 when theme file missing", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);

    expect(() => {
      safelistCommand({ theme: "styles/missing.json", out: "out.txt" });
    }).toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits 1 when theme path is a directory", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });

    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("__exit__");
    }) as never);

    expect(() => {
      safelistCommand({ theme: "styles", out: "out.txt" });
    }).toThrow("__exit__");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("creates output directory if missing", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    safelistCommand({
      theme: "styles/theme.json",
      out: "dist/nested/safelist.txt",
    });

    expect(fs.existsSync(path.join(tmp, "dist/nested/safelist.txt"))).toBe(
      true,
    );
  });

  it("passes breakpoints and responsiveModules from args", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "styles/theme.json"),
      JSON.stringify(sampleTheme),
    );

    safelistCommand({
      theme: "styles/theme.json",
      out: "styles/safelist.txt",
      breakpoints: "sm,lg",
      responsiveModules: "layout,rounded",
    });

    const content = fs.readFileSync(
      path.join(tmp, "styles/safelist.txt"),
      "utf8",
    );
    const classes = content.split("\n").filter(Boolean);
    expect(classes).toContain("sm:hidden");
    expect(classes).toContain("lg:hidden");
  });

  it("handles malformed theme JSON gracefully", () => {
    fs.mkdirSync(path.join(tmp, "styles"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "styles/theme.json"), "not valid json{");

    // Should not throw — logs error internally
    expect(() => {
      safelistCommand({
        theme: "styles/theme.json",
        out: "styles/safelist.txt",
      });
    }).not.toThrow();
  });
});
