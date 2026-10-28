import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import { BUDGET_USAGE, budgetCommand } from "./commands/budget";
import { doctorCommand } from "./commands/doctor";
import { generateCommand } from "./commands/generate";
import { initCommand } from "./commands/init";
import { schemaCommand } from "./commands/schema";
import { tokensCommand } from "./commands/tokens";
import { logger } from "./logger";
import { readCliVersion } from "./version";

/** What every command receives besides its own flags. */
export interface CliContext {
  /** The project root: `process.cwd()` for the real CLI. */
  cwd: string;
}

/** Parsed flag values of one command (`parseArgs` output). */
export type CliValues = Record<
  string,
  string | boolean | (string | boolean)[] | undefined
>;

/**
 * One CLI command. The registry parses its flags strictly (an unknown flag
 * is an error) and calls `run`, which returns the process exit code instead
 * of exiting.
 */
export interface CliCommand {
  name: string;
  /** One line for the command list. */
  description: string;
  /** What `style-gen <name> --help` prints. */
  usage: string;
  /** `parseArgs` options of this command only. */
  options: ParseArgsOptionsConfig;
  allowPositionals: boolean;
  /** Exit code for a flag/argument error (1 when omitted). */
  usageExitCode?: number;
  run: (
    values: CliValues,
    positionals: string[],
    ctx: CliContext,
  ) => Promise<number> | number;
}

/**
 * A string flag.
 * @param {CliValues} values - Parsed flag values
 * @param {string} key - Flag name
 * @returns {string | undefined} The value, `undefined` when absent
 */
const str = (values: CliValues, key: string): string | undefined => {
  const value = values[key];
  return typeof value === "string" ? value : undefined;
};

/**
 * A boolean flag.
 * @param {CliValues} values - Parsed flag values
 * @param {string} key - Flag name
 * @returns {boolean | undefined} The value, `undefined` when absent
 */
const flag = (values: CliValues, key: string): boolean | undefined => {
  const value = values[key];
  return typeof value === "boolean" ? value : undefined;
};

/* ------------------ Commands ------------------ */

const initCli: CliCommand = {
  name: "init",
  description: "Scaffold project files",
  usage: `Usage: style-gen init [options]

Scaffold the theme JSON, its JSON Schema, a generator script and style-gen.config.json.

Options:
  --theme <path>    Theme JSON location (default: styles/theme.json, or src/styles/theme.json)
  --plugin <path>   Generator script location (default: plugins/theme-plugin.ts)
  --dark            Include a dark mode variant in the theme template`,
  options: {
    theme: { type: "string" },
    plugin: { type: "string" },
    dark: { type: "boolean" },
  },
  allowPositionals: false,
  run: (values, _positionals, ctx) => {
    const theme = str(values, "theme");
    const plugin = str(values, "plugin");
    const dark = flag(values, "dark");
    return initCommand(
      {
        ...(theme !== undefined && { theme }),
        ...(plugin !== undefined && { plugin }),
        ...(dark !== undefined && { dark }),
      },
      ctx.cwd,
    );
  },
};

const generateCli: CliCommand = {
  name: "generate",
  description: "Generate theme.css",
  usage: `Usage: style-gen generate [options] [theme] [out]

Read the theme, validate it and write the Tailwind v4 CSS. With --watch the
file is regenerated when the theme or style-gen.config.json changes.

Options:
  --theme <path>    Theme JSON (default: styles/theme.json); a path outside the project is allowed
  --out <path>      CSS file to write (default: styles/theme.css); must stay inside the project
  -w, --watch       Watch the theme and the config file for changes

The positional form \`generate <theme> <out>\` still works; flags win over it.`,
  options: {
    theme: { type: "string" },
    out: { type: "string" },
    watch: { type: "boolean", short: "w" },
  },
  allowPositionals: true,
  run: (values, positionals, ctx) => {
    const [themeFromPositional, outFromPositional] = positionals;

    if (
      (themeFromPositional || outFromPositional) &&
      (values.theme || values.out)
    ) {
      logger.info(
        "Both flags and positional arguments detected. Flags (--theme, --out) take precedence over positionals.",
      );
    }

    if (positionals.length > 0 && !values.theme && !values.out) {
      logger.info(
        "Detected positional arguments for `generate`. For clarity, prefer: --theme <path> and --out <path>.",
      );
    }

    const theme = str(values, "theme") ?? themeFromPositional;
    const out = str(values, "out") ?? outFromPositional;
    const watch = flag(values, "watch");
    return generateCommand(
      {
        ...(theme !== undefined && { theme }),
        ...(out !== undefined && { out }),
        ...(watch !== undefined && { watch }),
      },
      ctx.cwd,
    );
  },
};

const doctorCli: CliCommand = {
  name: "doctor",
  description: "Check project setup and schema validation",
  usage: `Usage: style-gen doctor

Check style-gen.config.json, the theme (schema and theme × options), the generator
script and the generated CSS; warn about utility collisions, pre-5.0 --sg-<color>
variables and override literals that could be $aliases. Exits 1 on any error.`,
  options: {},
  allowPositionals: false,
  run: (_values, _positionals, ctx) => doctorCommand(ctx.cwd),
};

const schemaCli: CliCommand = {
  name: "schema",
  description: "Generate theme.schema.json for editor autocomplete",
  usage: `Usage: style-gen schema [options]

Write the theme's JSON Schema so editors can autocomplete and flag unknown keys.

Options:
  --out <path>      File to write (default: theme.schema.json next to the theme); must stay inside the project`,
  options: { out: { type: "string" } },
  allowPositionals: false,
  run: (values, _positionals, ctx) => {
    const out = str(values, "out");
    return schemaCommand({ ...(out !== undefined && { out }) }, ctx.cwd);
  },
};

const tokensCli: CliCommand = {
  name: "tokens",
  description: "Generate a keys-only theme.tokens.ts for client bundles",
  usage: `Usage: style-gen tokens [options]

Write the theme's design-token keys (DesignTokens.Web) as \`export const tokens = {…} as const\`,
so a client bundle can import them without the ./tokens runtime and the theme JSON.

Options:
  --theme <path>    Theme JSON (default: from style-gen.config.json, else styles/theme.json)
  --out <path>      File to write (default: theme.tokens.ts next to the theme); must stay inside the project`,
  options: { theme: { type: "string" }, out: { type: "string" } },
  allowPositionals: false,
  run: (values, _positionals, ctx) => {
    const theme = str(values, "theme");
    const out = str(values, "out");
    return tokensCommand(
      {
        ...(theme !== undefined && { theme }),
        ...(out !== undefined && { out }),
      },
      ctx.cwd,
    );
  },
};

const budgetCli: CliCommand = {
  name: "budget",
  description: "Fail when the gzip size of built CSS exceeds a budget",
  usage: `Usage: ${BUDGET_USAGE}

Sum the gzip size of every .css file under the target (a file, or a directory
walked recursively, e.g. .next/static/css) and compare it with the budget.

Options:
  --max-gzip <bytes>   Budget in bytes (required)

Exit codes: 0 within budget, 1 over budget, 2 usage error or no CSS found.`,
  options: { "max-gzip": { type: "string" } },
  allowPositionals: true,
  usageExitCode: 2,
  run: (values, positionals, ctx) => {
    if (positionals.length > 1) {
      logger.error(`Usage: ${BUDGET_USAGE}`);
      return 2;
    }
    return budgetCommand(
      { target: positionals[0], maxGzip: str(values, "max-gzip") },
      ctx.cwd,
    );
  },
};

/** Every command, in the order the help lists them. */
export const commands: readonly CliCommand[] = [
  initCli,
  generateCli,
  doctorCli,
  schemaCli,
  tokensCli,
  budgetCli,
];

/* ------------------ Help ------------------ */

/** The flags understood before (or instead of) a command. */
const globalOptions = {
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const satisfies ParseArgsOptionsConfig;

const GLOBAL_FLAGS = ["--help", "-h", "--version", "-v"];

/**
 * Print the command list and the global options.
 */
function printHelp(): void {
  logger.log(`
Usage: style-gen <command> [options]

Commands:
${commands.map((c) => `  ${c.name.padEnd(10)} ${c.description}`).join("\n")}

Options:
  -h, --help       Display help (\`style-gen <command> --help\` for one command)
  -v, --version    Display version
`);
}

/* ------------------ Entry ------------------ */

/**
 * The CLI, minus the process: parses `args`, runs the command and returns the
 * exit code. Never throws and never calls `process.exit`, so tests drive it
 * directly and `index.ts` just assigns `process.exitCode`.
 *
 * Parsing is two-pass. A lenient global pass finds `--help`/`--version` and
 * the command name; the command's own flags are then parsed strictly, so a
 * misspelled flag (`--them`) is an error instead of being silently ignored.
 *
 * Exit codes: 0 success, `--help`, `--version`, no command, or a cancelled
 * prompt; 1 failure, unknown command or flag (2 for `budget`'s flag errors).
 * @param {string[]} args - Arguments after `style-gen`
 * @param {string} cwd - The project root
 * @returns {Promise<number>} The process exit code
 */
export async function runCli(args: string[], cwd: string): Promise<number> {
  try {
    return await dispatch(args, cwd);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : "Unknown error");
    return 1;
  }
}

/**
 * Parse and dispatch; may throw, `runCli` turns that into exit code 1.
 * @param {string[]} args - Arguments after `style-gen`
 * @param {string} cwd - The project root
 * @returns {Promise<number>} The process exit code
 */
async function dispatch(args: string[], cwd: string): Promise<number> {
  const first = args[0];
  if (first?.startsWith("-") === true && !GLOBAL_FLAGS.includes(first)) {
    logger.error(`Unknown option: ${first}`);
    printHelp();
    return 1;
  }

  const { values: global, positionals } = parseArgs({
    args,
    options: globalOptions,
    strict: false,
    allowPositionals: true,
  });

  if (global.version === true) {
    logger.log(`style-gen v${readCliVersion()}`);
    return 0;
  }

  const name = positionals[0];
  if (name === undefined) {
    printHelp();
    return 0;
  }

  const command = commands.find((c) => c.name === name);
  if (!command) {
    logger.error(`Unknown command: ${name}`);
    printHelp();
    return 1;
  }

  if (global.help === true) {
    logger.log(`\n${command.usage}\n`);
    return 0;
  }

  // The command is `args[0]` here: a leading flag is a global one, handled above.
  const rest = args.slice(1);
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: rest,
      options: command.options,
      strict: true,
      allowPositionals: command.allowPositionals,
    });
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    logger.log(`\n${command.usage}\n`);
    return command.usageExitCode ?? 1;
  }

  return command.run(parsed.values as CliValues, parsed.positionals, { cwd });
}
