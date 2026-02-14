import { ThemeConfig, StyleGeneratorOptions } from "../types";

import { createStylePlugin } from "./createStylePlugin";
import { generateSafelist } from "./generateSafelist";

/**
 * Creates a complete style system including the Tailwind plugin and safelist.
 * @param {ThemeConfig} config - Theme configuration
 * @param {StyleGeneratorOptions} options - Generator options
 * @returns {{ plugin: unknown; safelist: string[] }} Style system object
 */
export const createStyleSystem = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
) => {
  // Generate safelist once to avoid double calculation
  const safelist = generateSafelist(config, options);

  return {
    /**
     * The Tailwind CSS plugin instance.
     * With optimized safelist passed down.
     */
    plugin: createStylePlugin(config, options, safelist),

    /**
     * The list of safelisted classes.
     */
    safelist,
  };
};
