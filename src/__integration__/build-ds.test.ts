import { type SpawnSyncReturns, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const fixtureDir = join(__dirname, "__fixtures__", "ds-build");
const fixtureTheme = JSON.parse(
  readFileSync(join(fixtureDir, "theme.json"), "utf8"),
) as Record<string, unknown>;

const scratch: string[] = [];
afterEach(() => {
  for (const dir of scratch.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/**
 * Runs the producer on a theme file with the fixture config and preset, into a fresh `out` directory that does not exist yet.
 * @param {string} themeFile - The theme to build
 * @param {Record<string, string>} env - Extra environment variables
 * @returns {{ run: SpawnSyncReturns<string>, out: string }} The spawn result and the `out` directory
 */
function runProducer(
  themeFile: string,
  env: Record<string, string> = {},
): { run: SpawnSyncReturns<string>; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "build-ds-test-"));
  scratch.push(dir);
  const out = join(dir, "out");
  const run = spawnSync(
    process.execPath,
    [
      "scripts/build-ds.mjs",
      "--theme",
      themeFile,
      "--config",
      join(fixtureDir, "style-gen.config.json"),
      "--preset",
      join(fixtureDir, "ds.preset.ts"),
      "--namespace",
      "Fixture",
      "--out",
      out,
    ],
    { cwd: root, encoding: "utf8", env: { ...process.env, ...env } },
  );
  return { run, out };
}

/**
 * Writes the fixture theme without one top-level key to a scratch file.
 * @param {string} key - The key to drop
 * @returns {string} The theme file's path
 */
function themeWithout(key: string): string {
  const dir = mkdtempSync(join(tmpdir(), "build-ds-theme-"));
  scratch.push(dir);
  const file = join(dir, "theme.json");
  const rest = Object.fromEntries(
    Object.entries(fixtureTheme).filter(([name]) => name !== key),
  );
  writeFileSync(file, JSON.stringify(rest));
  return file;
}

/**
 * Writes the fixture theme with a translucent alias in the base record and in a dark override to a scratch file.
 * @returns {string} The theme file's path
 */
function themeWithAlphaAliases(): string {
  const dir = mkdtempSync(join(tmpdir(), "build-ds-alpha-"));
  scratch.push(dir);
  const file = join(dir, "theme.json");
  const colors = fixtureTheme.colors as Record<string, string>;
  writeFileSync(
    file,
    JSON.stringify({
      ...fixtureTheme,
      colors: { ...colors, hairline: "$gray900/8" },
      themeAxes: { theme: { dark: { colors: { hairline: "$white/16" } } } },
    }),
  );
  return file;
}

describe("scripts/build-ds.mjs end to end", () => {
  it(
    "builds a design system with a README and a cover from a theme that follows the standard",
    { timeout: 180_000 },
    () => {
      // NODE_ENV=development would make a JSX transform emit react/jsx-dev-runtime calls; the bundle must not change with it.
      const { run, out } = runProducer(join(fixtureDir, "theme.json"), {
        NODE_ENV: "development",
      });
      expect(run.status, run.stderr).toBe(0);

      const cover = join(out, "components", "Cover", "preview.html");
      expect(existsSync(cover)).toBe(true);
      expect(readFileSync(cover, "utf8")).not.toContain("{{");

      const stamp = JSON.parse(
        readFileSync(join(out, "ds-stamp.json"), "utf8"),
      ) as { themeSha256: string };
      expect(stamp.themeSha256).toBe(
        createHash("sha256")
          .update(readFileSync(join(fixtureDir, "theme.json")))
          .digest("hex"),
      );

      expect(readFileSync(join(out, "README.md"), "utf8")).toContain(
        "## Naming",
      );

      const bundle = readFileSync(join(out, "components", "bundle.js"), "utf8");
      expect(bundle).not.toContain("jsxDEV");
      expect(bundle).not.toContain("jsx-dev-runtime");
    },
  );

  it(
    "builds a theme without borderRadius and says so in the README",
    { timeout: 180_000 },
    () => {
      const { run, out } = runProducer(themeWithout("borderRadius"));
      expect(run.status, run.stderr).toBe(0);
      expect(readFileSync(join(out, "README.md"), "utf8")).toContain(
        "## Radius\n\nThis theme defines no `borderRadius` keys.\n",
      );
      expect(
        readFileSync(join(out, "components", "index.d.ts"), "utf8"),
      ).toContain("RadiusToken = never");
    },
  );

  it("refuses a theme without typography before the build and writes nothing", () => {
    const { run, out } = runProducer(themeWithout("typography"));
    expect(run.status).toBe(1);
    expect(run.stderr.trim()).toBe(
      "theme has no typography: a design system needs at least one typography key (the cover title and the Text component use one)",
    );
    expect(existsSync(out)).toBe(false);
  });

  it(
    "resolves a translucent alias to a literal rgba in tokens.json and prints it as `$<key> at <n>%` in the README",
    { timeout: 180_000 },
    () => {
      const { run, out } = runProducer(themeWithAlphaAliases());
      expect(run.status, run.stderr).toBe(0);
      expect(run.stderr).not.toContain("hairline");

      const tokens = JSON.parse(
        readFileSync(join(out, "tokens.json"), "utf8"),
      ) as { color: { tokens: { name: string; value: unknown }[] } };
      expect(
        tokens.color.tokens.find((t) => t.name === "hairline")?.value,
      ).toEqual({
        light: "rgba(17, 24, 39, 0.08)",
        dark: "rgba(255, 255, 255, 0.16)",
      });

      const readme = readFileSync(join(out, "README.md"), "utf8");
      expect(readme).toContain("$gray900 at 8%");
      expect(readme).not.toContain("$gray900/8");
    },
  );
});
