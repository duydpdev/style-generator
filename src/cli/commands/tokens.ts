import fs from "node:fs";
import path from "node:path";

import { buildDesignTokens } from "../../features/tokens/createDesignTokens";
import { toGeneratorOptions } from "../../node/loadStyleGenConfig";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { readAndPrepareTheme } from "../../node/themeEmitter";
import { writeFileAtomic } from "../../shared/writeFileAtomic";
import { loadCliConfig } from "../loadCliConfig";
import { logger } from "../logger";

export interface TokensArgs {
  theme?: string;
  out?: string;
}

/** File the keys land in when `--out` is not given: next to the theme. */
const TOKENS_FILE_NAME = "theme.tokens.ts";

/** The module is TypeScript (`as const`, `export type`), so only a TS file name fits. */
const TS_FILE = /\.[mc]?ts$/;
/** Declaration files cannot hold a runtime `export const`. */
const DECLARATION_FILE = /\.d\.[mc]?ts$/;

/**
 * Executes the `tokens` CLI command: writes the theme's design-token keys
 * (`DesignTokens.Web`: one array of camelCased keys per category, plus the
 * breakpoints, screens and spacing properties) as a `theme.tokens.ts`
 * module, so a client bundle can import the key lists without shipping the
 * `./tokens` runtime and the theme JSON.
 *
 * The object is the one `createDesignTokens()` builds at runtime, serialised
 * as JSON, so the two cannot drift; `as const` keeps the literal key types.
 * The theme and options go through the same validation (and the same error
 * labels) as `generate`. The default `--out` is `theme.tokens.ts` next to the
 * theme and must stay inside the project root, so a theme outside it needs an
 * explicit `--out`. `--out` must name a `.ts`, `.mts` or `.cts` file (not a
 * declaration file): the module is TypeScript. A file whose content is
 * already current is not rewritten, so file watchers stay quiet.
 * @param {TokensArgs} args - `--theme` and `--out`
 * @param {string} [cwd] - Project root; defaults to `process.cwd()`
 * @returns {number} The process exit code
 */
export function tokensCommand(
  args: TokensArgs,
  cwd: string = process.cwd(),
): number {
  const loaded = loadCliConfig(cwd, {
    ...(args.theme !== undefined && { theme: args.theme }),
  });
  if (!loaded) return 1;
  const { config } = loaded;

  let themeFile: string;
  let outFile: string;
  try {
    themeFile = resolveProjectPath(cwd, config.theme, "theme", {
      allowOutsideRoot: true,
    });
    outFile = resolveProjectPath(
      cwd,
      args.out ?? path.join(path.dirname(themeFile), TOKENS_FILE_NAME),
      args.out === undefined ? "tokens output" : "--out",
    );
  } catch (error) {
    const hint = args.out === undefined ? "\n💡 Pass --out" : "";
    logger.error(
      `${error instanceof Error ? error.message : String(error)}${hint}`,
    );
    return 1;
  }
  if (!TS_FILE.test(outFile) || DECLARATION_FILE.test(outFile)) {
    logger.error(
      `--out must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got ${path.relative(cwd, outFile)}`,
    );
    return 1;
  }

  const prepared = readAndPrepareTheme(themeFile, toGeneratorOptions(config));
  if (!prepared.ok) {
    logger.error(prepared.message);
    return 1;
  }

  const { Web } = buildDesignTokens(
    prepared.parsed,
    prepared.resolved,
  ).DesignTokens;
  const source =
    `export const tokens = ${JSON.stringify(Web, null, 2)} as const;\n` +
    "export type Tokens = typeof tokens;\n";

  try {
    let existing: string | undefined;
    try {
      existing = fs.readFileSync(outFile, "utf8");
    } catch {
      // Missing (or unreadable): treat as changed; a real problem surfaces
      // from the write below.
      existing = undefined;
    }
    if (existing === source) {
      logger.success(
        `Tokens up to date: ${path.relative(cwd, outFile)} (unchanged)`,
      );
      return 0;
    }
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileAtomic(outFile, source);
  } catch (error) {
    logger.error(
      `Cannot write ${outFile}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
  logger.success(`Tokens written to ${path.relative(cwd, outFile)}`);
  return 0;
}
