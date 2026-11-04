#!/usr/bin/env node
/**
 * Drift gate of the Vietnamese docs mirror. Every markdown file the site
 * renders (the keys of `site/src/lib/docs-meta.json`) has a twin under
 * `documents/vi/` (`README.md` → `documents/vi/README.md`, `documents/<p>`
 * → `documents/vi/<p>`). Each twin must:
 *
 *   - start with `<!-- source: <en path> sha256: <hash> -->`, <hash> being
 *     the first 12 hex digits of the sha256 of the English file (LF line
 *     endings) as committed, i.e. after `yarn docs:embed`;
 *   - have the same heading levels in the same order, each with the same
 *     inline code spans;
 *   - have the same doc-script markers (`<!-- embed: -->`, `<!-- signature: -->`,
 *     `<!-- /signature -->`, `<!-- snippet: -->`) and GitHub alert lines
 *     (`> [!NOTE]` …), in order;
 *   - have byte-identical fenced code blocks and signature blocks;
 *   - be Unicode NFC (heading anchors are compared byte-wise).
 *
 * Without --only, a `.md` file under `documents/vi/` that is no twin fails.
 *
 *   --only <path>        check only the twins equal to <path> or under the
 *                        directory <path> (repeatable)
 *   --write-hash <file>  first record the current source hash on line 1 of
 *                        that twin (repeatable); only after its text matches
 *                        the current English file
 *   --untranslated       also fail on prose lines copied verbatim from the
 *                        English file (5+ words outside code)
 *   --root <dir>         repository root (default: the repo of this script)
 *
 * Workflow: documents/README.md, section "Vietnamese mirror (vi/)".
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  parseFences,
  repoRootFromArgs,
  SOURCE_LINE,
  sourceHash,
  VI_DIR,
  viTwinOf,
} from "./doc-markdown.mjs";

const USAGE =
  "usage: check-docs-i18n.mjs [--only <path>]... [--write-hash <vi file>]... [--untranslated] [--root <dir>]";
const META = "site/src/lib/docs-meta.json";
const MARKER =
  /^(?:<!-- (?:embed:|signature:|\/signature -->|snippet:)|> ?\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\])/;
// eslint-disable-next-line sonarjs/slow-regex -- runs on this repo's own markdown, never on untrusted input
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*)$/;
const SIGNATURE_OPEN = "<!-- signature:";
const SIGNATURE_CLOSE = "<!-- /signature -->";
const MIN_UNTRANSLATED_WORDS = 5;

/**
 * @typedef {object} Args
 * @property {string[]} only - `--only` values without a trailing `/`
 * @property {string[]} writeHash - `--write-hash` values
 * @property {boolean} untranslated - Whether `--untranslated` was given
 */

/**
 * @param {string[]} argv - Arguments after the script path
 * @returns {Args | null} The arguments, `null` on a usage error
 */
function parseArgs(argv) {
  /** @type {Args} */
  const args = { only: [], writeHash: [], untranslated: false };
  let i = 0;
  while (i < argv.length) {
    const flag = argv[i];
    if (flag === "--untranslated") {
      args.untranslated = true;
      i += 1;
      continue;
    }
    const value = argv[i + 1];
    if (
      !["--root", "--only", "--write-hash"].includes(flag) ||
      value === undefined ||
      value.startsWith("--")
    ) {
      return null;
    }
    if (flag === "--only") {
      args.only.push(value.endsWith("/") ? value.slice(0, -1) : value);
    }
    if (flag === "--write-hash") args.writeHash.push(value);
    i += 2;
  }
  return args;
}

/**
 * @param {string} root - Repository root
 * @param {string} rel - Repo-relative path
 * @returns {string} File text with LF line endings
 */
function readLf(root, rel) {
  return readFileSync(join(root, rel), "utf8").replace(/\r\n/g, "\n");
}

/**
 * @typedef {object} Heading
 * @property {number} level - 1 to 6
 * @property {string} text - Heading text
 * @property {string[]} codes - Its inline code spans, in order
 */

/**
 * @typedef {object} Outline
 * @property {Heading[]} headings - Headings outside fences
 * @property {string[]} markers - Trimmed marker lines outside fences
 * @property {{ key: string, line: number }[]} fences - Each fence (indent, info word, body) and its 1-based line
 * @property {string[]} signatures - Raw text of each signature block
 * @property {{ text: string, line: number }[]} prose - Trimmed prose lines (no heading, comment or signature block)
 */

/**
 * @param {string} text - Markdown with LF line endings
 * @returns {Outline} The parts the twins must share
 * @throws {Error} `unclosed fence at line <n>` from `parseFences`
 */
function outline(text) {
  const lines = text.split("\n");
  const parsed = parseFences(text);
  const fenced = new Set();
  for (const f of parsed) {
    for (let i = f.open; i <= f.close; i++) fenced.add(i);
  }
  /** @type {Outline} */
  const out = {
    headings: [],
    markers: [],
    fences: parsed.map((f) => ({
      key: `${f.indent}${f.lang}\n${f.body.join("\n")}`,
      line: f.open + 1,
    })),
    signatures: [],
    prose: [],
  };
  let signatureAt = -1;
  lines.forEach((line, i) => {
    if (fenced.has(i)) return;
    const trimmed = line.trim();
    if (trimmed.startsWith(SIGNATURE_OPEN)) signatureAt = i;
    if (MARKER.test(trimmed)) out.markers.push(trimmed);
    const heading = HEADING.exec(line);
    if (heading) {
      out.headings.push({
        level: heading[1].length,
        text: heading[2].trim(),
        codes: [...heading[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]),
      });
    } else if (
      signatureAt < 0 &&
      trimmed !== "" &&
      !trimmed.startsWith("<!--")
    ) {
      out.prose.push({ text: trimmed, line: i + 1 });
    }
    if (trimmed === SIGNATURE_CLOSE && signatureAt >= 0) {
      out.signatures.push(lines.slice(signatureAt, i + 1).join("\n"));
      signatureAt = -1;
    }
  });
  return out;
}

/**
 * @param {string[]} a - English sequence
 * @param {string[]} b - Vietnamese sequence
 * @returns {number} First index where they differ, -1 when equal
 */
function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return -1;
}

/**
 * @param {Heading | undefined} h - A heading
 * @returns {string} Its comparison key
 */
function headingKey(h) {
  return h ? `h${String(h.level)} ${h.codes.join(" ")}` : "(none)";
}

/**
 * @param {Heading | undefined} h - A heading
 * @returns {string} Readable form for messages
 */
function describeHeading(h) {
  return h ? `h${String(h.level)} "${h.text}"` : "nothing";
}

/**
 * Checks line 1 of a twin (the source marker) and that it is Unicode NFC.
 * @param {string} viText - Twin text with LF line endings
 * @param {string} en - English path
 * @param {string} vi - Twin path
 * @param {string} hash - Current source hash of the English file
 * @param {string[]} errors - Receives one message per problem
 * @returns {void}
 */
function checkSource(viText, en, vi, hash, errors) {
  const source = SOURCE_LINE.exec(viText.split("\n")[0]);
  if (!source) {
    errors.push(
      `${vi}:1: expected "<!-- source: ${en} sha256: ${hash} -->"; after translating, run yarn check:docs-i18n --write-hash ${vi}`,
    );
  } else if (source[1] !== en) {
    errors.push(`${vi}:1: source is ${source[1]}, expected ${en}`);
  } else if (source[2] !== hash) {
    errors.push(
      `${vi}: ${en} changed since it was translated (sha256 ${source[2]} → ${hash}); update the Vietnamese text, then run yarn check:docs-i18n --write-hash ${vi}`,
    );
  }
  if (viText !== viText.normalize("NFC")) {
    errors.push(`${vi}: not Unicode NFC; save it as NFC`);
  }
}

/**
 * Compares one twin with its English source.
 * @param {string} root - Repository root
 * @param {string} en - English path
 * @param {string} vi - Twin path
 * @param {boolean} untranslated - Also report copied English prose
 * @param {string[]} errors - Receives one message per problem
 * @returns {void}
 */
function checkPair(root, en, vi, untranslated, errors) {
  if (!existsSync(join(root, en))) {
    errors.push(`${en}: listed in ${META} but missing`);
    return;
  }
  if (!existsSync(join(root, vi))) {
    errors.push(`${vi}: missing (Vietnamese twin of ${en})`);
    return;
  }
  const enText = readLf(root, en);
  const viText = readLf(root, vi);
  const hash = sourceHash(enText);
  checkSource(viText, en, vi, hash, errors);
  let a;
  let b;
  try {
    a = outline(enText);
    b = outline(viText);
  } catch (e) {
    errors.push(`${vi}: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  const h = firstDiff(a.headings.map(headingKey), b.headings.map(headingKey));
  if (h >= 0) {
    errors.push(
      `${vi}: heading ${String(h + 1)} is ${describeHeading(b.headings[h])} but ${en} has ${describeHeading(a.headings[h])} (same levels and inline code, in order)`,
    );
  }
  const m = firstDiff(a.markers, b.markers);
  if (m >= 0) {
    errors.push(
      `${vi}: marker ${String(m + 1)} is "${b.markers[m] ?? "(none)"}" but ${en} has "${a.markers[m] ?? "(none)"}"`,
    );
  }
  if (a.fences.length !== b.fences.length) {
    errors.push(
      `${vi}: ${String(b.fences.length)} code blocks, ${en} has ${String(a.fences.length)}`,
    );
  } else {
    const f = firstDiff(
      a.fences.map((x) => x.key),
      b.fences.map((x) => x.key),
    );
    if (f >= 0) {
      errors.push(
        `${vi}:${String(b.fences[f].line)}: code block ${String(f + 1)} differs from ${en}; code blocks are copied verbatim`,
      );
    }
  }
  const s = firstDiff(a.signatures, b.signatures);
  if (s >= 0) {
    errors.push(
      `${vi}: signature block ${String(s + 1)} differs from ${en}; copy it verbatim`,
    );
  }
  if (untranslated) reportUntranslated(a, b, vi, errors);
}

/**
 * Reports prose lines of the twin that are copied verbatim from the English
 * file and read as English (`MIN_UNTRANSLATED_WORDS` or more words).
 * @param {Outline} a - English outline
 * @param {Outline} b - Vietnamese outline
 * @param {string} vi - Twin path
 * @param {string[]} errors - Receives one message per line
 * @returns {void}
 */
function reportUntranslated(a, b, vi, errors) {
  const english = new Set(a.prose.map((p) => p.text));
  for (const p of b.prose) {
    if (!english.has(p.text)) continue;
    const words =
      p.text
        .replace(/`[^`]*`/g, " ")
        .replace(/\]\([^)]*\)/g, "]")
        .match(/\b[A-Za-z]{2,}\b/g) ?? [];
    if (words.length >= MIN_UNTRANSLATED_WORDS) {
      errors.push(
        `${vi}:${String(p.line)}: untranslated line "${p.text.slice(0, 80)}"`,
      );
    }
  }
}

/**
 * @param {string} root - Repository root
 * @returns {string[]} Sorted POSIX paths of every `.md` under `documents/vi/`
 */
function viFiles(root) {
  /** @type {string[]} */
  const found = [];
  /**
   * @param {string} rel - Directory relative to the root
   * @returns {void}
   */
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      const path = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".md")) found.push(path);
    }
  };
  if (existsSync(join(root, VI_DIR))) walk(VI_DIR);
  return found.sort();
}

/**
 * Implements `--write-hash`: records the current source hash on line 1 of
 * each named twin. Every target is validated before the first write, so a
 * usage error leaves every file untouched; the twin's line endings are kept.
 * @param {string} root - Repository root
 * @param {string[]} writeHash - `--write-hash` values
 * @param {{ en: string, vi: string }[]} pairs - Every English file and its twin
 * @returns {number} 0 when every twin was written, 2 on a usage error
 */
function recordHashes(root, writeHash, pairs) {
  const targets = [];
  for (const vi of writeHash) {
    const pair = pairs.find((p) => p.vi === vi);
    if (!pair) {
      console.error(
        `check-docs-i18n: ${vi} is not the twin of a file in ${META}`,
      );
      return 2;
    }
    if (!existsSync(join(root, vi)) || !existsSync(join(root, pair.en))) {
      console.error(`check-docs-i18n: ${vi} or ${pair.en} not found`);
      return 2;
    }
    targets.push({ vi, en: pair.en });
  }
  for (const { vi, en } of targets) {
    const hash = sourceHash(readLf(root, en));
    const line = `<!-- source: ${en} sha256: ${hash} -->`;
    const text = readFileSync(join(root, vi), "utf8");
    const eol = text.includes("\r\n") ? "\r\n" : "\n";
    const lines = text.split(/\r?\n/);
    const next = SOURCE_LINE.test(lines[0])
      ? [line, ...lines.slice(1)].join(eol)
      : `${line}${eol}${eol}${text}`;
    writeFileSync(join(root, vi), next);
    console.log(`check-docs-i18n: ${vi} records sha256 ${hash} of ${en}`);
  }
  return 0;
}

/**
 * Reports every `.md` under `documents/vi/` that is not the twin of a file in
 * the docs meta.
 * @param {string} root - Repository root
 * @param {{ en: string, vi: string }[]} pairs - Every English file and its twin
 * @param {string[]} errors - Receives one message per orphan
 * @returns {void}
 */
function reportOrphans(root, pairs, errors) {
  const twins = new Set(pairs.map((p) => p.vi));
  for (const file of viFiles(root)) {
    if (!twins.has(file)) {
      errors.push(`${file}: no English source in ${META}`);
    }
  }
}

/**
 * Entry point.
 * @returns {number} Process exit code
 */
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(USAGE);
    return 2;
  }
  const root = repoRootFromArgs(process.argv, import.meta.url);
  if (!existsSync(join(root, META))) {
    console.error(`check-docs-i18n: ${join(root, META)} not found`);
    return 2;
  }
  const pairs = Object.keys(JSON.parse(readLf(root, META))).map((en) => ({
    en,
    vi: viTwinOf(en),
  }));
  const recorded = recordHashes(root, args.writeHash, pairs);
  if (recorded !== 0) return recorded;
  /**
   * @param {string} vi - Twin path
   * @param {string} o - An --only value
   * @returns {boolean} Whether the value selects the twin
   */
  const selects = (vi, o) => vi === o || vi.startsWith(`${o}/`);
  for (const o of args.only) {
    if (!pairs.some((p) => selects(p.vi, o))) {
      console.error(`check-docs-i18n: --only ${o} selects no twin`);
      return 2;
    }
  }
  const selected =
    args.only.length === 0
      ? pairs
      : pairs.filter((p) => args.only.some((o) => selects(p.vi, o)));
  /** @type {string[]} */
  const errors = [];
  for (const { en, vi } of selected) {
    checkPair(root, en, vi, args.untranslated, errors);
  }
  if (args.only.length === 0) reportOrphans(root, pairs, errors);
  for (const e of errors) console.error(e);
  if (errors.length > 0) {
    console.error(
      `check-docs-i18n: ${String(errors.length)} problem(s); workflow: documents/README.md, section "Vietnamese mirror (vi/)"`,
    );
    return 1;
  }
  console.log(
    `check-docs-i18n: ${String(selected.length)} Vietnamese twins match their English source`,
  );
  return 0;
}

process.exitCode = main();
