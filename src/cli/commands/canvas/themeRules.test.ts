import { describe, expect, it } from "vitest";

import { DEFAULT_STANDARD, StandardSchema } from "./standardSchema";
import { namingViolations, PRIMITIVE } from "./themeRules";

const FORM = "<role>[Subtle][Border][Foreground][Hover|Active|Selected]";

/**
 * The grammar lines `--naming` prints for a theme whose `colors` hold the
 * given semantic keys, each aliasing a primitive.
 * @param {string[]} keys - Semantic colour keys
 * @param {typeof DEFAULT_STANDARD} standard - Manifest
 * @returns {string[]} The grammar messages only
 */
const grammarLines = (keys: string[], standard = DEFAULT_STANDARD): string[] =>
  namingViolations(
    {
      colors: {
        blue600: "#2563eb",
        ...Object.fromEntries(keys.map((key) => [key, "$blue600"])),
      },
    },
    standard,
  ).filter((line) => line.includes(" does not follow "));

describe("v2 colour grammar", () => {
  it.each([
    "domainNutritionSubtle",
    "primaryForegroundHover",
    "successSubtleForeground",
    "outline",
    "notebook",
  ])("accepts %s", (key) => {
    expect(grammarLines([key])).toEqual([]);
  });

  it.each([
    ["onPrimary", "primaryForeground"],
    ["okInk", "successForeground"],
    ["lineStrong", "borderStrong"],
    ["statusOk", "statusSuccess"],
    ["primaryHoverForeground", "primaryForegroundHover"],
  ])("reports %s and suggests %s", (key, suggestion) => {
    expect(grammarLines([key])).toEqual([
      `colors.${key} does not follow ${FORM} (rename to ${suggestion})`,
    ]);
  });

  it("asks for a manual merge when the suggested key already exists", () => {
    expect(grammarLines(["onPrimary", "primaryForeground"])).toEqual([
      `colors.onPrimary does not follow ${FORM} (primaryForeground exists: merge manually)`,
    ]);
  });

  it("asks for a manual merge when two keys suggest the same name", () => {
    expect(grammarLines(["onPrimary", "primaryInk"])).toEqual([
      `colors.onPrimary does not follow ${FORM} (primaryForeground exists: merge manually)`,
      `colors.primaryInk does not follow ${FORM} (primaryForeground exists: merge manually)`,
    ]);
  });

  it.each(["primaryHoverActive", "primarySelectedHover"])(
    "suggests nothing for %s, which has two states",
    (key) => {
      expect(grammarLines([key])).toEqual([
        `colors.${key} does not follow ${FORM}`,
      ]);
    },
  );

  it("moves a capitalised On prefix too", () => {
    expect(grammarLines(["OnPrimary"])).toEqual([
      `colors.OnPrimary does not follow ${FORM} (rename to primaryForeground)`,
    ]);
  });

  it.each(["primaryCTA", "seriesA", "primaryCTAInk", "lineHeightX"])(
    "suggests nothing for %s when the v2 name would break the grammar too",
    (key) => {
      expect(grammarLines([key])).toEqual([
        `colors.${key} does not follow ${FORM}`,
      ]);
    },
  );

  it("suggests only names that follow the grammar", () => {
    const keys = [
      "onPrimary",
      "OnPrimary",
      "okInk",
      "badSoft",
      "warnLine",
      "line",
      "lineStrong",
      "statusOk",
      "primaryHoverForeground",
      "primarySoftHover",
      "primaryBorderSubtle",
      "tabActiveBorder",
      "statusOkSubtle",
      "onInk",
      "onLine",
      "soft",
      "chartLine",
      "onDomainNutritionHover",
    ];
    const suggestions = keys
      .flatMap((key) => grammarLines([key]))
      .map((line) => /\(rename to (\w+)\)$/.exec(line)?.[1])
      .filter((target) => target !== undefined);
    expect(suggestions).toHaveLength(keys.length);
    for (const target of suggestions)
      expect(grammarLines([target])).toEqual([]);
  });

  it("reports a themeAxes override key, checked against the base colors", () => {
    const lines = namingViolations(
      {
        colors: { blue600: "#2563eb", okInk: "$blue600" },
        themeAxes: { theme: { dark: { colors: { okInk: "$blue600" } } } },
      },
      DEFAULT_STANDARD,
    ).filter((line) => line.includes(" does not follow "));
    expect(lines).toEqual([
      `colors.okInk does not follow ${FORM} (rename to successForeground)`,
      `themeAxes.theme.dark.colors.okInk does not follow ${FORM} (rename to successForeground)`,
    ]);
  });

  it("reports no grammar line when the manifest has no grammar", () => {
    const withoutGrammar = { ...DEFAULT_STANDARD, grammar: undefined };
    expect(grammarLines(["okInk", "onPrimary"], withoutGrammar)).toEqual([]);
    expect(grammarLines(["okInk", "onPrimary"])).toHaveLength(2);
  });
});

describe("manifest grammar", () => {
  it.each([
    ["a suffix with a RegExp character", { suffixes: ["("] }],
    ["an alternation smuggled into a state", { states: ["A|B"] }],
    ["no state", { states: [] }],
  ])("rejects %s", (_, change) => {
    const grammar = { ...DEFAULT_STANDARD.grammar, ...change };
    expect(
      StandardSchema.safeParse({ ...DEFAULT_STANDARD, grammar }).success,
    ).toBe(false);
  });
});

describe("manifest weights", () => {
  it.each([["Regular("], ["A|B"], ["regular"]])("rejects %s", (word) => {
    const weights = { ...DEFAULT_STANDARD.weights, "400": word };
    expect(
      StandardSchema.safeParse({ ...DEFAULT_STANDARD, weights }).success,
    ).toBe(false);
  });
});

describe("primitive colour keys", () => {
  it.each(["blue50", "blue950", "whiteAlpha12", "gray500", "black"])(
    "%s is a primitive",
    (key) => {
      expect(PRIMITIVE.test(key)).toBe(true);
    },
  );

  it.each(["blue150", "blue1000", "blue5", "primary"])(
    "%s is not a primitive",
    (key) => {
      expect(PRIMITIVE.test(key)).toBe(false);
    },
  );

  it("lets a 50 or 950 step hold a literal", () => {
    expect(
      namingViolations(
        { colors: { blue50: "#eff6ff", blue950: "#172554" } },
        DEFAULT_STANDARD,
      ).filter((line) => line.startsWith("colors.")),
    ).toEqual([]);
  });
});
