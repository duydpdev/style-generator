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
        publishConfig: { access: "public", registry: NPM },
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

  it("fails when a leftover scope block redirects the publish to GitHub Packages", () => {
    writeFileSync(
      join(dir, ".yarnrc.yml"),
      [
        `npmRegistryServer: "${NPM}"`,
        "npmScopes:",
        "  duydpdev:",
        `    npmPublishRegistry: "${GH}"`,
        "",
      ].join("\n"),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      `npmScopes.duydpdev.npmPublishRegistry = ${GH}, expected ${NPM}`,
    );
  });

  it("ignores a commented-out scope override and a sibling scope's override", () => {
    writeFileSync(
      join(dir, ".yarnrc.yml"),
      [
        `npmRegistryServer: "${NPM}"`,
        "npmScopes:",
        "  duydpdev:",
        `    # npmPublishRegistry: "${GH}"`,
        "    npmAlwaysAuth: false",
        "  other:",
        `    npmPublishRegistry: "${GH}"`,
        "",
      ].join("\n"),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(0);
  });

  it("reads the global registry from the top level, not from a scope block", () => {
    writeFileSync(
      join(dir, ".yarnrc.yml"),
      ["npmScopes:", "  duydpdev:", `    npmRegistryServer: "${NPM}"`, ""].join(
        "\n",
      ),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain(".yarnrc.yml missing npmRegistryServer");
  });

  it("fails when publishConfig.registry points at GitHub Packages", () => {
    copyFileSync(join(repoRoot, ".yarnrc.yml"), join(dir, ".yarnrc.yml"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        publishConfig: { access: "public", registry: GH },
      }),
    );

    const result = runCheck(dir);

    expect(result.status).toBe(1);
    expect(result.output).toContain(
      `publishConfig.registry = ${GH}, expected ${NPM}`,
    );
  });

  it("fails when publishConfig.access is restricted", () => {
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
      'publishConfig.access = restricted, expected "public"',
    );
  });
});
