import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { doctorCommand } from "./commands/doctor";
import { generateCommand } from "./commands/generate";
import { initCommand } from "./commands/init";
import { schemaCommand } from "./commands/schema";
import { logger } from "./logger";

const args = process.argv.slice(2);

/* ------------------ CLI Options ------------------ */

const options = {
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
    description: "Path to output file (generate/schema)",
  },
  help: {
    type: "boolean",
    short: "h",
    description: "Display help",
  },
  version: {
    type: "boolean",
    short: "v",
    description: "Display version",
  },
  watch: {
    type: "boolean",
    short: "w",
    description: "Watch theme file for changes (generate only)",
  },
} as const;

/* ------------------ Types ------------------ */

interface CLIValues {
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
    name: "generate",
    description: "Generate theme.css",
  },
  {
    name: "doctor",
    description: "Check project setup and schema validation",
  },
  {
    name: "schema",
    description: "Generate theme.schema.json for editor autocomplete",
  },
] as const;

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
 * including the theme configuration and optional plugin file.
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
 * Executes the `generate` CLI command.
 *
 * Runs `generate()` against the theme configuration and writes the
 * resulting CSS to disk. If watch mode is enabled, the CSS is
 * regenerated when the theme file changes.
 *
 * Supports both:
 * - Flag syntax: `style-gen generate --theme styles/theme.json --out styles/theme.css`
 * - Positional syntax (backwards compatible): `style-gen generate styles/theme.json styles/theme.css`
 * @param {CLIValues} values Parsed CLI option values.
 * @param {string[]} positionals Raw positional arguments (including the command name).
 */
function runGenerate(values: CLIValues, positionals: string[]): void {
  const extraArgs = positionals.slice(1);

  const themeFromPositional = extraArgs[0];
  const outFromPositional = extraArgs[1];

  if (
    (themeFromPositional || outFromPositional) &&
    (values.theme || values.out)
  ) {
    logger.info(
      "Both flags and positional arguments detected. Flags (--theme, --out) take precedence over positionals.",
    );
  }

  if (extraArgs.length > 0 && !values.theme && !values.out) {
    logger.info(
      "Detected positional arguments for `generate`. For clarity, prefer: --theme <path> and --out <path>.",
    );
  }

  const theme = values.theme ?? themeFromPositional;
  const out = values.out ?? outFromPositional;

  generateCommand({
    ...(theme !== undefined && { theme }),
    ...(out !== undefined && { out }),
    ...(values.watch !== undefined && { watch: values.watch }),
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
 * - `generate`
 * - `doctor`
 * - `schema`
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

  if (values.version) {
    try {
      const pkgPath = path.resolve(__dirname, "../../package.json");
      const pkgStr = fs.readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgStr) as { version: string };
      logger.log(`style-gen v${pkg.version}`);
    } catch {
      logger.log(`style-gen vUnknown`);
    }
    process.exit(0);
  }

  if (values.help || !command) {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "init":
      await runInit(values);
      break;

    case "generate":
      runGenerate(values, positionals);
      break;

    case "doctor": {
      doctorCommand();
      break;
    }

    case "schema":
      schemaCommand({ ...(values.out !== undefined && { out: values.out }) });
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
