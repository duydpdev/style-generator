import fs from "node:fs";
import path from "node:path";

/** The package managers the CLI prints commands for. */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Lockfiles in priority order, for a directory that holds more than one.
 * The first match while walking up from the project root decides.
 */
const LOCKFILES: readonly (readonly [string, PackageManager])[] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

/**
 * How each manager runs the locally installed `style-gen` bin. None of these
 * downloads a package when `style-gen` is not installed: the name is unclaimed
 * on the public npm registry, so `npx`, `pnpm dlx`, `bunx` and `yarn dlx`
 * could fetch an unrelated one.
 */
const RUNNERS: Record<PackageManager, string> = {
  npm: "npm exec --no -- style-gen",
  pnpm: "pnpm exec style-gen",
  yarn: "yarn style-gen",
  bun: "bun run style-gen",
};

/**
 * The manager that launched this run, from `npm_config_user_agent`
 * (`yarn/4.5.0 npm/? node/v22…`); undefined when it is unset or names
 * another tool.
 * @param {string | undefined} userAgent - The `npm_config_user_agent` value
 * @returns {PackageManager | undefined} The manager, if known
 */
function fromUserAgent(
  userAgent: string | undefined,
): PackageManager | undefined {
  const name = userAgent?.split("/", 1)[0];
  return name === "npm" || name === "pnpm" || name === "yarn" || name === "bun"
    ? name
    : undefined;
}

/**
 * The nearest lockfile's manager, walking up from `cwd` and stopping at the
 * first directory that holds `.git` (a stray lockfile above the repository,
 * in the home directory say, does not count).
 * @param {string} cwd - The project root
 * @returns {PackageManager | undefined} The manager, if a lockfile was found
 */
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
 * The project's package manager: the one that launched this run, else the
 * nearest lockfile's, else npm.
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
 * The command that runs `style-gen <args>` with the project's package manager,
 * for the hints the CLI prints (`yarn style-gen init`,
 * `npm exec --no -- style-gen init`, …).
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
