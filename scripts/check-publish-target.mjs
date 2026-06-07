#!/usr/bin/env node
/**
 * Guard against publishing to the wrong registry.
 *
 * Verifies:
 *   - package.json#publishConfig.registry === https://registry.npmjs.org
 *   - package.json#publishConfig.access === public
 *   - .yarnrc.yml declares npmPublishRegistry + npmRegistryServer = npmjs.org
 *   - .yarnrc.yml scope override for @duydpdev points to npmjs.org
 *
 * Called by prepublishOnly and by CI before `yarn npm publish`.
 * Exits 1 on any mismatch.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED = "https://registry.npmjs.org";
const EXPECTED_SCOPE = "duydpdev";

let ok = true;
const fail = (msg) => {
  console.error(`\u2717 ${msg}`);
  ok = false;
};
const pass = (msg) => console.log(`\u2713 ${msg}`);

// --- package.json checks ---
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

if (pkg.publishConfig?.registry !== EXPECTED) {
  fail(
    `publishConfig.registry = ${pkg.publishConfig?.registry}, expected ${EXPECTED}`,
  );
} else {
  pass(`publishConfig.registry = ${EXPECTED}`);
}

if (pkg.publishConfig?.access !== "public") {
  fail(
    `publishConfig.access = ${pkg.publishConfig?.access}, expected "public"`,
  );
} else {
  pass(`publishConfig.access = public`);
}

// --- .yarnrc.yml checks (string-based; no YAML parser dep) ---
const yarnrc = readFileSync(resolve(root, ".yarnrc.yml"), "utf8");

const scanLine = (key, required = true) => {
  const re = new RegExp(`^\\s*${key}:\\s*"?([^"\\n]+)"?\\s*$`, "m");
  const m = yarnrc.match(re);
  if (!m) {
    if (required) fail(`.yarnrc.yml missing ${key}`);
    return null;
  }
  return m[1].trim();
};

const globalRegistry = scanLine("npmRegistryServer");
if (globalRegistry && globalRegistry !== EXPECTED) {
  fail(
    `.yarnrc.yml npmRegistryServer = ${globalRegistry}, expected ${EXPECTED}`,
  );
} else if (globalRegistry === EXPECTED) {
  pass(`.yarnrc.yml npmRegistryServer = ${EXPECTED}`);
}

const globalPublish = scanLine("npmPublishRegistry");
if (globalPublish && globalPublish !== EXPECTED) {
  fail(
    `.yarnrc.yml npmPublishRegistry = ${globalPublish}, expected ${EXPECTED}`,
  );
} else if (globalPublish === EXPECTED) {
  pass(`.yarnrc.yml npmPublishRegistry = ${EXPECTED}`);
}

// Scope block check
const scopeRe = new RegExp(
  `npmScopes:[\\s\\S]*?${EXPECTED_SCOPE}:[\\s\\S]*?npmRegistryServer:\\s*"?([^"\\n]+)"?`,
  "m",
);
const scopeMatch = yarnrc.match(scopeRe);
if (!scopeMatch) {
  fail(`.yarnrc.yml missing npmScopes.${EXPECTED_SCOPE}.npmRegistryServer`);
} else if (scopeMatch[1].trim() !== EXPECTED) {
  fail(
    `.yarnrc.yml npmScopes.${EXPECTED_SCOPE}.npmRegistryServer = ${scopeMatch[1]}, expected ${EXPECTED}`,
  );
} else {
  pass(
    `.yarnrc.yml npmScopes.${EXPECTED_SCOPE}.npmRegistryServer = ${EXPECTED}`,
  );
}

if (!ok) {
  console.error("\n\u2717 check-publish-target FAILED");
  process.exit(1);
}
console.log("\n\u2713 Publish target verified: npmjs.org (public)");
