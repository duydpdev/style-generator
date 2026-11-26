import type { Presets } from "./loadPreset";
import { INDEX_DTS_TEMPLATE } from "./templates";

// A TypeScript union of the keys, or `never`.
const union = (keys: readonly string[]): string =>
  keys.length > 0 ? keys.map((k) => JSON.stringify(k)).join(" | ") : "never";

/** The parts of `generate().tokens.Web` the declarations read. */
interface DsIndexTokens {
  opacities?: readonly number[];
  breakpoints: readonly string[];
}

/** What the declaration file is written from. */
export interface IndexDtsInput {
  theme: Record<string, Record<string, unknown> | undefined>;
  /** `generate().tokens.Web`. */
  tokens: DsIndexTokens;
  /** The product's presets. */
  presets: Presets;
  /** The bundle's global name. */
  namespace: string;
  /** The theme's file name. */
  themeFile: string;
}

/**
 * The components' `index.d.ts`: the template filled with this theme's keys and the presets' defaults.
 * @param {IndexDtsInput} input - The inputs
 * @returns {string} The declaration file
 */
export function indexDts({
  theme,
  tokens,
  presets,
  namespace,
  themeFile,
}: IndexDtsInput): string {
  const keys = (category: string): string[] =>
    Object.keys(theme[category] ?? {});
  const steps = tokens.opacities ?? [];
  const fill: Record<string, string | undefined> = {
    namespace,
    themeFile: `\`${themeFile}\``,
    ColorToken: union(keys("colors")),
    ColorValue:
      steps.length > 0
        ? `ColorToken | \`\${ColorToken}/\${${steps.join(" | ")}}\``
        : "ColorToken",
    TypographyToken: union(keys("typography")),
    RadiusToken: union(keys("borderRadius")),
    ShadowToken: union(keys("shadows")),
    BlurToken: union(keys("backdropBlurs")),
    BorderWidthToken: union(keys("borderWidth")),
    Breakpoint: union(tokens.breakpoints),
    SpacingBreakpoints: ["base", ...tokens.breakpoints]
      .map((b) => `${b}?: number;`)
      .join(" "),
    defaultType: presets.textPreset.defaultType,
    defaultColor: presets.textPreset.defaultColor,
    defaultIntent: presets.buttonPreset.intents[0],
    Intent: union(presets.buttonPreset.intents),
  };
  return INDEX_DTS_TEMPLATE.replaceAll(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const value = fill[key];
    if (value === undefined)
      throw new Error(`index.d.ts template: no value for {{${key}}}`);
    return value;
  });
}
