import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { detectPackageManager, styleGenCommand } from "./packageManager";

const scratch: string[] = [];
afterEach(() => {
  for (const dir of scratch.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * A temporary repository root (it holds `.git`, so the walk-up stops there) with the given files.
 * @param {string[]} files - Paths to create, relative to the root
 * @returns {string} The root
 */
function repo(files: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "style-gen-pm-"));
  scratch.push(root);
  fs.mkdirSync(path.join(root, ".git"));
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), "");
  }
  return root;
}

const noAgent = { npm_config_user_agent: undefined };

describe("detectPackageManager", () => {
  it.each([
    ["yarn/4.5.0 npm/? node/v22.11.0 darwin arm64", "yarn"],
    ["npm/10.9.0 node/v22.11.0 darwin arm64 workspaces/false", "npm"],
    ["pnpm/9.12.0 npm/? node/v22.11.0 darwin arm64", "pnpm"],
    ["bun/1.1.30 npm/? node/v22.6.0 darwin arm64", "bun"],
  ])("reads the manager that launched the run: %s", (agent, expected) => {
    expect(
      detectPackageManager(repo(["package-lock.json"]), {
        npm_config_user_agent: agent,
      }),
    ).toBe(expected);
  });

  it.each([
    ["yarn.lock", "yarn"],
    ["pnpm-lock.yaml", "pnpm"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
    ["npm-shrinkwrap.json", "npm"],
  ])("falls back to the lockfile %s", (lockfile, expected) => {
    expect(detectPackageManager(repo([lockfile]), noAgent)).toBe(expected);
  });

  it("falls back to the lockfile when the user agent names another tool", () => {
    expect(
      detectPackageManager(repo(["yarn.lock"]), {
        npm_config_user_agent: "deno/2.0.0",
      }),
    ).toBe("yarn");
  });

  it("finds the lockfile of a monorepo root from a workspace", () => {
    const root = repo(["yarn.lock", "packages/app/package.json"]);
    expect(
      detectPackageManager(path.join(root, "packages", "app"), noAgent),
    ).toBe("yarn");
  });

  it("does not look above the directory that holds .git", () => {
    const outer = repo(["yarn.lock"]);
    const inner = path.join(outer, "project");
    fs.mkdirSync(path.join(inner, ".git"), { recursive: true });
    expect(detectPackageManager(inner, noAgent)).toBe("npm");
  });

  it("picks pnpm over npm when one directory holds both lockfiles", () => {
    expect(
      detectPackageManager(
        repo(["package-lock.json", "pnpm-lock.yaml"]),
        noAgent,
      ),
    ).toBe("pnpm");
  });

  it("falls back to npm without a user agent or a lockfile", () => {
    expect(detectPackageManager(repo([]), noAgent)).toBe("npm");
  });
});

describe("styleGenCommand", () => {
  it.each([
    ["yarn.lock", "yarn style-gen init"],
    ["pnpm-lock.yaml", "pnpm exec style-gen init"],
    ["bun.lock", "bun run style-gen init"],
    ["package-lock.json", "npm exec --no -- style-gen init"],
  ])("runs the local bin for %s", (lockfile, expected) => {
    expect(styleGenCommand(repo([lockfile]), "init", noAgent)).toBe(expected);
  });
});
