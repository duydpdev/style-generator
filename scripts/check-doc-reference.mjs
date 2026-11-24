#!/usr/bin/env node
/**
 * Reference gate of the rendered docs, three mechanical checks:
 *
 *  1. CLI flags. `dist/cli/index.mjs <command> --help` is run for every
 *     command; each long (`--flag`) and short (`-y`) flag it prints must appear
 *     in an inline code span of the command's section (the heading
 *     `` `style-gen <command>` `` up to the next heading of the same or a higher
 *     level) in `documents/reference/cli.md`.
 *  2. Config keys. `style-gen schema` writes the JSON Schema of
 *     `style-gen.config.json` into a scratch project; its `properties` are
 *     walked and each key must be defined in `documents/reference/options.md`:
 *       - a top-level key is defined where a table row, a list item or a
 *         heading starts with its inline code span (`$schema` included);
 *         a mention in running text does not count;
 *       - a child of a fixed-shape object (`spacing.enabled`) is defined by the
 *         dotted path in that position, or by its leaf name in an inline code
 *         span of the parent's section (the heading carrying the parent's name);
 *       - a per-category map (`coverage`: every child is an object of its own)
 *         needs each distinct leaf name (`prefixes`, `keys`, `opacities`) and
 *         each category name in an inline code span of the map's section, not
 *         every category x leaf pair;
 *       - records (`screens`) have no fixed keys to check.
 *  3. History phrases. No rendered page (README, `documents/**` except plans,
 *     brainstorm and migration guides) tells version history outside a fenced
 *     block: that is the changelog's and the migration guides' job.
 *
 * A span matches a flag or key when it equals it or continues it with a
 * separator (`--max-gzip <n>`, `--theme=<path>`, `spacing.enabled`), a span
 * listing flags (`-w, --watch`) is matched per comma-separated part; never as
 * a substring.
 *
 *   --root    repository root (default: the repo of this script)
 *
 * Needs `yarn build:all` first. Exit code 1 prints one line per violation.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { docMarkdownFiles, repoRootFromArgs } from "./doc-markdown.mjs";

const USAGE = "usage: check-doc-reference.mjs [--root <dir>]";
const COMMANDS = [
  "init",
  "generate",
  "doctor",
  "schema",
  "tokens",
  "budget",
  "canvas",
];
/** Commands whose `--help` legitimately lists no flag. */
const FLAGLESS = new Set(["doctor"]);
const HISTORY =
  /Changed in \d|[Ss]ince \d+\.\d|[Rr]emoved in \d|[Aa]dded in \d|[Nn]ew in \d/;
const CLI_PAGE = "documents/reference/cli.md";
const OPTIONS_PAGE = "documents/reference/options.md";

/**
 * @typedef {object} Line
 * @property {string} text - The line
 * @property {number} number - 1-based line number
 * @property {boolean} fenced - Whether it sits inside (or opens/closes) a fenced block
 */

/**
 * Splits a page into lines tagged with whether they sit inside a fenced block.
 * @param {string} text - Markdown source
 * @returns {Line[]} Tagged lines
 */
function tagLines(text) {
  /** @type {string | null} */
  let fence = null;
  return text.split("\n").map((line, i) => {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (m) fence = m[1];
      return { text: line, number: i + 1, fenced: m !== null };
    }
    if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
    return { text: line, number: i + 1, fenced: true };
  });
}

/**
 * Contents of the inline code spans of one line.
 * @param {string} line - A markdown line
 * @returns {string[]} The spans, trimmed
 */
function spansOf(line) {
  return [...line.matchAll(/(`+)(.+?)\1/g)].map((m) => m[2].trim());
}

/**
 * Every inline code span outside fenced blocks.
 * @param {Line[]} lines - Tagged lines
 * @returns {string[]} The spans
 */
function spansOfLines(lines) {
  return lines.filter((l) => !l.fenced).flatMap((l) => spansOf(l.text));
}

/**
 * Whether a span names a flag: equal, or followed by a space or `=`. A span
 * such as `-w, --watch` names both flags.
 * @param {string} span - Inline code span content
 * @param {string} flag - `--flag` or `-f`
 * @returns {boolean} Match
 */
function namesFlag(span, flag) {
  return span.split(",").some((part) => {
    const p = part.trim();
    return p === flag || p.startsWith(`${flag} `) || p.startsWith(`${flag}=`);
  });
}

/**
 * Whether a span names a config key: equal, or followed by `.` or a space.
 * @param {string} span - Inline code span content
 * @param {string} key - Config key
 * @returns {boolean} Match
 */
function namesKey(span, key) {
  return (
    span === key || span.startsWith(`${key}.`) || span.startsWith(`${key} `)
  );
}

/**
 * Lines of the section whose heading carries the inline code `code`: from
 * that heading to the next heading of the same or a higher level.
 * @param {Line[]} lines - Tagged lines
 * @param {string} code - Inline code content of the heading
 * @returns {Line[] | null} Section lines, `null` when no heading names it
 */
function sectionOf(lines, code) {
  /** @type {number} */
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    const m = l.fenced ? null : /^(#{1,6}) (.*)$/.exec(l.text);
    if (m === null) continue;
    if (start === -1) {
      if (spansOf(m[2]).includes(code)) {
        start = i;
        level = m[1].length;
      }
    } else if (m[1].length <= level) {
      return lines.slice(start, i);
    }
  }
  return start === -1 ? null : lines.slice(start);
}

/**
 * Reads a repo file.
 * @param {string} root - Repository root
 * @param {string} rel - POSIX repo-relative path
 * @returns {string | null} Text, `null` when the file is missing
 */
function readIfPresent(root, rel) {
  const file = join(root, rel);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

/**
 * Runs the built CLI.
 * @param {string} root - Repository root
 * @param {string[]} args - CLI arguments
 * @param {string} cwd - Working directory
 * @returns {{ stdout: string } | { error: string }} Its stdout, or why the run failed
 */
function runCli(root, args, cwd) {
  const entry = join(root, "dist/cli/index.mjs");
  if (!existsSync(entry)) {
    return { error: `${entry} is missing; run yarn build:all` };
  }
  const r = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (r.error) return { error: r.error.message };
  if (r.status !== 0) {
    return { error: `exited with ${String(r.status)}: ${r.stderr.trim()}` };
  }
  return { stdout: r.stdout };
}

/**
 * Flags printed by `style-gen <command> --help`.
 * @param {string} root - Repository root
 * @param {string} command - CLI command
 * @returns {{ flags: string[] } | { error: string }} The distinct flags, or why none could be read
 */
function helpFlags(root, command) {
  const run = runCli(root, [command, "--help"], root);
  const label = `\`style-gen ${command} --help\``;
  if ("error" in run) return { error: `${label} ${run.error}` };
  if (run.stdout.trim() === "") return { error: `${label} printed nothing` };
  const flags = [
    ...new Set([
      ...(run.stdout.match(/--[a-z][a-z-]*/g) ?? []),
      ...(run.stdout.match(/(?<![\w-])-[a-z](?![\w-])/g) ?? []),
    ]),
  ];
  if (flags.length === 0 && !FLAGLESS.has(command)) {
    return { error: `${label} lists no flag` };
  }
  return { flags };
}

/**
 * Check 1: every flag of every command's `--help` is documented.
 * @param {string} root - Repository root
 * @returns {{ errors: string[], flags: number }} Violations and the flag count
 */
function cliErrors(root) {
  /** @type {string[]} */
  const errors = [];
  const page = readIfPresent(root, CLI_PAGE);
  if (page === null)
    return { errors: [`${CLI_PAGE}: page is missing`], flags: 0 };
  const lines = tagLines(page);
  let flags = 0;
  for (const command of COMMANDS) {
    const section = sectionOf(lines, `style-gen ${command}`);
    if (section === null) {
      errors.push(`cli.md: no section for \`style-gen ${command}\``);
      continue;
    }
    const help = helpFlags(root, command);
    if ("error" in help) {
      errors.push(`cli.md: ${help.error}`);
      continue;
    }
    const spans = spansOfLines(section);
    for (const flag of help.flags) {
      flags += 1;
      if (!spans.some((s) => namesFlag(s, flag))) {
        errors.push(`cli.md: style-gen ${command} does not document ${flag}`);
      }
    }
  }
  return { errors, flags };
}

/**
 * Inline code spans that start a table row, a list item or a heading: where a
 * page defines a name, as opposed to running text that merely mentions it.
 * @param {Line[]} lines - Tagged lines
 * @returns {string[]} The spans
 */
function definitionSpans(lines) {
  /** @type {string[]} */
  const spans = [];
  for (const l of lines) {
    if (l.fenced) continue;
    const row = /^\s*\|([^|]*)\|/.exec(l.text);
    if (row !== null) {
      spans.push(...spansOf(row[1]));
      continue;
    }
    const heading = /^#{1,6} (.*)$/.exec(l.text);
    if (heading !== null) {
      spans.push(...spansOf(heading[1]));
      continue;
    }
    const item = /^\s*(?:[-*+]|\d+[.)])\s+((`+).+?\2)/.exec(l.text);
    if (item !== null) spans.push(...spansOf(item[1]));
  }
  return spans;
}

/**
 * Whether a span mentions a name as a whole word (`{ prefixes: [...] }` and
 * `prefixes` mention `prefixes`; `skip-rules` does not mention `rules`).
 * @param {string} span - Inline code span content
 * @param {string} name - Key name
 * @returns {boolean} Match
 */
function mentionsName(span, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w$.-])${escaped}(?![\\w-])`).test(span);
}

/**
 * The `properties` of a schema node that has fixed keys: its own, or those of
 * the first `anyOf` member that has them (`boolean | { … }`).
 * @param {unknown} node - JSON Schema node
 * @returns {Record<string, unknown> | null} Fixed keys, `null` for records and scalars
 */
function fixedKeys(node) {
  if (node === null || typeof node !== "object") return null;
  const n = /** @type {{ properties?: unknown, anyOf?: unknown }} */ (node);
  if (n.properties !== null && typeof n.properties === "object") {
    return /** @type {Record<string, unknown>} */ (n.properties);
  }
  if (Array.isArray(n.anyOf)) {
    for (const member of n.anyOf) {
      const keys = fixedKeys(member);
      if (keys !== null) return keys;
    }
  }
  return null;
}

/**
 * @typedef {object} KeyRequirement
 * @property {string[]} path - Key path from the schema root
 * @property {string[]} [categories] - Per-category map: the category names
 * @property {string[]} [leaves] - Per-category map: the distinct leaf names
 */

/**
 * Walks a schema's `properties` into what the page must define: every key of
 * a fixed-shape object, and for a per-category map (every child an object of
 * its own) the category names and the distinct leaf names, not their product.
 * @param {Record<string, unknown>} properties - `properties` of a schema node
 * @param {string[]} [parent] - Path of the node
 * @returns {KeyRequirement[]} The requirements, parents before children
 */
function keyRequirements(properties, parent = []) {
  /** @type {KeyRequirement[]} */
  const out = [];
  for (const [key, value] of Object.entries(properties)) {
    const path = [...parent, key];
    out.push({ path });
    const children = fixedKeys(value);
    if (children === null) continue;
    const entries = Object.entries(children);
    if (entries.length > 0 && entries.every(([, c]) => fixedKeys(c) !== null)) {
      const leaves = new Set(
        entries.flatMap(([, c]) => Object.keys(fixedKeys(c) ?? {})),
      );
      out.push({
        path,
        categories: entries.map(([k]) => k),
        leaves: [...leaves],
      });
    } else {
      out.push(...keyRequirements(children, path));
    }
  }
  return out;
}

/**
 * Violations of one requirement.
 * @param {KeyRequirement} req - What the page must define
 * @param {Line[]} lines - Tagged lines of the page
 * @param {string[]} defined - `definitionSpans(lines)`
 * @returns {string[]} Violations
 */
function requirementErrors(req, lines, defined) {
  const dotted = req.path.join(".");
  const name = req.path[req.path.length - 1];
  if (req.categories !== undefined && req.leaves !== undefined) {
    const section = sectionOf(lines, name);
    if (section === null) {
      return [`options.md: no section for \`${name}\` to define its keys`];
    }
    const spans = spansOfLines(section);
    return [...req.categories, ...req.leaves]
      .filter((k) => !spans.some((s) => mentionsName(s, k)))
      .map(
        (k) =>
          `options.md: config key ${dotted}.${k} is not documented in the \`${name}\` section`,
      );
  }
  if (defined.some((s) => namesKey(s, dotted))) return [];
  if (req.path.length > 1) {
    const parent = req.path[req.path.length - 2];
    const section = sectionOf(lines, parent);
    if (
      section !== null &&
      spansOfLines(section).some((s) => mentionsName(s, name))
    ) {
      return [];
    }
  }
  return [`options.md: config key ${dotted} is not documented`];
}

/**
 * Check 2: every key of the config's JSON Schema, nested ones included, is
 * documented.
 * @param {string} root - Repository root
 * @returns {{ errors: string[], keys: number }} Violations and the key count
 */
function configErrors(root) {
  const page = readIfPresent(root, OPTIONS_PAGE);
  if (page === null) {
    return { errors: [`${OPTIONS_PAGE}: page is missing`], keys: 0 };
  }
  const scratch = mkdtempSync(join(tmpdir(), "doc-reference-"));
  try {
    writeFileSync(join(scratch, "style-gen.config.json"), "{}\n");
    const run = runCli(
      root,
      [
        "schema",
        "--out",
        "theme.schema.json",
        "--config-out",
        "config.schema.json",
      ],
      scratch,
    );
    if ("error" in run) {
      return {
        errors: [`options.md: \`style-gen schema\` ${run.error}`],
        keys: 0,
      };
    }
    /** @type {{ properties?: Record<string, unknown> }} */
    const schema = JSON.parse(
      readFileSync(join(scratch, "config.schema.json"), "utf8"),
    );
    const requirements = keyRequirements(schema.properties ?? {});
    if (requirements.length === 0) {
      return { errors: ["options.md: the config schema has no keys"], keys: 0 };
    }
    const lines = tagLines(page);
    const defined = definitionSpans(lines);
    const errors = requirements.flatMap((r) =>
      requirementErrors(r, lines, defined),
    );
    return {
      errors,
      keys: requirements.filter((r) => r.categories === undefined).length,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Check 3: no rendered page tells version history.
 * @param {string} root - Repository root
 * @returns {{ errors: string[], files: number }} Violations and the page count
 */
function historyErrors(root) {
  /** @type {string[]} */
  const errors = [];
  const files = docMarkdownFiles(root).filter((f) => existsSync(join(root, f)));
  for (const file of files) {
    const text = readFileSync(join(root, file), "utf8");
    for (const l of tagLines(text)) {
      if (!l.fenced && HISTORY.test(l.text)) {
        errors.push(
          `${file}:${String(l.number)}: version history belongs in the changelog or a migration guide`,
        );
      }
    }
  }
  return { errors, files: files.length };
}

/**
 * Entry point.
 * @returns {number} Process exit code
 */
function main() {
  const args = process.argv.slice(2);
  if (args.some((a, i) => a !== "--root" && args[i - 1] !== "--root")) {
    console.error(USAGE);
    return 2;
  }
  const root = repoRootFromArgs(process.argv, import.meta.url);
  const cli = cliErrors(root);
  const config = configErrors(root);
  const history = historyErrors(root);
  const errors = [...cli.errors, ...config.errors, ...history.errors];
  for (const e of errors) console.error(e);
  if (errors.length > 0) return 1;
  console.log(
    `OK: ${String(cli.flags)} CLI flags across ${String(COMMANDS.length)} commands, ${String(config.keys)} config keys documented, ${String(history.files)} pages free of version history`,
  );
  return 0;
}

process.exitCode = main();
