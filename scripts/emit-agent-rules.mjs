#!/usr/bin/env node
/**
 * Write `dist/agent/style-generator.md`, the rules file `style-gen init`
 * copies to `.claude/rules/style-generator.md`, from
 * `documents/agent-contract.md` and `package.json#version` (see
 * `agent-rules.mjs`).
 *
 * Runs as the last step of `yarn build`, after Vite empties `dist/`;
 * `yarn build:cli` (tsdown) cleans only `dist/cli`. Release CI sets the
 * version from the tag before building, so the stamp is the published one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { toAgentRules } from "./agent-rules.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error(
    "emit-agent-rules: dist/ does not exist; run `yarn build` first",
  );
  process.exit(1);
}

/** @type {{ version: string }} */
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const contract = readFileSync(
  join(root, "documents/agent-contract.md"),
  "utf8",
);

const outDir = join(dist, "agent");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "style-generator.md"),
  toAgentRules(contract, pkg.version),
);

console.log(`✓ emitted dist/agent/style-generator.md (${pkg.version})`);
