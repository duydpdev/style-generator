import fs from "node:fs";
import path from "node:path";

import { sameFile } from "../../node/sameFile";
import { logger } from "../logger";

/** Agent configuration directory; it holds prose Tailwind must not scan. */
export const AGENT_DIR = ".claude";

/** Where `init` writes the agent rules, relative to the project root. */
export const RULES_FILE = `${AGENT_DIR}/rules/style-generator.md`;

/**
 * Write file and create directory if needed.
 * @param {string} filePath The path where the file will be written.
 * @param {string} content The content to write into the file.
 */
export function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Repo-relative POSIX form of an absolute path under `cwd`, the only form
 * `init` writes to the config or prints.
 * @param {string} cwd - The project root
 * @param {string} abs - An absolute path inside `cwd`
 * @returns {string} e.g. `src/styles/theme.json`
 */
export function toRepoPath(cwd: string, abs: string): string {
  return path.relative(cwd, abs).split(path.sep).join("/");
}

/**
 * Whether `dir` exists under the project root.
 * @param {string} cwd - The project root
 * @param {string} dir - Project-relative path
 * @returns {boolean} `true` when the path exists
 */
export function projectHas(cwd: string, dir: string): boolean {
  return fs.existsSync(path.resolve(cwd, dir));
}

/**
 * Whether two project-relative paths name the same file (`sameFile`: one
 * inode, or one canonical path, so a different case, a symlink or `/tmp` vs
 * `/private/tmp` does not make them differ).
 * @param {string} cwd - The project root
 * @param {string} a - A path, relative to `cwd` or absolute
 * @param {string} b - Another path
 * @returns {boolean} `true` when both name one file
 */
export function samePath(cwd: string, a: string, b: string): boolean {
  return sameFile(path.resolve(cwd, a), path.resolve(cwd, b));
}

/**
 * The generated CSS `init` writes beside a theme.
 * @param {string} themeLoc - Project-relative POSIX theme location
 * @returns {string} Project-relative POSIX CSS location
 */
export function besideTheme(themeLoc: string): string {
  return path.posix.join(path.posix.dirname(themeLoc), "theme.css");
}

/**
 * One line on the agent rules file, when it is present.
 * @param {boolean} rules - Whether `.claude/rules/style-generator.md` exists
 */
export function printRulesNote(rules: boolean): void {
  if (!rules) return;
  logger.info(
    `   Coding agents read ${RULES_FILE}; \`@source not\` keeps its example classes out of your CSS.`,
  );
}
