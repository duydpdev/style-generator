// Fails when a committed theme.tokens.ts no longer matches its theme.json:
// runs `style-gen generate --check` inside every app that commits one.
// Needs `yarn build:all` first (it runs dist/cli/index.mjs).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
// The harness does not commit a tokens file: it reads the design-system's.
const APPS = [
  "examples/plain-react",
  "examples/plain-nuxt",
  "examples/design-system",
  "site",
];
const cliPath = path.join(repoRoot, "dist", "cli", "index.mjs");

const stale = [];
for (const dir of APPS) {
  const result = spawnSync(process.execPath, [cliPath, "generate", "--check"], {
    cwd: path.join(repoRoot, dir),
    stdio: "inherit",
  });
  if (result.status === 0) {
    console.log(`OK: ${dir}`);
  } else {
    console.error(`STALE: ${dir}`);
    stale.push(dir);
  }
}

if (stale.length > 0) {
  console.error(
    `Run \`yarn build:all\`, then \`node dist/cli/index.mjs generate\` in: ${stale.join(", ")}`,
  );
  process.exit(1);
}
