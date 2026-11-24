import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const fixtureDir = join(__dirname, "__fixtures__", "ds-build");

describe("scripts/build-ds.mjs end to end", () => {
  it(
    "builds a design system with a README and a cover from a theme that follows the standard",
    { timeout: 180_000 },
    () => {
      const out = mkdtempSync(join(tmpdir(), "build-ds-test-"));
      try {
        const run = spawnSync(
          process.execPath,
          [
            "scripts/build-ds.mjs",
            "--theme",
            join(fixtureDir, "theme.json"),
            "--config",
            join(fixtureDir, "style-gen.config.json"),
            "--preset",
            join(fixtureDir, "ds.preset.ts"),
            "--namespace",
            "Fixture",
            "--out",
            out,
          ],
          { cwd: root, encoding: "utf8" },
        );
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
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
  );
});
