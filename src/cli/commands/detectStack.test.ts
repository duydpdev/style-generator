import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { detectStack } from "./detectStack";

describe("detectStack", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-stack-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const touch = (...files: string[]): void => {
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(tmp, file)), { recursive: true });
      fs.writeFileSync(path.join(tmp, file), "");
    }
  };

  it("returns none for a project without a bundler config", () => {
    expect(detectStack(tmp)).toEqual({ stack: "none" });
  });

  it.each([".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"])(
    "detects vite.config%s",
    (ext) => {
      touch(`vite.config${ext}`);
      expect(detectStack(tmp)).toEqual({
        stack: "vite",
        configFile: `vite.config${ext}`,
      });
    },
  );

  it.each([
    ["next", "next.config.ts"],
    ["next", "next.config.mjs"],
    ["next", "next.config.js"],
    ["nuxt", "nuxt.config.ts"],
    ["nuxt", "nuxt.config.js"],
  ])("detects %s from %s", (stack, configFile) => {
    touch(configFile);
    expect(detectStack(tmp)).toEqual({ stack, configFile });
  });

  it.each([
    [["vite.config.ts", "next.config.ts"], "next"],
    [["vite.config.ts", "nuxt.config.ts"], "nuxt"],
    [["next.config.mjs", "nuxt.config.ts"], "nuxt"],
    [["vite.config.ts", "next.config.ts", "nuxt.config.ts"], "nuxt"],
  ])("prefers the framework config: %j → %s", (files, stack) => {
    touch(...files);
    expect(detectStack(tmp).stack).toBe(stack);
  });

  it("ignores vitest.config.*, nested configs and a directory named like a config", () => {
    touch("vitest.config.ts", "app/vite.config.ts");
    fs.mkdirSync(path.join(tmp, "next.config.ts"));
    expect(detectStack(tmp)).toEqual({ stack: "none" });
  });
});
