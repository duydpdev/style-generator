import { resolveOptions } from "../../core/resolveOptions";
import type { ResolvedOptions } from "../../core/resolveOptions";
import type { TypographyConfig } from "../../core/themeSchema";
import { cssBlock } from "../../shared/cssBlock";
import { UTILITY_NAME_RE, toKebabCase } from "../../shared/helpers";

// Throws when a kebab-cased key is not a valid `@utility` name (same regex as `themeSchema.ts`).
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

// Entries with a value: optional fields may be present as explicit `undefined`.
const definedEntries = (
  styles: TypographyConfig,
): [string, string | number][] => {
  const entries: [string, string | number | undefined][] =
    Object.entries(styles);
  return entries.filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined,
  );
};

/**
 * Generates one `@utility <kebab-key>` block per `theme.typography` style.
 * @param {Record<string, TypographyConfig> | undefined} typography - Typography config keyed by utility name
 * @param {Pick<ResolvedOptions, "typographyCssVarDriven">} [options] - Resolved generator options
 * @returns {string} CSS string, empty when there is no typography config
 */
// Rationale: documents/architecture.md#generatespacingcss-utility-blocks-fallback-chains-and-property
export const generateTypographyCss = (
  typography: Record<string, TypographyConfig> | undefined,
  options: Pick<ResolvedOptions, "typographyCssVarDriven"> = resolveOptions(),
): string => {
  if (!typography || Object.keys(typography).length === 0) return "";

  const blocks: string[] = [];

  if (options.typographyCssVarDriven) {
    // Var-driven mode: values live in `:root` (`@layer base`); utilities read the vars.
    const varDeclarations: Record<string, string> = {};
    for (const [name, styles] of Object.entries(typography)) {
      const kebabName = toKebabCase(name);
      for (const [prop, value] of definedEntries(styles)) {
        varDeclarations[`--typography-${kebabName}-${toKebabCase(prop)}`] =
          String(value);
      }
    }
    const varLines = Object.entries(varDeclarations).map(
      ([k, v]) => `    ${k}: ${v};`,
    );
    blocks.push(
      cssBlock("@layer base", cssBlock(":root", varLines.join("\n"), "  ")),
    );

    for (const [name, styles] of Object.entries(typography)) {
      const utilityName = toKebabCase(name);
      assertValidUtilityName(utilityName, name);

      const lines = definedEntries(styles).map(([prop]) => {
        const cssProp = toKebabCase(prop);
        return `  ${cssProp}: var(--typography-${utilityName}-${cssProp});`;
      });
      blocks.push(cssBlock(`@utility ${utilityName}`, lines.join("\n")));
    }
  } else {
    // Default mode: literal declaration values.
    for (const [name, styles] of Object.entries(typography)) {
      const utilityName = toKebabCase(name);
      assertValidUtilityName(utilityName, name);

      const lines = definedEntries(styles).map(
        ([prop, value]) => `  ${toKebabCase(prop)}: ${String(value)};`,
      );
      blocks.push(cssBlock(`@utility ${utilityName}`, lines.join("\n")));
    }
  }

  return blocks.join("\n\n") + "\n";
};
