import {
  formatZodError,
  generate,
  type StyleGeneratorOptions,
  type ThemeConfig,
} from "@duydpdev/style-generator";

export type PlaygroundResult =
  { ok: true; css: string; tokens: string } | { ok: false; message: string };

type ZodErrorLike = Parameters<typeof formatZodError>[0];

/**
 * `zod` is not a dependency of the site, so `instanceof` is unavailable.
 * @param error - A caught value
 * @returns Whether it is a `ZodError` thrown by `generate()`
 */
function isZodError(error: unknown): error is ZodErrorLike {
  return error instanceof Error && error.name === "ZodError";
}

/**
 * @param error - A caught value
 * @returns Its message
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Runs `generate()` on two JSON texts, as the playground page does.
 * @param themeText - The theme JSON
 * @param optionsText - The options JSON; empty or whitespace means `{}`
 * @returns The CSS and the typed tokens (JSON), or a readable error
 */
export function runPlayground(
  themeText: string,
  optionsText: string,
): PlaygroundResult {
  let themeValue: unknown;
  let optionsValue: unknown;
  try {
    themeValue = JSON.parse(themeText);
  } catch (error) {
    return { ok: false, message: `Theme JSON: ${messageOf(error)}` };
  }
  try {
    optionsValue = optionsText.trim() === "" ? {} : JSON.parse(optionsText);
  } catch (error) {
    return { ok: false, message: `Options JSON: ${messageOf(error)}` };
  }
  // generate() validates both values against its schemas before it reads them.
  const theme = themeValue as ThemeConfig;
  const options = optionsValue as StyleGeneratorOptions;
  try {
    const result = generate(theme, options);
    return {
      ok: true,
      css: result.css,
      tokens: JSON.stringify(result.tokens, null, 2),
    };
  } catch (error) {
    return {
      ok: false,
      message: isZodError(error) ? formatZodError(error) : messageOf(error),
    };
  }
}
