import type { StyleGeneratorOptions } from "./Options";
import { StyleGeneratorOptionsSchema } from "./optionsSchema";
import { resolveOptions } from "./resolveOptions";
import type { ResolvedOptions } from "./resolveOptions";
import { parseTheme, type ThemeConfig } from "./themeSchema";
import { assertThemeOptions } from "./themeOptionsChecks";

/** The validation steps {@link prepareGenerate} runs, in order. */
export type PrepareStage = "options" | "theme" | "cross";

/**
 * The validation prologue every entry shares: options, resolve, theme, then theme × options.
 * @template T
 * @param {T} theme - Raw theme (`JSON.parse()` output or a typed theme)
 * @param {StyleGeneratorOptions} [options] - Raw generator options
 * @param {(stage: PrepareStage) => void} [onStage] - Called before each step, so a caller can name the failing one
 * @returns {{ parsed: T, resolved: ResolvedOptions }} The validated theme and the resolved options; a `ZodError` is thrown on any failure
 */
export const prepareGenerate = <T extends ThemeConfig>(
  theme: T,
  options?: StyleGeneratorOptions,
  onStage?: (stage: PrepareStage) => void,
): { parsed: T; resolved: ResolvedOptions } => {
  const styleOptions: StyleGeneratorOptions = options ?? {};
  onStage?.("options");
  StyleGeneratorOptionsSchema.parse(styleOptions);
  const resolved = resolveOptions(styleOptions);
  onStage?.("theme");
  const parsed = parseTheme(theme);
  onStage?.("cross");
  assertThemeOptions(parsed, resolved);
  return { parsed, resolved };
};
