import fs from "node:fs";
import path from "node:path";

import { watch } from "chokidar";
import { z } from "zod";

import { generate } from "../../core/generate";
import { ThemeSchema, formatZodError } from "../../core/themeSchema";
import { writeFileAtomic } from "../../shared/writeFileAtomic";
import {
  readConfigFile,
  resolveConfig,
  normalizePath,
  toGeneratorOptions,
} from "../config";
import { logger } from "../logger";

export interface GenerateArgs {
  theme?: string;
  out?: string;
  watch?: boolean;
}

/** Handle on a `--watch` run, so callers can stop it. */
export interface GenerateWatchHandle {
  /** Resolves once the theme-file watcher is attached. */
  ready: Promise<void>;
  /** Cancel any pending regeneration and stop watching. */
  close: () => Promise<void>;
}

/**
 * Generate command handler: reads the theme, validates it, runs `generate()`,
 * and writes the resulting CSS (`@theme`/`@theme inline`/typography/spacing/
 * `@source inline` blocks) to disk. Consumers `@import` the written file
 * directly next to `@import "tailwindcss";`.
 *
 * A failed one-shot generation sets `process.exitCode = 1` so scripts and CI
 * stop; in watch mode a failure is logged and watching continues.
 * @param {GenerateArgs} args - Generate arguments from CLI
 * @returns {GenerateWatchHandle | undefined} The watch handle in `--watch` mode, else `undefined`
 */
export function generateCommand(
  args: GenerateArgs,
): GenerateWatchHandle | undefined {
  try {
    const configFlags: Parameters<typeof resolveConfig>[0] = {};

    if (args.theme !== undefined) {
      configFlags.theme = args.theme;
    }

    if (args.out !== undefined) {
      configFlags.output = args.out;
    }

    const configFile = readConfigFile(process.cwd());
    if (configFile.error) {
      logger.warn(`Ignoring ${configFile.error}; using defaults`);
    }
    if (configFile.issues) {
      // Read once at startup (not watched), like the missing-theme check
      // below, so this also ends a `--watch` run.
      logger.error(
        `Invalid config (${configFile.source ?? "style-gen.config.json"}):\n${configFile.issues}`,
      );
      process.exitCode = 1;
      return;
    }
    const options = resolveConfig(configFlags, configFile);

    const themePath = path.resolve(process.cwd(), normalizePath(options.theme));

    if (!fs.existsSync(themePath)) {
      logger.error(
        `Theme file not found at ${options.theme} (resolved: ${themePath})\n💡 Run: yarn style-gen init`,
      );
      process.exit(1);
    }

    const stat = fs.statSync(themePath);
    if (stat.isDirectory()) {
      logger.error(
        `The path provided for --theme is a directory, not a file: ${themePath}\n💡 Did you mean: ${options.theme.replace(/\/$/, "")}/theme.json?`,
      );
      process.exit(1);
    }

    const outPath = path.resolve(process.cwd(), options.output);

    const performGenerate = (): boolean => {
      // The theme is parsed here, so a ZodError thrown by `generate()` comes
      // from the options (e.g. `extraSources`), not from the theme.
      let stage: "theme" | "options" = "theme";
      try {
        const theme = ThemeSchema.parse(
          JSON.parse(fs.readFileSync(themePath, "utf8")),
        );
        stage = "options";
        const { css } = generate(theme, toGeneratorOptions(options));

        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        writeFileAtomic(outPath, css);
        logger.success(`CSS written to ${options.output}`);
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          // `generate()` also reports theme × options conflicts (a stale
          // alias under `axes.scope: "element"`) at a `themeAxes` path:
          // neither the theme nor the options alone are at fault.
          let header = "Invalid options";
          if (stage === "theme") {
            header = `Invalid theme (${options.theme})`;
          } else if (error.issues.some((i) => i.path[0] === "themeAxes")) {
            header = "Invalid theme/options";
          }
          logger.error(`${header}:\n${formatZodError(error)}`);
        } else if (error instanceof Error) {
          logger.error(`Failed to generate CSS: ${error.message}`);
        } else {
          logger.error(`Unknown error occurred.`);
        }
        return false;
      }
    };

    if (args.watch) {
      logger.info(`Watching for changes in ${options.theme}...`);

      let timeout: NodeJS.Timeout | undefined;
      const debouncedGenerate = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          performGenerate();
        }, 200);
      };

      // Initial generation
      debouncedGenerate();

      const watcher = watch(themePath, {
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on("change", () => {
        logger.info("Theme file changed. Regenerating...");
        debouncedGenerate();
      });

      // Plain executor: the repo's ES2022 lib has no Promise.withResolvers.
      let markReady: () => void = () => undefined;
      const ready = new Promise<void>((resolve) => {
        markReady = resolve;
      });
      watcher.once("ready", markReady);
      return {
        ready,
        close: () => {
          clearTimeout(timeout);
          // chokidar never emits `ready` once closed; don't leave awaiters hanging.
          markReady();
          return watcher.close();
        },
      };
    }
    if (!performGenerate()) {
      process.exitCode = 1;
    }
    return undefined;
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Configuration error: ${error.message}`);
    } else {
      logger.error(`Unknown configuration error.`);
    }
    process.exit(1);
  }
}
