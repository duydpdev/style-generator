import { parseArgs } from "node:util";

import { initCommand } from "./commands/init";
import { safelistCommand } from "./commands/safelist";
import { logger } from "./logger";

const args = process.argv.slice(2);

/* ------------------ CLI Options ------------------ */

const options = {
  tw: {
    type: "string",
    description: "Tailwind version (init only, v3 or v4)",
  },
  theme: {
    type: "string",
    description: "Path to theme.json",
  },
  plugin: {
    type: "string",
    description: "Path to plugin file (init only)",
  },
  dark: {
    type: "boolean",
    description: "Include dark mode (init only)",
  },
  out: {
    type: "string",
    description: "Path to output safelist (safelist only)",
  },
  help: {
    type: "boolean",
    short: "h",
    description: "Display help",
  },
  watch: {
    type: "boolean",
    short: "w",
    description: "Watch theme file for changes (safelist only)",
  },
} as const;

/* ------------------ Types ------------------ */

interface CLIValues {
  tw?: string;
  theme?: string;
  plugin?: string;
  dark?: boolean;
  out?: string;
  help?: boolean;
  watch?: boolean;
}

/* ------------------ Commands ------------------ */

const listCommands = [
  {
    name: "init",
    description: "Scaffold project files",
  },
  {
    name: "safelist",
    description: "Generate safelist.txt",
  },
] as const;

/* ------------------ Help Printer ------------------ */
/* ------------------ Help Printer ------------------ */

/**
 * Print CLI usage instructions to stdout.
 *
 * This function renders the command list and available options
 * in a formatted layout for terminal output.
 *
 * It is triggered when:
 * - The user passes `--help`
 * - No command is provided
 */
function printHelp(): void {
  logger.log(`
Usage: style-gen <command> [options]

Commands:
${listCommands.map((c) => `  ${c.name.padEnd(10)} ${c.description}`).join("\n")}

Options:
${Object.entries(options)
  .map(([key, value]) => `  --${key.padEnd(8)} ${value.description}`)
  .join("\n")}
`);
}

/* ------------------ Command Handlers ------------------ */
/**
 * Executes the `init` CLI command.
 *
 * Scaffolds the required project files based on the provided CLI options,
 * including the theme configuration, Tailwind version, and optional plugin file.
 * @param {CLIValues} values Parsed CLI option values.
 */
async function runInit(values: CLIValues): Promise<void> {
  try {
    await initCommand(values);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

/**
 * Executes the `safelist` CLI command.
 *
 * Generates a Tailwind safelist file from the provided theme configuration.
 * If watch mode is enabled, the safelist will be regenerated when the theme file changes.
 * @param {CLIValues} values Parsed CLI option values.
 */
function runSafelist(values: CLIValues): void {
  safelistCommand({
    theme: values.theme,
    out: values.out,
    watch: values.watch,
  });
}

/* ------------------ CLI Entry ------------------ */
/**
 * CLI entrypoint responsible for:
 * - Parsing command line arguments
 * - Determining the requested command
 * - Dispatching execution to the corresponding command handler
 *
 * Supported commands:
 * - `init`
 * - `safelist`
 *
 * If no command or `--help` is provided, the CLI usage help will be displayed.
 */
async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options,
    allowPositionals: true,
  });

  const command = positionals[0];

  if (values.help || !command) {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "init":
      await runInit(values);
      break;

    case "safelist":
      runSafelist(values);
      break;

    default:
      logger.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

/* ------------------ Execute ------------------ */

try {
  await main();
} catch (error) {
  logger.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
}
