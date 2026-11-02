import fs from "node:fs";
import path from "node:path";

/** A stack whose bundler config `init` can print a snippet for. */
export type BundlerStack = "nuxt" | "next" | "vite";

/** What `detectStack` found in the project root. */
export type DetectedStack =
  | { stack: BundlerStack; configFile: string }
  | { stack: "none" };

/**
 * Checked in this order: Next.js and Nuxt apps often keep a
 * `vite.config.*` for Vitest, so the framework config wins.
 */
const STACK_PRECEDENCE: readonly BundlerStack[] = ["nuxt", "next", "vite"];

const CONFIG_EXTENSIONS = [".ts", ".mts", ".cts", ".js", ".mjs", ".cjs"];

/**
 * Detect the stack from the bundler config in the project root
 * (`nuxt.config.*`, then `next.config.*`, then `vite.config.*`). Only
 * files directly in `cwd` count (symlinks are followed, directories are
 * not files); nothing is read or written.
 * @param {string} cwd - The project root
 * @returns {DetectedStack} The stack and its config file name, or `none`
 */
export function detectStack(cwd: string): DetectedStack {
  for (const stack of STACK_PRECEDENCE) {
    for (const ext of CONFIG_EXTENSIONS) {
      const configFile = `${stack}.config${ext}`;
      const stat = fs.statSync(path.join(cwd, configFile), {
        throwIfNoEntry: false,
      });
      if (stat?.isFile() === true) return { stack, configFile };
    }
  }
  return { stack: "none" };
}
