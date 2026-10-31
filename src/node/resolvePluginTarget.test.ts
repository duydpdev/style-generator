import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolvePluginTarget } from "./resolvePluginTarget";

describe("resolvePluginTarget", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "style-gen-target-")));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe("with options", () => {
    it("writes theme.css next to the theme by default", () => {
      expect(
        resolvePluginTarget(root, { themePath: "src/theme.json" }, "x"),
      ).toEqual({
        themeFile: join(root, "src/theme.json"),
        outFile: join(root, "src/theme.css"),
        options: {},
      });
    });

    it("writes theme.css under outDir and forwards the generator options", () => {
      const options = { enableResponsive: false };
      expect(
        resolvePluginTarget(
          root,
          { themePath: "theme.json", outDir: "gen", options },
          "x",
        ),
      ).toMatchObject({ outFile: join(root, "gen/theme.css"), options });
    });

    it("allows a theme outside the root but not an outDir outside it", () => {
      const project = join(root, "app");
      mkdirSync(project);

      expect(
        resolvePluginTarget(
          project,
          { themePath: "../theme.json", outDir: "styles" },
          "x",
        ).themeFile,
      ).toBe(join(root, "theme.json"));
      expect(() =>
        resolvePluginTarget(
          project,
          { themePath: "theme.json", outDir: ".." },
          "my-plugin",
        ),
      ).toThrow("[my-plugin] outDir escapes project root: ..");
    });

    it("explains that an inherited outDir (theme outside the root, no outDir) is the problem", () => {
      const project = join(root, "app");
      mkdirSync(project);

      expect(() =>
        resolvePluginTarget(
          project,
          { themePath: "../shared/theme.json" },
          "my-plugin",
        ),
      ).toThrow(
        "[my-plugin] outDir (defaults to dirname(themePath); set outDir inside the project root) escapes project root: ../shared",
      );
    });

    it("rejects an unknown key (a typo is not silently ignored) with a labelled message", () => {
      expect(() =>
        resolvePluginTarget(
          root,
          { themePath: "theme.json", outdir: "gen" } as never,
          "my-plugin",
        ),
      ).toThrow(/^\[my-plugin\] Invalid options:\n.*outdir/);
    });

    it("rejects a missing themePath with a labelled message instead of Node's path TypeError", () => {
      expect(() =>
        resolvePluginTarget(root, { themepath: "theme.json" } as never, "x"),
      ).toThrow(/^\[x\] Invalid options:\n[^]*themePath/);
    });

    it("rejects an empty themePath and an empty outDir", () => {
      expect(() => resolvePluginTarget(root, { themePath: "" }, "x")).toThrow(
        /Invalid options:\n.*themePath/,
      );
      expect(() =>
        resolvePluginTarget(root, { themePath: "t.json", outDir: "" }, "x"),
      ).toThrow(/Invalid options:\n.*outDir/);
    });
  });

  describe("without options", () => {
    it("uses the default paths when there is no config file", () => {
      expect(resolvePluginTarget(root, undefined, "x")).toEqual({
        themeFile: join(root, "styles/theme.json"),
        outFile: join(root, "styles/theme.css"),
        options: {},
      });
    });

    it("reads theme, output and generator options from style-gen.config.json", () => {
      writeFileSync(
        join(root, "style-gen.config.json"),
        JSON.stringify({
          theme: "t.json",
          output: "out/o.css",
          enableResponsive: false,
        }),
      );

      expect(resolvePluginTarget(root, undefined, "x")).toEqual({
        themeFile: join(root, "t.json"),
        outFile: join(root, "out/o.css"),
        options: { enableResponsive: false },
      });
    });

    it("throws the source and the issues of an invalid config", () => {
      writeFileSync(
        join(root, "style-gen.config.json"),
        JSON.stringify({ breakpoint: ["xl"] }),
      );

      expect(() => resolvePluginTarget(root, undefined, "my-plugin")).toThrow(
        /^\[my-plugin\] Invalid config \(style-gen\.config\.json\):\n[^]*breakpoint/,
      );
    });

    it("throws for a config file that is not valid JSON", () => {
      writeFileSync(join(root, "style-gen.config.json"), "{");

      expect(() => resolvePluginTarget(root, undefined, "x")).toThrow(
        /Invalid config \(style-gen\.config\.json\):\n.*not valid JSON/,
      );
    });

    it("rejects an output outside the root", () => {
      writeFileSync(
        join(root, "style-gen.config.json"),
        JSON.stringify({ output: "../o.css" }),
      );

      expect(() => resolvePluginTarget(root, undefined, "x")).toThrow(
        /output escapes project root/,
      );
    });
  });
});
