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

// --- .yarnrc.yml checks (line-based; no YAML parser dep) ---
const yarnrc = readFileSync(resolve(root, ".yarnrc.yml"), "utf8");
const lines = yarnrc.split(/\r?\n/);
const indentOf = (line) => line.length - line.trimStart().length;
const valueOf = (line, key) => {
  const m = line.match(new RegExp(`^\\s*${key}:\\s*"?([^"#]*?)"?\\s*(#.*)?$`));
  return m ? m[1].trim() : null;
};

// Top-level key only: an indented scope entry with the same name is not it.
const scanLine = (key, required = true) => {
  for (const line of lines) {
    if (indentOf(line) === 0) {
      const v = valueOf(line, key);
      if (v !== null) return v;
    }
  }
  if (required) fail(`.yarnrc.yml missing ${key}`);
  return null;
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
// Field inside the `npmScopes.<scope>` block only: stops at the next line
// indented at or above the scope key, so a sibling scope cannot satisfy it.
const scopeField = (field) => {
  const start = lines.findIndex((l) => /^npmScopes:\s*$/.test(l));
  if (start === -1) return null;
  let scopeIndent = -1;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const indent = indentOf(line);
    if (indent === 0) break;
    if (scopeIndent === -1) {
      if (new RegExp(`^\\s*${EXPECTED_SCOPE}:\\s*$`).test(line)) {
        scopeIndent = indent;
      }
      continue;
    }
    if (indent <= scopeIndent) break;
    const v = valueOf(line, field);
    if (v !== null) return v;
  }
  return null;
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
