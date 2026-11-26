import path from "node:path";

import type { StyleGeneratorOptions } from "../../core/Options";
import { errorMessage } from "../../node/errorMessage";
import {
  assertDistinctFiles,
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
 * Executes the `tokens` CLI command: writes only `theme.tokens.ts`, serialised
 * from what `createDesignTokens()` builds so the two cannot drift. `--out` is a
 * TypeScript file inside the root, distinct from the theme and `output`.
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
    assertDistinctFiles([
      ["theme", target.themeFile],
      ["output", target.outFile],
      ["--out", tokensFile],
    ]);
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
