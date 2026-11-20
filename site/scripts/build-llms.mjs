#!/usr/bin/env node
/**
 * Writes `llms.txt` (the docs as one index for AI tools) next to the built
 * site: a title, the package description, the site URL, then one section per
 * `group` of `src/lib/docs-meta.json`, sorted by `order`. Each entry links the
 * raw markdown on GitHub (what a fetcher can read without running the SPA) and
 * names the rendered page. Vietnamese twins are not listed.
 *
 * Runs after `vite build` (`yarn workspace site build`, cwd `site/`):
 * `--meta <file>` defaults to `src/lib/docs-meta.json`, `--out <file>` to
 * `dist/llms.txt`, both resolved against the current directory. The package
 * description is read from the root package.json. Exits 1 when the directory
 * of `--out` does not exist or the description is empty.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const RAW_BASE =
  "https://raw.githubusercontent.com/duydpdev/style-generator/main/";
const SITE_URL = "https://duydpdev.github.io/style-generator/";

/**
 * @param {string} flag - Option name such as `--out`
 * @param {string} fallback - Value when the option is absent
 * @returns {string} The option value
 */
function option(flag, fallback) {
  const at = process.argv.indexOf(flag);
  if (at === -1) return fallback;
  const value = process.argv[at + 1];
  if (value === undefined) throw new Error(`${flag} needs a value`);
  return value;
}

const metaPath = resolve(option("--meta", "src/lib/docs-meta.json"));
const outPath = resolve(option("--out", "dist/llms.txt"));

if (!existsSync(dirname(outPath))) {
  console.error(
    `build-llms: ${dirname(outPath)} does not exist; run vite build first`,
  );
  process.exit(1);
}

/** @type {{ description?: string }} */
const rootPackage = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
);
const description = rootPackage.description?.trim() ?? "";
if (description === "") {
  console.error("build-llms: package.json has no description");
  process.exit(1);
}

/** @type {Record<string, { slug: string, title: string, group: string, order: number }>} */
const meta = JSON.parse(readFileSync(metaPath, "utf8"));

/** @type {Map<string, { path: string, slug: string, title: string, order: number }[]>} */
const groups = new Map();
for (const [path, entry] of Object.entries(meta)) {
  const list = groups.get(entry.group) ?? [];
  list.push({ path, slug: entry.slug, title: entry.title, order: entry.order });
  groups.set(entry.group, list);
}

const lines = [
  "# @duydpdev/style-generator",
  "",
  `> ${description}`,
  "",
  `Site: ${SITE_URL}`,
  `Playground: ${SITE_URL}playground`,
];
for (const [group, entries] of groups) {
  lines.push("", `## ${group}`, "");
  for (const entry of entries.sort((a, b) => a.order - b.order)) {
    lines.push(
      `- [${entry.title}](${RAW_BASE}${entry.path}): ${SITE_URL}docs/${entry.slug}`,
    );
  }
}

writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`build-llms: wrote ${outPath}`);
