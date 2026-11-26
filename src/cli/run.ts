import { parseArgs, type ParseArgsOptionsConfig } from "node:util";

import { errorMessage } from "../node/errorMessage";

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
  description: "Scaffold the theme and print the bundler wiring",
  usage: `Usage: style-gen init [options]

Scaffold the theme JSON, its JSON Schema, style-gen.config.json and the
config's JSON Schema, then print the plugin snippet for the stack found in the
project root (nuxt.config.*, next.config.*, vite.config.*) or the
\`style-gen generate\` fallback. Never edits the bundler config. Writes
.claude/rules/style-generator.md, the component
contract coding agents follow; a copy from another version is replaced, an
edited one only after an interactive confirm.

Options:
  --theme <path>    Theme JSON location (default: styles/theme.json, src/styles/theme.json
                    with a src/ directory, app/assets/css/theme.json for Nuxt 4)
  --dark            Include a dark mode variant in the theme template
  --skip-rules      Do not write .claude/rules/style-generator.md
  --rules-only      Only write or refresh .claude/rules/style-generator.md (after an upgrade)
  -y, --yes         Answer every prompt with its default and never overwrite an existing file; writes only what is missing and keeps the
                    theme and output of an existing config (for scripts, CI and coding agents)`,
  options: {
    theme: { type: "string" },
    dark: { type: "boolean" },
    "skip-rules": { type: "boolean" },
    "rules-only": { type: "boolean" },
    yes: { type: "boolean", short: "y" },
  },
  allowPositionals: false,
  run: (values, _positionals, ctx) => {
    const theme = str(values, "theme");
    const dark = flag(values, "dark");
    const skipRules = flag(values, "skip-rules");
    const rulesOnly = flag(values, "rules-only");
    const yes = flag(values, "yes");
    return initCommand(
      {
        ...(theme !== undefined && { theme }),
        ...(dark !== undefined && { dark }),
        ...(skipRules !== undefined && { skipRules }),
        ...(rulesOnly !== undefined && { rulesOnly }),
        ...(yes !== undefined && { yes }),
      },
      ctx.cwd,
    );
  },
};

const generateCli: CliCommand = {
  name: "generate",
  description: "Generate theme.css and theme.tokens.ts",
  usage: `Usage: style-gen generate [options] [theme] [out]

Read the theme, validate it and write the Tailwind v4 CSS and the typed
theme.tokens.ts beside it. With --watch the files are regenerated when the
theme or style-gen.config.json changes. With --check nothing is written and
the exit code is 1 when theme.tokens.ts is missing or out of date.

Options:
  --theme <path>    Theme JSON (default: styles/theme.json); a path outside the project is allowed
  --out <path>      CSS file to write (default: styles/theme.css); must stay inside the project
  -w, --watch       Watch the theme and the config file for changes
  --check           Write nothing; exit 1 when theme.tokens.ts is missing or differs from the theme and config (not with --watch)

The positional form \`generate <theme> <out>\` still works; flags win over it.`,
  options: {
    theme: { type: "string" },
    out: { type: "string" },
    watch: { type: "boolean", short: "w" },
    check: { type: "boolean" },
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
    const check = flag(values, "check");
    return generateCommand(
      {
        ...(theme !== undefined && { theme }),
        ...(out !== undefined && { out }),
        ...(watch !== undefined && { watch }),
        ...(check !== undefined && { check }),
      },
      ctx.cwd,
    );
  },
};

const doctorCli: CliCommand = {
  name: "doctor",
  description: "Check project setup and schema validation",
  usage: `Usage: style-gen doctor

Check style-gen.config.json, the theme (schema and theme × options) and the
generated CSS; warn about utility collisions and override literals that could
be $aliases. Exits 1 on any error.`,
  options: {},
  allowPositionals: false,
  run: (_values, _positionals, ctx) => doctorCommand(ctx.cwd),
};

const schemaCli: CliCommand = {
  name: "schema",
  description:
    "Generate the JSON Schemas of theme.json and style-gen.config.json",
  usage: `Usage: style-gen schema [options]

Write the JSON Schemas of the theme and of style-gen.config.json so editors can
autocomplete and flag unknown keys.

Options:
  --out <path>         File for the theme's JSON Schema (default: theme.schema.json next to the theme); must stay inside the project
  --config-out <path>  File for the config's JSON Schema (default: style-gen.config.schema.json in the project root); must stay inside the project`,
  options: { out: { type: "string" }, "config-out": { type: "string" } },
  allowPositionals: false,
  run: (values, _positionals, ctx) => {
    const out = str(values, "out");
    const configOut = str(values, "config-out");
    return schemaCommand(
      {
        ...(out !== undefined && { out }),
        ...(configOut !== undefined && { configOut }),
      },
      ctx.cwd,
    );
  },
};

const tokensCli: CliCommand = {
  name: "tokens",
  description: "Generate a keys-only theme.tokens.ts for client bundles",
  usage: `Usage: style-gen tokens [options]

Write the theme's design-token keys (DesignTokens.Web) and its themeAxes as
\`export const tokens = {…} as const\` (plus Tokens, themeAxes and ThemeAxesState),
so a client bundle can import them without the ./tokens runtime and the theme JSON.
\`generate\` writes the same file next to the CSS; use this command to write it alone.

Options:
  --theme <path>    Theme JSON (default: from style-gen.config.json, else styles/theme.json)
  --out <path>      File to write: .ts, .mts or .cts, not a .d.ts (default: tokensOutput from the config, else theme.tokens.ts beside the CSS output); must stay inside the project`,
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
  --coverage-cost      List theme class groups by gzip cost
  --theme <path>       Theme for --coverage-cost

Exit codes: 0 within budget, 1 over budget, 2 usage error, no CSS found, or (with --coverage-cost) an unreadable config or theme.`,
  options: {
    "max-gzip": { type: "string" },
    "coverage-cost": { type: "boolean" },
    theme: { type: "string" },
  },
  allowPositionals: true,
  usageExitCode: 2,
  run: (values, positionals, ctx) => {
    if (positionals.length > 1) {
      logger.error(`Usage: ${BUDGET_USAGE}`);
      return 2;
    }
    const theme = str(values, "theme");
    if (theme !== undefined && !flag(values, "coverage-cost")) {
      logger.error("--theme needs --coverage-cost");
      return 2;
    }
    return budgetCommand(
      {
        target: positionals[0],
        maxGzip: str(values, "max-gzip"),
        coverageCost: flag(values, "coverage-cost"),
        theme,
      },
      ctx.cwd,
    );
  },
};

const CANVAS_USAGE =
  "style-gen canvas check --canvas <dir> --theme <file> [options]";

/** The flags each `canvas` subcommand accepts; any other given flag is a usage error. */
const CANVAS_FLAGS: Record<string, readonly string[]> = {
  check: [
    "canvas",
    "theme",
    "stamp",
    "intents",
    "standard",
    "ds-version",
    "recipes",
    "usage",
    "preset",
    "config",
    "no-rule",
    "naming",
    "boards",
    "inventory",
  ],
  "standard init": ["standard"],
  "standard migrate": ["theme", "standard", "dry-run"],
};

const canvasCli: CliCommand = {
  name: "canvas",
  description:
    "Check a design canvas against the theme and the canvas standard",
  usage: `Usage: ${CANVAS_USAGE}
       style-gen canvas check --inventory --canvas <dir>
       style-gen canvas standard init [--standard <file>]
       style-gen canvas standard migrate --theme <file> [--standard <file>] [--dry-run]

Check every *.dc.html and *.css under the canvas directory against ONE theme
and the design-canvas standard (the manifest bundled with the package). A
product's --standard file only adds to it (roles, extra scale steps, boards,
exemptions with a reason); it never replaces a packaged rule.

Options:
  --canvas <dir>                  Canvas directory (required)
  --theme <file>                  Theme JSON (required unless --inventory)
  --stamp <file>                  ds-stamp.json: the design system was built from this theme
  --intents <a,b,c>               Allowed Button color values
  --naming                        Theme naming, inline weights and hand-written values
  --boards                        canvas.json pages and boards, board content, component pages, frames
  --ds-version <namespace>=<ver>  canvas.json installs this design-system version
  --recipes <file>                With --boards: each c-<name> board marks every axis value
                                  of its recipe (data-sg-cell="<axis>:<value>")
  --usage <file>                  With --naming: ds.usage.json, the colour descriptions and
                                  spacing token names the design system build reads
  --preset <file>                 With --boards: the preset source; its class names are read as
                                  text (never run) and checked like a board's
  --config <file>                 With --boards: the product's style-gen.config.json, the
                                  options its theme CSS is generated with
  --standard <file>               Additions file layered over the bundled standard
                                  (init, migrate: the file to write; default canvas-standard.json)
  --no-rule <id>                  Switch one rule off for this run (repeatable); the --standard
                                  file must hold disabledRules.<id>.reason, and the output
                                  prints "rules disabled: <ids>"
  --dry-run                       migrate: print the result, write nothing
  --inventory                     Print what the canvas uses (JSON) instead of checking

Output: one "<file>:<line> <message> [<rule>; <basis>]" line per violation, then
"<n> violation(s)". A "finding: ..." line is reported without failing the run and
ends with "FINDINGS: <k> in <n> files"; a clean run prints "OK: <n> files".

Exit codes: 0 ok, 1 violations, 2 usage error, an unreadable or unparsable input
(canvas, theme, stamp, canvas.json, recipes) or an invalid --standard.`,
  options: {
    canvas: { type: "string" },
    theme: { type: "string" },
    stamp: { type: "string" },
    intents: { type: "string" },
    standard: { type: "string" },
    "ds-version": { type: "string" },
    recipes: { type: "string" },
    usage: { type: "string" },
    preset: { type: "string" },
    config: { type: "string" },
    "no-rule": { type: "string", multiple: true },
    naming: { type: "boolean" },
    boards: { type: "boolean" },
    inventory: { type: "boolean" },
    "dry-run": { type: "boolean" },
  },
  allowPositionals: true,
  usageExitCode: 2,
  run: async (values, positionals, ctx) => {
    const sub = positionals.join(" ");
    const allowed = CANVAS_FLAGS[sub];
    if (allowed === undefined) {
      logger.error(`Usage: ${CANVAS_USAGE}`);
      return 2;
    }
    const stray = Object.keys(values).find(
      (key) => values[key] !== undefined && !allowed.includes(key),
    );
    if (stray !== undefined) {
      logger.error(`--${stray} is not valid for canvas ${sub}`);
      return 2;
    }
    const canvas = await import("./commands/canvas");
    if (sub === "standard init")
      return canvas.standardInitCommand(values, ctx.cwd);
    if (sub === "standard migrate")
      return canvas.standardMigrateCommand(values, ctx.cwd);
    return canvas.canvasCheckCommand(values, ctx.cwd);
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
  canvasCli,
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

// Rationale: documents/architecture.md#runts-why-runcli-returns-codes-and-parses-flags-in-two-passes
/**
 * The CLI, minus the process: parses `args`, runs the command and returns the
 * exit code (0 ok/help/version/cancel, 1 failure, 2 for `budget`/`canvas` usage).
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
    logger.error(errorMessage(error));
    logger.log(`\n${command.usage}\n`);
    return command.usageExitCode ?? 1;
  }

  return command.run(parsed.values, parsed.positionals, { cwd });
}
