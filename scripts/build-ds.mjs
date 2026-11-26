// Kept for callers of `node scripts/build-ds.mjs`: runs `style-gen ds build` from this checkout's CLI bundle
// with the same flags. The builder lives in src/cli/commands/ds/.
//
// usage: node scripts/build-ds.mjs --theme <file> --config <file> --preset <file> --namespace <Name> --out <dir> [--name <title>]
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "dist",
  "cli",
  "index.mjs",
);
const result = spawnSync(
  process.execPath,
  [cli, "ds", "build", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
