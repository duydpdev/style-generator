/**
 * `--boards` and `--ds-version` rules over `canvas.json` and the board files:
 * pages, core boards and their order, one `c-*` board per design-system
 * component, board content (sections, theme literals, provenance), component
 * pages and frames.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  asArray,
  asRecord,
  dcImports,
  isPlainObject,
  jsonBlocks,
  lineIndex,
  previewSize,
  rootElement,
  sectionIds,
  styleDeclarations,
} from "./parseHtml";
import { canvasFiles, readJson, readText } from "./scan";
import type { Standard } from "./standardSchema";

/** `--ds-version <namespace>=<version>`. */
export interface DsVersion {
  namespace: string;
  version: string;
}

/** What the manifest asks of one core board. */
type ContentRule = NonNullable<Standard["content"]>[string];

/** Page and file prefix of the component source boards. */
type SourceBoards = NonNullable<Standard["sourceBoards"]>;

/** Kebab-cased design-system component names and the source board prefix. */
interface ComponentSources {
  dsNames: Set<string>;
  prefix: string;
}

/** What the board rules read from the check options; paths are absolute. */
export interface BoardOptions {
  boards: boolean;
  stamp?: string | undefined;
  dsVersion?: DsVersion | undefined;
  /** The canvas directory as the user wrote it, for input errors. */
  canvasLabel?: string | undefined;
  /** The stamp file as the user wrote it, for input errors. */
  stampLabel?: string | undefined;
}

/** Reads one board by its path relative to the canvas directory. */
type ReadBoard = (file: string) => string;

/**
 * A value copied from a board, `canvas.json` or a stamp into a message: JSON,
 * at most 80 characters, so it can never start a line of its own.
 * @param {unknown} value - Any value
 * @returns {string} The echo
 */
function echo(value: unknown): string {
  // JSON.stringify returns undefined for undefined, functions and symbols.
  const text = (JSON.stringify(value) as string | undefined) ?? String(value);
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/**
 * A name or number copied into a message: as is when it is a plain token,
 * else `echo(value)`.
 * @param {unknown} value - Any value
 * @returns {string} The label
 */
function token(value: unknown): string {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && /^[\w.-]{1,80}$/.test(value)
    ? value
    : echo(value);
}

/**
 * Board messages of `canvas.json`: pages, core boards and their order,
 * one board per design-system component.
 * @param {Record<string, unknown>} canvasJson - Parsed `canvas.json`
 * @param {Set<string>} files - `*.dc.html` paths present in the canvas
 * @param {Standard} standard - Manifest
 * @returns {string[]} Messages without a location
 */
function boardViolations(
  canvasJson: Record<string, unknown>,
  files: Set<string>,
  standard: Standard,
): string[] {
  const pages = asArray(canvasJson.pages).map(asRecord);
  const out: (string | null)[] = standard.pages.map((page) => {
    const found = pages.find((p) => p.id === page.id);
    if (!found) return `missing page ${page.id}`;
    return found.name === page.name
      ? null
      : `page ${page.id} is named ${echo(found.name)}, expected "${page.name}"`;
  });
  const boards = asRecord(canvasJson.boards);
  /**
   * @param {string} file - Board file
   * @returns {Record<string, unknown> | null} Its `canvas.json` entry when the file exists too
   */
  const present = (file: string): Record<string, unknown> | null =>
    files.has(file) && file in boards ? asRecord(boards[file]) : null;
  for (const { file, page, title } of standard.boards)
    out.push(
      boardMessage(file, present(file), page, "core", (t) =>
        t === title
          ? null
          : `board ${file} title ${echo(t)}, expected "${title}"`,
      ),
    );
  const order = asArray(canvasJson.order);
  const indexes = standard.boards
    .filter((b) => present(b.file) !== null)
    .map((b) => order.indexOf(b.file));
  if (
    indexes.some(
      (at, i) => at === -1 || (i > 0 && at <= (indexes[i - 1] ?? -1)),
    )
  )
    out.push(
      `core boards out of order in canvas.json#order (expected ${standard.boards.map((b) => b.file).join(", ")})`,
    );
  const { page, titlePrefix } = standard.componentBoards;
  for (const name of standard.dsComponents) {
    const file = `c-${name}.dc.html`;
    out.push(
      boardMessage(file, present(file), page, "component", (t) =>
        typeof t === "string" && t.startsWith(titlePrefix)
          ? null
          : `board ${file} title must start with "${titlePrefix}"`,
      ),
    );
  }
  return out.filter((m) => m !== null);
}

/**
 * One board: present, on its page, with a valid title.
 * @param {string} file - Board file
 * @param {Record<string, unknown> | null} board - Its `canvas.json` entry, null when missing
 * @param {string} page - Expected page id
 * @param {"core" | "component"} kind - Which kind of board, for the missing message
 * @param {(title: unknown) => string | null} titleMessage - Message for a wrong title
 * @returns {string | null} The first message, or null
 */
function boardMessage(
  file: string,
  board: Record<string, unknown> | null,
  page: string,
  kind: "core" | "component",
  titleMessage: (title: unknown) => string | null,
): string | null {
  if (!board) return `missing ${kind} board ${file}`;
  if (board.page !== page)
    return `board ${file} is on page ${token(board.page)}, expected ${page}`;
  return titleMessage(board.title);
}

/**
 * The installed version of one design system in `canvas.json`.
 * @param {Record<string, unknown>} canvasJson - Parsed `canvas.json`
 * @param {DsVersion} expected - Namespace and version
 * @returns {string | null} The message, or null when that version is installed
 */
function dsVersionViolation(
  canvasJson: Record<string, unknown>,
  expected: DsVersion,
): string | null {
  const ds = asArray(canvasJson.designSystems)
    .map(asRecord)
    .find((d) => d.namespace === expected.namespace);
  if (!ds) return `design system ${expected.namespace} is not installed`;
  return ds.version === expected.version
    ? null
    : `design system ${expected.namespace} version ${token(ds.version)}, expected ${expected.version}`;
}

/**
 * `canvas.json` checks (`--boards`, `--ds-version`), each `canvas.json:1 <message>`.
 * @param {string} canvasDir - Canvas directory
 * @param {BoardOptions} options - Which checks to run
 * @param {Standard} standard - Manifest
 * @returns {string[]} Empty when neither check is asked for or both pass
 */
export function canvasJsonViolations(
  canvasDir: string,
  options: BoardOptions,
  standard: Standard,
): string[] {
  const { boards, dsVersion } = options;
  if (!boards && dsVersion === undefined) return [];
  const file = join(canvasDir, "canvas.json");
  if (!existsSync(file)) return ["canvas.json:1 missing canvas.json"];
  const label = options.canvasLabel ?? canvasDir;
  const canvasJson = asRecord(readJson(file, join(label, "canvas.json")));
  const files = new Set(
    canvasFiles(canvasDir, label).filter((f) => f.endsWith(".dc.html")),
  );
  const messages = boards ? boardViolations(canvasJson, files, standard) : [];
  const version =
    dsVersion === undefined ? null : dsVersionViolation(canvasJson, dsVersion);
  if (version !== null) messages.push(version);
  return messages.map((m) => `canvas.json:1 ${m}`);
}

/**
 * How a `data-sg-literal` block differs from the theme sub-tree it copies.
 * @param {string} path - Theme path (`colors`, `themeAxes.theme.dark`)
 * @param {unknown} actual - The block's value
 * @param {unknown} expected - The theme's value
 * @returns {string[]} Messages without a location
 */
function literalDiff(
  path: string,
  actual: unknown,
  expected: unknown,
): string[] {
  if (isPlainObject(actual) && isPlainObject(expected)) {
    const a = asRecord(actual);
    const e = asRecord(expected);
    return [
      ...Object.keys(e)
        .filter((k) => !(k in a))
        .map((k) => `literal ${path} lacks key ${token(k)}`),
      ...Object.keys(a)
        .filter((k) => !(k in e))
        .map((k) => `literal ${path} has extra key ${token(k)}`),
      ...Object.keys(e)
        .filter((k) => k in a)
        .flatMap((k) => literalDiff(`${path}.${k}`, a[k], e[k])),
    ];
  }
  return JSON.stringify(actual) === JSON.stringify(expected)
    ? []
    : [`literal ${path} is ${echo(actual)}, theme has ${echo(expected)}`];
}

/**
 * The provenance block of the manifest's `provenanceBoard`.
 * @param {string} file - Board file
 * @param {string} text - Its contents
 * @param {BoardOptions} options - `stamp` and `dsVersion`, when given
 * @returns {string[]} Located messages
 */
function provenanceViolations(
  file: string,
  text: string,
  options: BoardOptions,
): string[] {
  const block = jsonBlocks(text, "data-sg-provenance", lineIndex(text)).find(
    (b) => b.key === "main",
  );
  if (!block) return [`${file}:1 missing provenance block`];
  const at = `${file}:${String(block.line)}`;
  if (block.error) return [`${at} provenance block is not valid JSON`];
  const { theme, lib, ds, built } = asRecord(block.value);
  const out: string[] = [];
  if (typeof built !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(built))
    out.push(`${at} provenance built ${echo(built)} is not YYYY-MM-DD`);
  if (options.stamp !== undefined) {
    const stamp = asRecord(readJson(options.stamp, options.stampLabel));
    const sha = String(stamp.themeSha256).slice(0, 12);
    if (theme !== sha)
      out.push(`${at} provenance theme ${echo(theme)}, stamp has ${echo(sha)}`);
    if (lib !== stamp.libVersion)
      out.push(
        `${at} provenance lib ${echo(lib)}, stamp has ${echo(stamp.libVersion)}`,
      );
  }
  if (options.dsVersion !== undefined && ds !== options.dsVersion.version)
    out.push(
      `${at} provenance ds ${echo(ds)}, expected ${echo(options.dsVersion.version)}`,
    );
  return out;
}

/**
 * The sections and literal blocks of one core board.
 * @param {string} file - Board file
 * @param {string} text - Its contents
 * @param {ContentRule} content - What the manifest asks of it
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @returns {string[]} Located messages
 */
function boardContentMessages(
  file: string,
  text: string,
  content: ContentRule,
  theme: Record<string, unknown>,
): string[] {
  const ids = new Set(sectionIds(text));
  const out = content.sections
    .filter((id) => !ids.has(id))
    .map((id) => `${file}:1 missing section ${id}`);
  const blocks = jsonBlocks(text, "data-sg-literal", lineIndex(text));
  for (const path of content.literals) {
    const block = blocks.find((b) => b.key === path);
    if (!block) {
      out.push(`${file}:1 missing literal ${path}`);
      continue;
    }
    const at = `${file}:${String(block.line)}`;
    if (block.error) out.push(`${at} literal ${path} is not valid JSON`);
    else
      for (const message of literalDiff(path, block.value, theme[path] ?? {}))
        out.push(`${at} ${message}`);
  }
  return out;
}

/**
 * Board content (`--boards`): every core board carries its `data-sg-section`
 * ids and its `data-sg-literal` blocks, the blocks equal the theme, and the
 * provenance block matches the stamp and the installed design system.
 * @param {ReadBoard} read - Reads a board of the canvas
 * @param {Set<string>} files - `*.dc.html` paths present in the canvas
 * @param {unknown} theme - Parsed theme JSON
 * @param {Standard} standard - Manifest
 * @param {BoardOptions} options - `stamp` and `dsVersion`, when given
 * @returns {string[]} Located messages
 */
function contentViolations(
  read: ReadBoard,
  files: Set<string>,
  theme: unknown,
  standard: Standard,
  options: BoardOptions,
): string[] {
  const record = asRecord(theme);
  const out: string[] = [];
  for (const [file, content] of Object.entries(standard.content ?? {}))
    if (files.has(file))
      out.push(...boardContentMessages(file, read(file), content, record));
  const board = standard.provenanceBoard;
  if (board !== undefined && files.has(board))
    out.push(...provenanceViolations(board, read(board), options));
  return out;
}

/**
 * The root padding of a component board.
 * @param {string} file - Board file
 * @param {string} text - Its contents
 * @param {number} minSteps - Smallest `calc(var(--spacing) * <n>)`
 * @returns {string | null} Located message, or null when the padding is large enough
 */
function rootPaddingViolation(
  file: string,
  text: string,
  minSteps: number,
): string | null {
  const root = rootElement(text);
  const hint = `(use calc(var(--spacing) * ${String(minSteps)}) or more)`;
  const at = `${file}:${String(root?.line ?? 1)}`;
  const padding = root ? styleDeclarations(root.style).get("padding") : null;
  if (padding === undefined || padding === null)
    return `${at} root has no padding ${hint}`;
  const steps = /^calc\(var\(--spacing\)\s*\*\s*(\d+)\)$/.exec(padding)?.[1];
  return steps !== undefined && Number(steps) >= minSteps
    ? null
    : `${at} root padding ${echo(padding)} ${hint}`;
}

/**
 * The sources a component board imports.
 * @param {string} file - `c-<stem>.dc.html`
 * @param {string} text - Its contents
 * @param {Set<string>} dsNames - Kebab-cased design-system component names
 * @param {string} prefix - Source board prefix (`s-`)
 * @returns {string | null} Located message, or null
 */
function componentImportViolation(
  file: string,
  text: string,
  dsNames: Set<string>,
  prefix: string,
): string | null {
  const stem = file.slice(2, -".dc.html".length);
  const imports = dcImports(text, lineIndex(text)).filter(
    (i) => i.name !== "Icon",
  );
  const names = imports.map((i) => token(i.name));
  if (dsNames.has(stem))
    return imports.length === 0
      ? null
      : `${file}:${String(imports[0]?.line ?? 1)} design-system component boards render from the bundle; remove dc-import ${names.join(", ")}`;
  if (names.length === 1 && names[0] === `${prefix}${stem}`) return null;
  const found = names.length === 0 ? "none" : names.join(", ");
  return `${file}:1 board must import exactly ${prefix}${stem}, found ${found}`;
}

/**
 * Pages of the component and source boards: only `c-*` boards on the
 * component page, every source board on its own page.
 * @param {Set<string>} files - `*.dc.html` paths present in the canvas
 * @param {Record<string, unknown>} boards - `canvas.json#boards`
 * @param {string} page - Component page id
 * @param {SourceBoards} sources - Source board page and prefix
 * @returns {string[]} Located messages
 */
function componentPlacementViolations(
  files: Set<string>,
  boards: Record<string, unknown>,
  page: string,
  sources: SourceBoards,
): string[] {
  const out: string[] = [];
  for (const file of files) {
    if (file.startsWith("cl-"))
      out.push(
        `${file}:1 cl-* boards are retired (split into one c-* board per component)`,
      );
    if (!(file in boards)) continue;
    const boardPage = asRecord(boards[file]).page;
    if (boardPage === page && !file.startsWith("c-"))
      out.push(
        `canvas.json:1 board ${file} on page ${page} is not a c-* board`,
      );
    if (file.startsWith(sources.prefix) && boardPage !== sources.page)
      out.push(
        `canvas.json:1 board ${file} is on page ${token(boardPage)}, expected ${sources.page}`,
      );
  }
  return out;
}

/**
 * One `c-*` board: its sources, root padding and frame size.
 * @param {string} file - `c-<stem>.dc.html`
 * @param {string} text - Its contents
 * @param {Record<string, unknown>} board - Its `canvas.json` entry (`{}` when absent)
 * @param {Standard["componentBoards"]} limits - Largest frame and smallest padding
 * @param {ComponentSources} sources - Design-system names and the source prefix
 * @returns {string[]} Located messages
 */
function componentBoardViolations(
  file: string,
  text: string,
  board: Record<string, unknown>,
  limits: Standard["componentBoards"],
  sources: ComponentSources,
): string[] {
  const { maxWidth, maxHeight, minPaddingSteps } = limits;
  const out = [
    componentImportViolation(file, text, sources.dsNames, sources.prefix),
    minPaddingSteps === undefined
      ? null
      : rootPaddingViolation(file, text, minPaddingSteps),
  ];
  const { w, h } = board;
  const tooWide = typeof w === "number" && w > (maxWidth ?? Infinity);
  const tooTall = typeof h === "number" && h > (maxHeight ?? Infinity);
  const limit = (max: number | undefined) =>
    max === undefined ? "any" : String(max);
  if (tooWide || tooTall)
    out.push(
      `canvas.json:1 board ${file} frame ${token(w)}×${token(h)} exceeds ${limit(maxWidth)}×${limit(maxHeight)}`,
    );
  return out.filter((m) => m !== null);
}

/**
 * Component pages (`--boards`, when the manifest has `sourceBoards`): no
 * `cl-*` boards; the component page holds only `c-*` boards; each `c-*` board
 * imports exactly its `s-*` source (a design-system component renders from
 * the bundle and imports none), inside a padded frame no larger than the
 * manifest's; `s-*` boards live on their page; no board imports a `c-*` board.
 * @param {ReadBoard} read - Reads a board of the canvas
 * @param {Record<string, unknown>} canvasJson - Parsed `canvas.json`
 * @param {Set<string>} files - `*.dc.html` paths present in the canvas
 * @param {Standard} standard - Manifest
 * @returns {string[]} Located messages
 */
function componentPageViolations(
  read: ReadBoard,
  canvasJson: Record<string, unknown>,
  files: Set<string>,
  standard: Standard,
): string[] {
  const sources = standard.sourceBoards;
  if (sources === undefined) return [];
  const boards = asRecord(canvasJson.boards);
  const named = {
    dsNames: new Set(standard.dsComponents),
    prefix: sources.prefix,
  };
  const out = componentPlacementViolations(
    files,
    boards,
    standard.componentBoards.page,
    sources,
  );
  for (const file of files) {
    const text = read(file);
    for (const i of dcImports(text, lineIndex(text)))
      if (i.name.startsWith("c-"))
        out.push(
          `${file}:${String(i.line)} imports showcase board ${token(i.name)} (import ${sources.prefix}${token(i.name.slice(2))})`,
        );
    if (/^c-.+\.dc\.html$/.test(file))
      out.push(
        ...componentBoardViolations(
          file,
          text,
          asRecord(boards[file]),
          standard.componentBoards,
          named,
        ),
      );
  }
  return out;
}

/**
 * The rank of a board in `canvas.json#order`: core, `c-*`, `s-*`, the rest.
 * @param {string} file - Board file
 * @param {Standard} standard - Manifest
 * @param {string} prefix - Source board prefix
 * @returns {number} 0–3
 */
function orderRank(file: string, standard: Standard, prefix: string): number {
  if (standard.boards.some((b) => b.file === file)) return 0;
  if (file.startsWith("c-")) return 1;
  return file.startsWith(prefix) ? 2 : 3;
}

/**
 * Frames (`--boards`, when the manifest has `sourceBoards`): every board's
 * `$preview` equals its `canvas.json` frame; core and `c-*` roots neither fix
 * their height nor hide overflow; the manifest pages come first, in order;
 * `canvas.json#order` lists core, `c-*`, `s-*`, then screens.
 * @param {ReadBoard} read - Reads a board of the canvas
 * @param {Record<string, unknown>} canvasJson - Parsed `canvas.json`
 * @param {Set<string>} files - `*.dc.html` paths present in the canvas
 * @param {Standard} standard - Manifest
 * @returns {string[]} Located messages
 */
function frameViolations(
  read: ReadBoard,
  canvasJson: Record<string, unknown>,
  files: Set<string>,
  standard: Standard,
): string[] {
  const sources = standard.sourceBoards;
  if (sources === undefined) return [];
  const boards = asRecord(canvasJson.boards);
  const out: (string | null)[] = [];
  for (const file of files) {
    if (!(file in boards)) continue;
    const text = read(file);
    out.push(previewViolation(file, text, asRecord(boards[file])));
    if (orderRank(file, standard, sources.prefix) <= 1)
      out.push(...rootFrameViolations(file, text));
  }
  out.push(
    pageOrderViolation(canvasJson, standard),
    orderGroupViolation(canvasJson, files, standard, sources.prefix),
  );
  return out.filter((m) => m !== null);
}

/**
 * @param {string} file - Board file
 * @param {string} text - Its contents
 * @param {Record<string, unknown>} board - Its `canvas.json` entry
 * @returns {string | null} Located message when `$preview` is missing or differs from the frame
 */
function previewViolation(
  file: string,
  text: string,
  board: Record<string, unknown>,
): string | null {
  const preview = previewSize(text);
  if (preview === null) return `${file}:1 missing $preview`;
  const { w, h } = board;
  return preview.width === w && preview.height === h
    ? null
    : `${file}:1 $preview ${String(preview.width)}×${String(preview.height)}, canvas.json frame ${token(w)}×${token(h)}`;
}

/**
 * A root that fixes its height or hides its overflow clips the frame.
 * @param {string} file - Core or `c-*` board
 * @param {string} text - Its contents
 * @returns {string[]} Located messages
 */
function rootFrameViolations(file: string, text: string): string[] {
  const root = rootElement(text);
  if (!root) return [];
  const at = `${file}:${String(root.line)}`;
  const declarations = styleDeclarations(root.style);
  const height = declarations.get("height");
  const out: string[] = [];
  if (height !== undefined && height !== "auto")
    out.push(
      `${at} root sets height ${echo(height)} (let the content size the frame)`,
    );
  const hidden =
    ["overflow", "overflow-x", "overflow-y"].some(
      (p) => declarations.get(p) === "hidden",
    ) || root.className.split(/\s+/).includes("overflow-hidden");
  if (hidden) out.push(`${at} root hides overflow`);
  return out;
}

/**
 * @param {Record<string, unknown>} canvasJson - Parsed `canvas.json`
 * @param {Standard} standard - Manifest
 * @returns {string | null} Located message unless the manifest pages come first, in order (a missing page is reported elsewhere)
 */
function pageOrderViolation(
  canvasJson: Record<string, unknown>,
  standard: Standard,
): string | null {
  const ids = asArray(canvasJson.pages).map((p) => asRecord(p).id);
  const expected = standard.pages.map((p) => p.id);
  return expected.every((id) => ids.includes(id)) &&
    expected.some((id, i) => ids[i] !== id)
    ? `canvas.json:1 pages out of order (expected ${expected.join(", ")}, then screens)`
    : null;
}

/**
 * @param {Record<string, unknown>} canvasJson - Parsed `canvas.json`
 * @param {Set<string>} files - `*.dc.html` paths present in the canvas
 * @param {Standard} standard - Manifest
 * @param {string} prefix - Source board prefix
 * @returns {string | null} Located message at the first board listed before a lower group
 */
function orderGroupViolation(
  canvasJson: Record<string, unknown>,
  files: Set<string>,
  standard: Standard,
  prefix: string,
): string | null {
  let previous = { file: "", rank: 0 };
  for (const entry of asArray(canvasJson.order)) {
    if (typeof entry !== "string" || !files.has(entry)) continue;
    const rank = orderRank(entry, standard, prefix);
    if (rank < previous.rank)
      return `canvas.json:1 order groups out of order: ${entry} after ${previous.file} (expected core, c-*, ${prefix}*, screens)`;
    previous = { file: entry, rank };
  }
  return null;
}

/**
 * The `--boards` rules that read board contents: content, component pages
 * and frames. Empty unless `--boards` is asked for and `canvas.json` exists.
 * @param {string} canvasDir - Canvas directory
 * @param {unknown} theme - Parsed theme JSON
 * @param {BoardOptions} options - Which checks to run
 * @param {Standard} standard - Manifest
 * @returns {string[]} Located messages
 */
export function boardContentViolations(
  canvasDir: string,
  theme: unknown,
  options: BoardOptions,
  standard: Standard,
): string[] {
  const file = join(canvasDir, "canvas.json");
  if (!options.boards || !existsSync(file)) return [];
  const label = options.canvasLabel ?? canvasDir;
  const read: ReadBoard = (board) =>
    readText(join(canvasDir, board), join(label, board));
  const canvasJson = asRecord(readJson(file, join(label, "canvas.json")));
  const files = new Set(
    canvasFiles(canvasDir, label).filter((f) => f.endsWith(".dc.html")),
  );
  return [
    ...contentViolations(read, files, theme, standard, options),
    ...componentPageViolations(read, canvasJson, files, standard),
    ...frameViolations(read, canvasJson, files, standard),
  ];
}
