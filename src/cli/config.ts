import fs from "node:fs";
import path from "node:path";

import type { StyleModule } from "../types";

export interface StyleGenConfig {
  theme: string;
  output: string;
  plugin: string;
  breakpoints?: string[];
  responsiveModules?: StyleModule[];
  screens?: Record<string, string>;
}

export const defaultConfig: StyleGenConfig = {
  theme: "styles/theme.json",
  output: "styles/safelist.txt",
  plugin: "plugins/theme-plugin.ts",
};

/**
 * Resolves CLI configuration from file arguments and defaults
 * @param {Partial<StyleGenConfig>} flags - The command line flags
 * @returns {StyleGenConfig} The resolved StyleGen configuration
 */
export function resolveConfig(flags: Partial<StyleGenConfig>): StyleGenConfig {
  let fileConfig: Partial<StyleGenConfig> = {};

  const configPath = path.resolve(process.cwd(), "style-gen.config.json");
  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(
        fs.readFileSync(configPath, "utf-8"),
      ) as Partial<StyleGenConfig>;
    } catch {
      // Ignore parse error or handle it
    }
  } else {
    // Try to check package.json
    const pkgPath = path.resolve(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<
          string,
          unknown
        >;
        if ("style-gen" in pkg) {
          fileConfig = pkg["style-gen"] as Partial<StyleGenConfig>;
        }
      } catch {
        // Ignore
      }
    }
  }

  return {
    ...defaultConfig,
    ...fileConfig,
    ...flags,
  };
}
