import path from "node:path";

import { logger } from "../logger";
import { getBundlerSnippet, getCssImport } from "../templates";

import type { BundlerStack, DetectedStack } from "./detectStack";
import { AGENT_DIR, printRulesNote, projectHas } from "./initFiles";

/** Display names for the next-steps message. */
const STACK_NAMES: Record<BundlerStack, string> = {
  vite: "Vite",
  next: "Next.js",
  nuxt: "Nuxt",
};

/**
 * The CSS entry the stack's starter template uses; only the directory
 * matters, for the relative `@import` path.
 * @param {BundlerStack} stack - The detected stack
 * @param {string} cwd - The project root
 * @returns {string} Project-relative POSIX path
 */
function cssEntryFile(stack: BundlerStack, cwd: string): string {
  if (stack === "vite") {
    return projectHas(cwd, "src") ? "src/index.css" : "index.css";
  }
  if (stack === "next") {
    return projectHas(cwd, "src/app")
      ? "src/app/globals.css"
      : "app/globals.css";
  }
  return projectHas(cwd, "app")
    ? "app/assets/css/main.css"
    : "assets/css/main.css";
}

/**
 * Print what to do after scaffolding: the bundler snippet for the detected
 * stack (never written to the config file), or the CLI fallback.
 * @param {DetectedStack} detected - The detected stack
 * @param {{ theme: string; output: string }} written - Paths written to the config
 * @param {string} written.theme - Project-relative theme file
 * @param {string} written.output - Project-relative generated CSS file
 * @param {string} cwd - The project root
 * @param {boolean} rules - Whether the agent rules file exists (adds `@source not`)
 */
export function printNextSteps(
  detected: DetectedStack,
  written: { theme: string; output: string },
  cwd: string,
  rules: boolean,
): void {
  const outDir = path.posix.dirname(written.output);
  const tokensFile = path.posix.join(outDir, "theme.tokens.ts");
  const exclude = rules ? AGENT_DIR : undefined;
  const entry = cssEntryFor(detected, written.output, cwd);
  if (detected.stack === "none") {
    logger.info(
      `📝 Next steps (no vite.config.*, next.config.* or nuxt.config.* found):
   1. Edit ${written.theme} with your design tokens
   2. Write ${written.output} and ${tokensFile}: \`yarn style-gen generate\` (add --watch while you edit the theme)
   3. Import the CSS next to Tailwind from a CSS file in ${outDir}/:`,
    );
    logger.log(getCssImport(cwd, entry, written.output, exclude));
    logger.info(
      `   4. Commit ${tokensFile} and add ${written.output} to .gitignore`,
    );
    printRulesNote(rules);
    return;
  }
  logger.info(
    `📝 Next steps (${STACK_NAMES[detected.stack]}: ${detected.configFile}):
   1. Edit ${written.theme} with your design tokens
   2. Add the plugin to ${detected.configFile} (merge it into your config; init never edits it):`,
  );
  logger.log(getBundlerSnippet(detected));
  logger.info(
    `   3. Import the generated CSS next to Tailwind in ${entry} (or the CSS file in ${path.posix.dirname(entry)}/ that imports Tailwind):`,
  );
  logger.log(getCssImport(cwd, entry, written.output, exclude));
  logger.info(
    `   4. Start the dev server: it writes ${written.output} and ${tokensFile} and rewrites them on every theme or config save`,
  );
  logger.info(
    `   5. Commit ${tokensFile} and add ${written.output} to .gitignore`,
  );
  printRulesNote(rules);
}

/**
 * The CSS file the printed Tailwind lines belong in: the stack's entry, or an
 * `index.css` next to the generated CSS when no bundler config was found.
 * @param {DetectedStack} detected - The detected stack
 * @param {string} output - Project-relative POSIX path of `theme.css`
 * @param {string} cwd - The project root
 * @returns {string} Project-relative POSIX path of the CSS entry
 */
export function cssEntryFor(
  detected: DetectedStack,
  output: string,
  cwd: string,
): string {
  return detected.stack === "none"
    ? path.posix.join(path.posix.dirname(output), "index.css")
    : cssEntryFile(detected.stack, cwd);
}
