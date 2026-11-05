import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

/**
 * The generator options, in a module that imports no JSON: the bundler config
 * imports it, and a config that depended on theme.json would restart the dev
 * server on every theme edit. Kept equal to style-gen.config.json (the CLI
 * reads that file); check:plain-ui compares them.
 */
export const options = {
  coverage: { colors: { opacities: [10, 20, 50, 80] } },
} as const satisfies StyleGeneratorOptions;
