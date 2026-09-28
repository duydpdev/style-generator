import { StyleGeneratorOptions } from "../../core/Options";
import type { TypographyConfig } from "../../core/themeSchema";
import { UTILITY_NAME_RE, toKebabCase } from "../../shared/helpers";

/**
 * Validate a derived `@utility` name, throwing a clear, actionable error
 * when the kebab-cased typography key cannot be used as-is. Uses the same
 * `UTILITY_NAME_RE` as `themeSchema.ts` so the parse-time rejection and the
 * CSS emission this function guards are always in sync.
 * @param {string} utilityName - Kebab-cased candidate utility name
 * @param {string} sourceKey - Original theme.typography key it came from
 * @returns {void} No return value; throws on invalid input
 */
const assertValidUtilityName = (
  utilityName: string,
  sourceKey: string,
): void => {
  if (UTILITY_NAME_RE.test(utilityName)) return;

  throw new Error(
    `Invalid typography utility name "@utility ${utilityName}" derived from ` +
      `theme.typography key "${sourceKey}". Tailwind v4 @utility names must ` +
      `match ${UTILITY_NAME_RE.source} (start with a lowercase letter, then ` +
      "only lowercase letters, digits, or dashes) — rename the typography " +
      "key so its kebab-case form doesn't start with a digit or a dash.",
  );
};

/**
 * Generate static CSS for `theme.typography`: replaces the old JS-plugin
 * `addUtilities(addDot(typography))` / `buildTypographyCssVarDriven` pair
 * with plain `@utility` CSS text, fed straight into `generate().css`.
 *
 * Emitted as `@utility <name> { ... }` (never a bare `.class {}` rule) so
 * Tailwind's variant engine (`hover:`, `md:`, ...) recognizes it — a plain
 * selector fed as raw CSS-text input is invisible to Tailwind's candidate
 * matcher, only CSS-first `@utility` declarations register a utility name.
 * @param {Record<string, TypographyConfig> | undefined} typography - Typography config keyed by utility name
 * @param {StyleGeneratorOptions} [options] - Generator options (`typography.cssVarDriven`)
 * @returns {string} CSS string, empty when there is no typography config
 */
export const generateTypographyCss = (
  typography: Record<string, TypographyConfig> | undefined,
  options: StyleGeneratorOptions = {},
): string => {
  if (!typography || Object.keys(typography).length === 0) return "";

  const blocks: string[] = [];

  if (options.typography?.cssVarDriven) {
    // Var-driven mode: tokens live in :root (@layer base, matching the old
    // api.addBase({ ":root": ... }) layer) and each utility references its
    // own var instead of a literal value.
    const varDeclarations: Record<string, string> = {};
    for (const [name, styles] of Object.entries(typography)) {
      const kebabName = toKebabCase(name);
      for (const [prop, value] of Object.entries(styles)) {
        varDeclarations[`--typography-${kebabName}-${toKebabCase(prop)}`] =
          String(value);
      }
    }
    const varLines = Object.entries(varDeclarations).map(
      ([k, v]) => `    ${k}: ${v};`,
    );
    blocks.push(`@layer base {\n  :root {\n${varLines.join("\n")}\n  }\n}`);

    for (const [name, styles] of Object.entries(typography)) {
      const utilityName = toKebabCase(name);
      assertValidUtilityName(utilityName, name);

      const lines = Object.keys(styles).map((prop) => {
        const cssProp = toKebabCase(prop);
        return `  ${cssProp}: var(--typography-${utilityName}-${cssProp});`;
      });
      blocks.push(`@utility ${utilityName} {\n${lines.join("\n")}\n}`);
    }
  } else {
    // Default mode: literal declaration values, same class names/values as
    // the old addUtilities(addDot(typography)) output.
    for (const [name, styles] of Object.entries(typography)) {
      const utilityName = toKebabCase(name);
      assertValidUtilityName(utilityName, name);

      const lines = Object.entries(styles).map(
        ([prop, value]) => `  ${toKebabCase(prop)}: ${String(value)};`,
      );
      blocks.push(`@utility ${utilityName} {\n${lines.join("\n")}\n}`);
    }
  }

  return blocks.join("\n\n") + "\n";
};
