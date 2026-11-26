import fs from "node:fs";
import path from "node:path";

/** The package managers the CLI prints commands for. */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Lockfiles in priority order; the first match walking up from the root decides. */
const LOCKFILES: readonly (readonly [string, PackageManager])[] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

/**
 * How each manager runs the local `style-gen` bin without downloading: the name
 * is unclaimed on npm, so `npx`/`dlx`/`bunx` could fetch an unrelated package.
 */
const RUNNERS: Record<PackageManager, string> = {
  npm: "npm exec --no -- style-gen",
  pnpm: "pnpm exec style-gen",
  yarn: "yarn style-gen",
  bun: "bun run style-gen",
};

// The launching manager from `npm_config_user_agent` (`yarn/4.5.0 npm/? node/v22…`).
function fromUserAgent(
  userAgent: string | undefined,
): PackageManager | undefined {
  const name = userAgent?.split("/", 1)[0];
  return name === "npm" || name === "pnpm" || name === "yarn" || name === "bun"
    ? name
    : undefined;
}

// The nearest lockfile's manager, stopping at the first `.git` directory so a stray
// lockfile above the repository (in the home directory, say) does not count.
function fromLockfile(cwd: string): PackageManager | undefined {
  let dir = path.resolve(cwd);
  for (;;) {
    const found = LOCKFILES.find(([file]) =>
      fs.existsSync(path.join(dir, file)),
    );
    if (found) return found[1];
    const parent = path.dirname(dir);
    if (parent === dir || fs.existsSync(path.join(dir, ".git")))
      return undefined;
    dir = parent;
  }
}

/**
 * The project's package manager: the launching one, else the nearest lockfile's, else npm.
 * @param {string} cwd - The project root
 * @param {Record<string, string | undefined>} [env] - The environment (defaults to `process.env`)
 * @returns {PackageManager} The manager
 */
export function detectPackageManager(
  cwd: string,
  env: Record<string, string | undefined> = process.env,
): PackageManager {
  return fromUserAgent(env.npm_config_user_agent) ?? fromLockfile(cwd) ?? "npm";
}

/**
 * The command that runs `style-gen <args>` with the project's package manager.
 * @param {string} cwd - The project root
 * @param {string} args - The subcommand and its flags
 * @param {Record<string, string | undefined>} [env] - The environment (defaults to `process.env`)
 * @returns {string} The command line
 */
export function styleGenCommand(
  cwd: string,
  args: string,
  env: Record<string, string | undefined> = process.env,
): string {
  return `${RUNNERS[detectPackageManager(cwd, env)]} ${args}`;
}
