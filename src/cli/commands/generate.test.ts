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
  type MockInstance,
} from "vitest";

import { writeTmpFile } from "../../__integration__/__fixtures__/tmpProject";
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
  let errorSpy: MockInstance<typeof logger.error>;
  let successSpy: MockInstance<typeof logger.success>;
  let warnSpy: MockInstance<typeof logger.warn>;

  const file = (rel: string): string => path.join(tmp, rel);
  const write = (rel: string, content: string | object): void => {
    writeTmpFile(tmp, rel, content);
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

  afterEach(() => {
    vi.useRealTimers();
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

    it("threads resetTailwindDefaults from style-gen.config.json into generate()", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", {
        theme: "styles/theme.json",
        output: "styles/theme.css",
        resetTailwindDefaults: ["colors"],
      });

      expect(await generateCommand({}, tmp)).toBe(0);

      expect(read("styles/theme.css")).toContain("--color-*: initial;");
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

    it("reports the removed extraSources key in style-gen.config.json as an unknown config key", async () => {
      write("styles/theme.json", sampleTheme);
      write("style-gen.config.json", {
        extraSources: ["bg-primary"],
      });

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /^Invalid config \(style-gen\.config\.json\):\nextraSources → Unrecognized key/,
      );
      expect(exists("styles/theme.css")).toBe(false);
    });

    it('labels a theme × options conflict (resetTailwindDefaults "shadow" without shadows) "Invalid theme/options"', async () => {
      write("styles/theme.json", { colors: { primary: "#3B82F6" } });
      write("style-gen.config.json", { resetTailwindDefaults: ["shadow"] });

      const code = await generateCommand(
        { theme: "styles/theme.json", out: "styles/theme.css" },
        tmp,
      );

      expect(code).toBe(1);
      expect(errorSpy.mock.calls[0]?.[0]).toMatch(
        /^Invalid theme\/options:\nresetTailwindDefaults\.0 → /,
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
});
