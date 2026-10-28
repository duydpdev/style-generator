import { assertThemeOptions } from "./crossFieldChecks";
import type { StyleGeneratorOptions } from "./Options";
import { StyleGeneratorOptionsSchema } from "./optionsSchema";
import { parseTheme } from "./parseTheme";
import { resolveOptions } from "./resolveOptions";
import type { ResolvedOptions } from "./resolveOptions";
import type { ThemeConfig } from "./themeSchema";

/** The validation steps {@link prepareGenerate} runs, in order. */
export type PrepareStage = "options" | "theme" | "cross";

/**
 * The one validation prologue shared by `generate()`, `generateThemeCss()` and
 * the Node runner, so they cannot drift: options parse
 * (`StyleGeneratorOptionsSchema`), `resolveOptions`, theme parse
 * (`parseTheme`), then `assertThemeOptions` — the checks that need both. Each
 * failure is a `ZodError`; options fail before the theme is even looked at.
 *
 * `onStage` is called right before each step with the step's name, so a
 * caller that wants to say which one failed (the runner) can remember the
 * last stage; the others pass nothing. Internal: not exported from any
 * barrel.
 * @template T
 * @param {T} theme - Raw theme (`JSON.parse()` output or a typed theme)
 * @param {StyleGeneratorOptions} [options] - Raw generator options
 * @param {(stage: PrepareStage) => void} [onStage] - Called before each step
 * @returns {{ parsed: T, resolved: ResolvedOptions }} The validated theme, typed as the caller's `T`, and the resolved options
 * @throws {Error} A `ZodError` on an invalid option, an invalid theme, or a theme × options conflict
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
