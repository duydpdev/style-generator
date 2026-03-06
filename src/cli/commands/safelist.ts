import fs from "node:fs";
import path from "node:path";

import { watch } from "chokidar";

import type { StyleModule } from "../../core/Options";
import type { ThemeConfig } from "../../core/ThemeConfig";
import { generateSafelist } from "../../features/safelist/generateSafelist";
import { resolveConfig } from "../config";
import { logger } from "../logger";

export interface SafelistArgs {
  theme?: string;
  out?: string;
  breakpoints?: string;
  responsiveModules?: string;
  watch?: boolean;
}

/**
 * Safelist command handler
 * @param {SafelistArgs} args - Safelist arguments from CLI
 */
export function safelistCommand(args: SafelistArgs) {
  try {
    const configFlags: Parameters<typeof resolveConfig>[0] = {};

    if (args.theme !== undefined) {
      configFlags.theme = args.theme;
    }

    if (args.out !== undefined) {
      configFlags.output = args.out;
    }

    if (args.breakpoints) {
      configFlags.breakpoints = args.breakpoints.split(",");
    }

    if (args.responsiveModules) {
      configFlags.responsiveModules = args.responsiveModules.split(
        ",",
      ) as StyleModule[];
    }

    const options = resolveConfig(configFlags);

    const themePath = path.resolve(process.cwd(), options.theme);
    if (!fs.existsSync(themePath)) {
      logger.error(`Theme file not found at ${options.theme}`);
      process.exit(1);
    }

    const outPath = path.resolve(process.cwd(), options.output);

    const performGenerate = () => {
      try {
        const theme = JSON.parse(
          fs.readFileSync(themePath, "utf8"),
        ) as ThemeConfig;
        const safelist = generateSafelist(theme, options);

        const outDir = path.dirname(outPath);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        fs.writeFileSync(outPath, safelist.join("\n"), "utf8");
        logger.success(
          `Safelist written to ${options.output} (${String(safelist.length)} classes)`,
        );
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Failed to generate safelist: ${error.message}`);
        } else {
          logger.error(`Unknown error occurred.`);
        }
      }
    };

    if (args.watch) {
      logger.info(`Watching for changes in ${options.theme}...`);

      let timeout: NodeJS.Timeout;
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
    } else {
      performGenerate();
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Configuration error: ${error.message}`);
    } else {
      logger.error(`Unknown configuration error.`);
    }
    process.exit(1);
  }
}
