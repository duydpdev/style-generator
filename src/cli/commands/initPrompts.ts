import * as p from "@clack/prompts";

import { logger } from "../logger";

export interface InteractiveConfig {
  themeLoc: string;
  includeDark: boolean;
}

/** Thrown when the user cancels a prompt (Ctrl+C / Esc); `initCommand` maps it to exit code 0. */
export class CancelError extends Error {
  constructor() {
    super("Operation cancelled.");
    this.name = "CancelError";
  }
}

/**
 * Abort the command when a prompt was cancelled.
 * @param {unknown} value The value from the prompt.
 * @throws {CancelError} When the prompt was cancelled.
 */
export function handleCancel(value: unknown): void {
  if (p.isCancel(value)) {
    throw new CancelError();
  }
}

/* ------------------ Interactive Prompts ------------------ */

/**
 * Prompt user interactively for configuration.
 * @param {string} defaultTheme - The stack's default theme location
 * @returns {Promise<InteractiveConfig>} The collected configuration.
 */
export async function getInteractiveConfig(
  defaultTheme: string,
): Promise<InteractiveConfig> {
  p.intro("🚀 style-gen init");

  const themeRes = await p.text({
    message: "Theme file location?",
    initialValue: defaultTheme,
    placeholder: defaultTheme,
  });
  handleCancel(themeRes);

  const darkRes = await p.confirm({
    message: "Include dark mode template?",
    initialValue: false,
  });
  handleCancel(darkRes);

  const theme = themeRes as string;
  const dark = darkRes as boolean;

  return {
    themeLoc: theme || defaultTheme,
    includeDark: dark,
  };
}

/**
 * Decide whether existing scaffold files may be replaced. Declining is not a
 * dead end: the files that exist stay and the missing ones, the config
 * included, are written, as under `--yes`.
 * @param {boolean} isInteractive - Whether a TTY can answer the prompt
 * @param {boolean} yes - `--yes`: keep the files that exist and write only the missing ones, instead of asking or failing
 * @returns {Promise<"overwrite" | "fill" | "refused">} The outcome
 */
export async function confirmOverwrite(
  isInteractive: boolean,
  yes: boolean,
): Promise<"overwrite" | "fill" | "refused"> {
  if (yes) {
    logger.info("Existing files kept (--yes never overwrites).");
    return "fill";
  }
  if (!isInteractive) {
    logger.error(
      "Files already exist. Run interactively to confirm overwrite.",
    );
    return "refused";
  }
  const overwrite = await p.confirm({
    message: "Theme or schema already exists. Overwrite?",
    initialValue: false,
  });
  handleCancel(overwrite);
  if (overwrite) return "overwrite";
  logger.info("Existing files kept; writing only what is missing.");
  return "fill";
}
