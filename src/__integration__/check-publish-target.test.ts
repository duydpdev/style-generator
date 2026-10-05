import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "check-publish-target.mjs");

const GH = "https://npm.pkg.github.com";
const NPM = "https://registry.npmjs.org";

/**
 * Runs `check-publish-target.mjs` with `root` as the repository root.
 * The script resolves the root from its own location, so it is copied to
 * `<root>/scripts/`.
 * @param {string} root - Directory holding package.json and .yarnrc.yml
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
function runCheck(root: string) {
  mkdirSync(join(root, "scripts"), { recursive: true });
  const copy = join(root, "scripts", "check-publish-target.mjs");
  copyFileSync(script, copy);
  const result = spawnSync(process.execPath, [copy], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("integration: scripts/check-publish-target.mjs", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "publish-target-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        publishConfig: { access: "restricted", registry: GH },
      }),
    );
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes on the repository's own package.json and .yarnrc.yml", () => {
    copyFileSync(join(repoRoot, "package.json"), join(dir, "package.json"));
    copyFileSync(join(repoRoot, ".yarnrc.yml"), join(dir, ".yarnrc.yml"));

    const result = runCheck(dir);

    expect(result.status).toBe(0);
    expect(result.output).toContain("Publish target verified");
  });

  it("fails when the scope lacks a field that only a sibling scope sets", () => {
    writeFileSync(
      join(dir, ".yarnrc.yml"),
      [
        `npmRegistryServer: "${NPM}"`,
        "npmScopes:",
        "  duydpdev:",
        `    npmRegistryServer: "${GH}"`,
        "  other:",
        `    npmPublishRegistry: "${GH}"`,
        "",
      ].join("\n"),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "missing npmScopes.duydpdev.npmPublishRegistry",
    );
  });

  it("ignores a commented-out scope field", () => {
    writeFileSync(
      join(dir, ".yarnrc.yml"),
      [
        `npmRegistryServer: "${NPM}"`,
        "npmScopes:",
        "  duydpdev:",
        `    # npmPublishRegistry: "${GH}"`,
        `    npmRegistryServer: "${GH}"`,
        "",
      ].join("\n"),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      "missing npmScopes.duydpdev.npmPublishRegistry",
    );
  });

  it("reads the global registry from the top level, not from a scope declared first", () => {
    writeFileSync(
      join(dir, ".yarnrc.yml"),
      [
        "npmScopes:",
        "  duydpdev:",
        `    npmPublishRegistry: "${GH}"`,
        `    npmRegistryServer: "${GH}"`,
        "",
        `npmRegistryServer: "${NPM}"`,
        "",
      ].join("\n"),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(0);
    expect(result.output).toContain(`global npmRegistryServer = ${NPM}`);
  });

  it("fails when publishConfig.registry points at npmjs", () => {
    copyFileSync(join(repoRoot, ".yarnrc.yml"), join(dir, ".yarnrc.yml"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        publishConfig: { access: "restricted", registry: NPM },
      }),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      `publishConfig.registry = ${NPM}, expected ${GH}`,
    );
  });
});
