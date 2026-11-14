import path from "node:path";

import type { StyleGeneratorOptions } from "../../core/Options";
import { errorMessage } from "../../node/errorMessage";
import {
  assertTokensFile,
  resolveEmitTarget,
} from "../../node/resolveEmitTarget";
import { resolveProjectPath } from "../../node/resolveProjectPath";
import { emitTokensModule, readAndPrepareTheme } from "../../node/themeEmitter";
import { loadCliConfig } from "../loadCliConfig";
import { logger } from "../logger";

export interface TokensArgs {
  theme?: string;
  out?: string;
}

/**
 * Executes the `tokens` CLI command: writes only the theme's `theme.tokens.ts`
 * (`DesignTokens.Web`: one array of camelCased keys per category, plus the
 * breakpoints, screens, spacing properties and opacity steps, and the
 * `themeAxes` variant names with their `ThemeAxesState` type), so a client
 * bundle can import the key lists without shipping the `./tokens` runtime and
 * the theme JSON. `generate` and the bundler plugins write the same file
 * together with the CSS; this command is for a project that wants the module
 * alone, or at another path.
 *
 * The object is the one `createDesignTokens()` builds at runtime, serialised
 * as JSON, so the two cannot drift; `as const` keeps the literal key types.
 * The theme and options go through the same validation (and the same error
 * labels) as `generate`. The default `--out` is the config's `tokensOutput`,
 * else `theme.tokens.ts` beside `output`, and must stay inside the project
 * root. `--out` must name a `.ts`, `.mts` or `.cts` file (not a
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
  let tokensFile: string;
  let options: StyleGeneratorOptions | undefined;
  try {
    const target = resolveEmitTarget(cwd, config);
    themeFile = target.themeFile;
    options = target.options;
    tokensFile =
      args.out === undefined
        ? target.tokensFile
        : resolveProjectPath(cwd, args.out, "--out");
    assertTokensFile(tokensFile, "--out", path.relative(cwd, tokensFile));
  } catch (error) {
    logger.error(errorMessage(error));
    return 1;
  }

  const prepared = readAndPrepareTheme(themeFile, options);
  if (!prepared.ok) {
    logger.error(prepared.message);
    return 1;
  }

  let changed: boolean;
  try {
    ({ changed } = emitTokensModule(prepared, tokensFile));
  } catch (error) {
    logger.error(`Cannot write ${tokensFile}: ${errorMessage(error)}`);
    return 1;
  }
  const shown = path.relative(cwd, tokensFile);
  logger.success(
    changed
      ? `Tokens written to ${shown}`
      : `Tokens up to date: ${shown} (unchanged)`,
  );
  return 0;
}
