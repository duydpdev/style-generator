import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");

/** The framework apps; anything they share belongs in `examples/design-system`. */
const APP_DIRS = [
  "examples/react-v4",
  "examples/next-v4",
  "examples/nuxt-v4",
] as const;

/**
 * Repo-relative files that may be byte-identical across apps. Keep it empty:
 * an entry needs a reason in a comment next to it, otherwise move the file
 * into `examples/design-system` instead.
 */
const ALLOWLIST: readonly string[] = [];

/**
 * Tracked files under the app directories (git's view, so `node_modules`,
 * build output and generated CSS are never scanned).
 * @returns {string[]} Repo-relative POSIX paths
 */
const trackedAppFiles = (): string[] =>
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- fixed arguments, the PATH `git` is the one CI and developers use
  execFileSync("git", ["ls-files", "-z", "--", ...APP_DIRS], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter((file) => file !== "");

/**
 * The app directory a repo-relative path belongs to.
 * @param {string} file - Repo-relative path
 * @returns {string} The matching entry of `APP_DIRS`
 */
const appOf = (file: string): string =>
  APP_DIRS.find((dir) => file.startsWith(`${dir}/`)) ?? file;

const compare = (a: string, b: string): number => a.localeCompare(b);

describe("integration: examples hold no byte-identical file across apps", () => {
  it("every file shared by two or more apps lives in examples/design-system", () => {
    const byHash = new Map<string, string[]>();
    for (const file of trackedAppFiles()) {
      // eslint-disable-next-line sonarjs/no-empty-collection -- the allowlist is empty by design; an entry needs a reason
      if (ALLOWLIST.includes(file)) continue;
      const path = join(repoRoot, file);
      // Deleted in the working tree but not yet staged.
      if (!existsSync(path)) continue;
      const hash = createHash("sha256")
        .update(readFileSync(path))
        .digest("hex");
      byHash.set(hash, [...(byHash.get(hash) ?? []), file]);
    }

    const offenders = [...byHash.values()]
      .filter((files) => new Set(files.map(appOf)).size > 1)
      .map((files) => [...files].sort(compare).join("\n    = "))
      .sort(compare);

    expect(
      offenders,
      `${String(offenders.length)} group(s) of identical files span more than one app; move them into examples/design-system:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
