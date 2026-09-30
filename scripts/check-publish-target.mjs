#!/usr/bin/env node
/**
 * Guard against publishing to the wrong registry.
 *
 * Publish target = GitHub Packages (scoped @duydpdev). Dependency installs
 * still resolve from npmjs.org via the global registry.
 *
 * Verifies:
 *   - package.json#publishConfig.registry === https://npm.pkg.github.com
 *   - package.json#publishConfig.access is "restricted" or "public"
 *   - .yarnrc.yml global npmRegistryServer === https://registry.npmjs.org (deps)
 *   - .yarnrc.yml scope @duydpdev npmRegistryServer === GitHub Packages
 *   - .yarnrc.yml scope @duydpdev npmPublishRegistry === GitHub Packages
 *
 * Called by prepublish and by CI before `yarn npm publish`.
 * Exits 1 on any mismatch.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PUBLISH = "https://npm.pkg.github.com";
const EXPECTED_GLOBAL = "https://registry.npmjs.org";
const EXPECTED_SCOPE = "duydpdev";

let ok = true;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  ok = false;
};
const pass = (msg) => console.log(`✓ ${msg}`);

// --- package.json checks ---
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

if (pkg.publishConfig?.registry !== EXPECTED_PUBLISH) {
  fail(
    `publishConfig.registry = ${pkg.publishConfig?.registry}, expected ${EXPECTED_PUBLISH}`,
  );
} else {
  pass(`publishConfig.registry = ${EXPECTED_PUBLISH}`);
}

const access = pkg.publishConfig?.access;
if (access !== "restricted" && access !== "public") {
  fail(`publishConfig.access = ${access}, expected "restricted" or "public"`);
} else {
  pass(`publishConfig.access = ${access}`);
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

// Global registry must stay on npmjs so dependency installs keep working.
const globalRegistry = scanLine("npmRegistryServer");
if (globalRegistry && globalRegistry !== EXPECTED_GLOBAL) {
  fail(
    `.yarnrc.yml global npmRegistryServer = ${globalRegistry}, expected ${EXPECTED_GLOBAL}`,
  );
} else if (globalRegistry === EXPECTED_GLOBAL) {
  pass(`.yarnrc.yml global npmRegistryServer = ${EXPECTED_GLOBAL}`);
}

// Scope block must point at GitHub Packages for both resolve + publish.
const scopeField = (field) => {
  const re = new RegExp(
    `npmScopes:[\\s\\S]*?${EXPECTED_SCOPE}:[\\s\\S]*?${field}:\\s*"?([^"\\n]+)"?`,
    "m",
  );
  const m = yarnrc.match(re);
  return m ? m[1].trim() : null;
};

for (const field of ["npmRegistryServer", "npmPublishRegistry"]) {
  const val = scopeField(field);
  if (!val) {
    fail(`.yarnrc.yml missing npmScopes.${EXPECTED_SCOPE}.${field}`);
  } else if (val !== EXPECTED_PUBLISH) {
    fail(
      `.yarnrc.yml npmScopes.${EXPECTED_SCOPE}.${field} = ${val}, expected ${EXPECTED_PUBLISH}`,
    );
  } else {
    pass(
      `.yarnrc.yml npmScopes.${EXPECTED_SCOPE}.${field} = ${EXPECTED_PUBLISH}`,
    );
  }
}

if (!ok) {
  console.error("\n✗ check-publish-target FAILED");
  process.exit(1);
}
console.log("\n✓ Publish target verified: GitHub Packages (@duydpdev)");
