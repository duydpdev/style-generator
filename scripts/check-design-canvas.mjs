/**
 * Deprecated: forwards to `style-gen canvas check` (the repository's built
 * CLI) and exits with its status. Run `yarn build:cli` first.
 *
 * It spawns the CLI instead of importing it, because the CLI entry runs as
 * soon as it is imported.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../dist/cli/index.mjs", import.meta.url));

process.stderr.write(
  "check-design-canvas.mjs is deprecated: use style-gen canvas check\n",
);
// Exit 1 means violations; a missing build is an input error, like the CLI's own.
if (!existsSync(cli)) {
  process.stderr.write(`${cli} not found: run yarn build:cli first\n`);
  process.exit(2);
}
const child = spawnSync(
  process.execPath,
  [cli, "canvas", "check", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
if (child.error) process.stderr.write(`${child.error.message}\n`);
process.exitCode = child.status ?? 2;
