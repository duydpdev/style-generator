import { parseArgs } from "node:util";

import { initCommand } from "./commands/init";
import { safelistCommand } from "./commands/safelist";
import { logger } from "./logger";

const args = process.argv.slice(2);
const options = {
  tw: {
    type: "string",
  },
  theme: {
    type: "string",
  },
  plugin: {
    type: "string",
  },
  dark: {
    type: "boolean",
  },
  out: {
    type: "string",
  },
  help: {
    type: "boolean",
    short: "h",
  },
  watch: {
    type: "boolean",
    short: "w",
  },
} as const;

try {
  const { values, positionals } = parseArgs({
    args,
    options,
    allowPositionals: true,
  });
  const command = positionals[0];

  if (values.help || !command) {
    logger.log(`
Usage: style-gen <command> [options]

Commands:
  init       Scaffold project files
  safelist   Generate safelist.txt

Options:
  --theme    Path to theme.json
  --plugin   Path to plugin file (init only)
  --tw       Tailwind version (init only, v3 or v4)
  --dark     Include dark mode (init only)
  --out      Path to output safelist (safelist only)
  -w, --watch Watch theme file for changes (safelist only)
  -h, --help Display help
`);
    process.exit(0);
  }

  if (command === "init") {
    await initCommand(values).catch((e: unknown) => {
      logger.error(e instanceof Error ? e.message : "Unknown error");
      process.exit(1);
    });
  } else if (command === "safelist") {
    safelistCommand({
      theme: values.theme,
      out: values.out,
      watch: values.watch,
    });
  } else {
    logger.error(`Unknown command: ${command}`);
    process.exit(1);
  }
} catch (error) {
  if (error instanceof Error) {
    logger.error(error.message);
  }
  process.exit(1);
}
