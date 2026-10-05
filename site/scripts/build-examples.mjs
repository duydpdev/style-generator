#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..");

// The react example is built with a relative base so the prebuilt index.html
// references `./assets/...` and works wherever the site serves public/examples.
const EXAMPLE_BASE = "./";

const EXAMPLES = [
  {
    name: "v4",
    workspace: "react-v4-example",
    sourceDist: resolve(repoRoot, "examples/react-v4/dist"),
  },
];

const targetRoot = resolve(siteRoot, "public/examples");
if (existsSync(targetRoot))
  rmSync(targetRoot, { recursive: true, force: true });
mkdirSync(targetRoot, { recursive: true });

for (const ex of EXAMPLES) {
  console.log(`[build-examples] ${ex.name} → base ${EXAMPLE_BASE}`);

  const result = spawnSync("yarn", ["workspace", ex.workspace, "build"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, EXAMPLE_BASE },
  });
  if (result.status !== 0) {
    console.error(`[build-examples] ${ex.name} build failed`);
    process.exit(result.status ?? 1);
  }

  if (!existsSync(ex.sourceDist)) {
    console.error(`[build-examples] missing dist at ${ex.sourceDist}`);
    process.exit(1);
  }

  const target = resolve(targetRoot, ex.name);
  cpSync(ex.sourceDist, target, { recursive: true });
  console.log(`[build-examples] copied → ${target}`);
}

console.log("[build-examples] done");
