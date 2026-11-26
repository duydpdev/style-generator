import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  themeToDsTokens,
  type DsTokensOptions,
  type ThemeInput,
} from "../cli/commands/ds/dsTokens";
import { generate } from "../index";

const root = join(__dirname, "..", "..");
const fixtureDir = join(__dirname, "__fixtures__", "ds-style-generator");

interface DsToken {
  name: string;
  value: unknown;
  usage: string;
}
interface DsStyle {
  name: string;
  fontSize: string;
  lineHeight: number | string;
  fontWeight: number;
  letterSpacing?: string;
}
interface DsTokens {
  name: string;
  color: { themes: { id: string; name: string }[]; tokens: DsToken[] };
  type: {
    families: Record<string, string>;
    groups: { name: string; family: string; styles: DsStyle[] }[];
  };
  [family: string]: unknown;
}

/**
 * Runs `themeToDsTokens`, returning the thrown message instead of throwing.
 * @param {unknown} theme - The theme object
 * @param {Record<string, unknown>} options - The mapper options
 * @returns {{ ok?: DsTokens, error?: string }} The tokens, or the thrown message
 */
function map(
  theme: unknown,
  options: Record<string, unknown>,
): { ok?: DsTokens; error?: string } {
  try {
    return {
      ok: themeToDsTokens(
        theme as ThemeInput,
        options as unknown as DsTokensOptions,
      ) as unknown as DsTokens,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The tokens of a successful mapping; a thrown mapper error fails the test with its message.
 * @param {object} result - The mapper result
 * @param {DsTokens} [result.ok] - The tokens, when the mapper returned
 * @param {string} [result.error] - The thrown message, when it threw
 * @returns {DsTokens} The tokens
 */
function unwrap(result: { ok?: DsTokens; error?: string }): DsTokens {
  if (!result.ok)
    throw new Error(result.error ?? "the mapper returned nothing");
  return result.ok;
}

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

/** Keys of style-gen.config.json that are not `generate()` options. */
const CONFIG_ONLY_KEYS = new Set([
  "$schema",
  "theme",
  "output",
  "tokensOutput",
]);

const hasTokens = (group: unknown): group is { tokens: DsToken[] } =>
  typeof group === "object" &&
  group !== null &&
  "tokens" in group &&
  Array.isArray(group.tokens);

/**
 * Every `{ tokens }` family of a tokens.json, by family name.
 * @param {Record<string, unknown>} t - A tokens.json object
 * @returns {[string, DsToken[]][]} Family name and tokens, `type` excluded
 */
const tokenFamilies = (t: Record<string, unknown>): [string, DsToken[]][] =>
  Object.entries(t).flatMap(([family, group]): [string, DsToken[]][] =>
    family !== "type" && hasTokens(group) ? [[family, group.tokens]] : [],
  );

/**
 * Values the published system resolved by hand, so the mapper cannot reproduce them.
 * One row per token name and field; any other difference fails the golden test.
 */
export const KNOWN_DIFFERENCES = [
  {
    name: "line",
    field: "color",
    reason:
      "the theme declares a color-mix(), which the page drops; the published system resolved it per theme (the theme now names it border, see RENAMED_SINCE_PUBLISH)",
  },
  {
    name: "text-12-mono",
    field: "family",
    reason:
      "the sample role has no fontFamily, so it goes to the default family; the published system set mono by hand",
  },
  {
    name: "display-56-serif",
    field: "family",
    reason:
      "the sample role has no fontFamily, so it goes to the default family; the published system set serif by hand",
  },
] as const;

/**
 * Colour keys the example theme renamed after the fixture was read from the published system: fixture name → theme name.
 * Remove a row once the system is republished and the fixture refreshed; the guard test fails until then.
 */
const RENAMED_SINCE_PUBLISH: Readonly<Record<string, string>> = {
  line: "border",
};

const known = (name: string, field: string): boolean =>
  KNOWN_DIFFERENCES.some((row) => row.name === name && row.field === field);

/**
 * Lowercases every string in a value, so hex colors compare case-insensitively.
 * @param {unknown} v - A token value
 * @returns {unknown} The value with lowercased strings
 */
function lower(v: unknown): unknown {
  if (typeof v === "string") return v.toLowerCase();
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, lower(x)]));
  return v;
}

describe("themeToDsTokens — golden against the published Style Generator system", () => {
  const fixture = readJson(
    join(fixtureDir, "tokens.json"),
  ) as unknown as DsTokens;
  const theme = readJson(join(root, "examples/design-system/src/theme.json"));
  const options = Object.fromEntries(
    Object.entries(
      readJson(join(root, "examples/design-system/style-gen.config.json")),
    ).filter(([key]) => !CONFIG_ONLY_KEYS.has(key)),
  );
  const web = generate(theme as never, options as never).tokens.Web;
  const screens = Object.fromEntries(
    web.breakpoints.map((b: string) => [
      b,
      (web.screens as Record<string, string>)[b],
    ]),
  );
  const result = map(theme, {
    name: fixture.name,
    opacities: web.opacities,
    screens,
  });
  const generated = result.ok ?? ({} as DsTokens);

  it("maps the sample theme without throwing", () => {
    expect(result.error).toBeUndefined();
  });

  it("lists the fixture's themes", () => {
    expect(generated.color.themes).toEqual(fixture.color.themes);
  });

  it("reproduces every color in every theme, hex compared case-insensitively", () => {
    const got = new Map(generated.color.tokens.map((t) => [t.name, t.value]));
    for (const token of fixture.color.tokens) {
      if (known(token.name, "color")) continue;
      const name = RENAMED_SINCE_PUBLISH[token.name] ?? token.name;
      expect(lower(got.get(name)), token.name).toEqual(lower(token.value));
    }
  });

  it("reproduces every type style and its family", () => {
    const got = new Map(
      generated.type.groups.flatMap((g) =>
        g.styles.map((s) => [s.name, { ...s, family: g.family }] as const),
      ),
    );
    for (const group of fixture.type.groups) {
      for (const style of group.styles) {
        const mine = got.get(style.name);
        expect(mine, style.name).toBeDefined();
        const { fontSize, lineHeight, fontWeight, letterSpacing } = style;
        expect(
          mine && {
            fontSize: mine.fontSize,
            lineHeight: mine.lineHeight,
            fontWeight: mine.fontWeight,
            letterSpacing: mine.letterSpacing,
          },
          style.name,
        ).toEqual({ fontSize, lineHeight, fontWeight, letterSpacing });
        if (!known(style.name, "family"))
          expect(mine?.family, style.name).toBe(group.family);
      }
    }
    expect(generated.type.families).toEqual(fixture.type.families);
  });

  it("reproduces radius, shadow, border width, blur, opacity and breakpoint values", () => {
    for (const family of [
      "radius",
      "shadow",
      "borderWidth",
      "backdropBlur",
      "opacity",
      "breakpoint",
    ]) {
      const mine = new Map(
        tokenFamilies(generated)
          .find(([f]) => f === family)?.[1]
          .map((t) => [t.name, t.value]),
      );
      const theirs =
        tokenFamilies(fixture).find(([f]) => f === family)?.[1] ?? [];
      expect(theirs.length, family).toBeGreaterThan(0);
      for (const token of theirs)
        expect(mine.get(token.name), `${family} ${token.name}`).toEqual(
          token.value,
        );
    }
  });

  it("keeps the known-difference list short and real", () => {
    expect(KNOWN_DIFFERENCES.length).toBeLessThanOrEqual(10);
    const border = generated.color.tokens.find(
      (t) => t.name === RENAMED_SINCE_PUBLISH.line,
    );
    expect(JSON.stringify(border?.value)).toContain("color-mix(");
  });

  it("keeps a rename only while the fixture still has the old name", () => {
    const fixtureNames = new Set(fixture.color.tokens.map((t) => t.name));
    const generatedNames = new Set(generated.color.tokens.map((t) => t.name));
    for (const [from, to] of Object.entries(RENAMED_SINCE_PUBLISH)) {
      expect(fixtureNames.has(from), `fixture still has ${from}`).toBe(true);
      expect(generatedNames.has(from), `theme no longer has ${from}`).toBe(
        false,
      );
      expect(generatedNames.has(to), `theme has ${to}`).toBe(true);
    }
  });

  it("emits unique names across families, as the fixture does", () => {
    for (const t of [fixture, generated]) {
      const names = tokenFamilies(t).flatMap(([, tokens]) =>
        tokens.map((x) => x.name),
      );
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("themeToDsTokens — rules", () => {
  const alt = readJson(join(root, "examples/design-system/src/theme.alt.json"));

  it("keeps the color keys in order and turns an alias into the type's alias form", () => {
    const t = unwrap(map(alt, { name: "Alt" }));
    expect(t.color.tokens.map((x) => x.name)).toEqual(
      Object.keys(alt.colors as object).map((k) =>
        k.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
      ),
    );
    expect(
      t.color.tokens.find((x) => x.name === "brand-foreground")?.value,
    ).toEqual({
      light: "{paper}",
      night: "{paper}",
    });
  });

  describe("translucent alias `$<key>/<n>`", () => {
    const find = (t: DsTokens, name: string) =>
      t.color.tokens.find((x) => x.name === name)?.value;

    it("resolves to a literal rgba of the target hex, in the base record and in a dark override", () => {
      const t = unwrap(
        map(
          {
            colors: {
              navy700: "#1f2a44",
              ink: "#000000",
              border: "$navy700/8",
              scrim: "$ink/60",
            },
            themeAxes: {
              theme: {
                dark: { colors: { ink: "#ffffff", border: "$ink/12" } },
              },
            },
          },
          { name: "Alpha" },
        ),
      );
      expect(find(t, "border")).toEqual({
        light: "rgba(31, 42, 68, 0.08)",
        dark: "rgba(255, 255, 255, 0.12)",
      });
      expect(find(t, "scrim")).toEqual({
        light: "rgba(0, 0, 0, 0.6)",
        dark: "rgba(255, 255, 255, 0.6)",
      });
    });

    it("follows a plain alias chain and reads 3-digit hex", () => {
      const t = unwrap(
        map(
          { colors: { red: "#f00", brand: "$red", veil: "$brand/50" } },
          { name: "Alpha" },
        ),
      );
      expect(find(t, "veil")).toEqual({ light: "rgba(255, 0, 0, 0.5)" });
    });

    it("keeps color-mix(...) when the target is not a hex", () => {
      const t = unwrap(
        map(
          { colors: { navy700: "rgb(1 2 3)", border: "$navy700/8" } },
          { name: "Alpha" },
        ),
      );
      expect(find(t, "border")).toEqual({
        light: "color-mix(in srgb, var(--sg-color-navy-700) 8%, transparent)",
      });
    });
  });

  it("adds each variant as a theme with its override, else the base value", () => {
    const t = unwrap(map(alt, { name: "Alt" }));
    expect(t.color.themes).toEqual([
      { id: "light", name: "Light" },
      { id: "night", name: "Night" },
    ]);
    expect(t.color.tokens.find((x) => x.name === "ink")?.value).toEqual({
      light: "#1c1917",
      night: "#f5f5f4",
    });
    expect(t.color.tokens.find((x) => x.name === "brand")?.value).toEqual({
      light: "#0f766e",
      night: "#0f766e",
    });
  });

  it("puts a usage line on its color and keeps spacing names verbatim", () => {
    const t = unwrap(
      map(alt, {
        name: "Alt",
        usage: { brand: "Primary actions" },
        spacing: [{ name: "control-sm", value: "28px" }],
      }),
    );
    expect(t.color.tokens.find((x) => x.name === "brand")?.usage).toBe(
      "Primary actions",
    );
    expect((t.spacing as { tokens: DsToken[] }).tokens).toEqual([
      { name: "control-sm", value: "28px", usage: "" },
    ]);
  });

  it("throws when two families emit the same name", () => {
    const result = map(alt, {
      name: "Alt",
      spacing: [{ name: "radius-soft", value: "4px" }],
    });
    expect(result.error).toMatch(
      /"radius-soft" is used by both spacing and radius/,
    );
  });

  it("throws when variants of two axes share an id", () => {
    const theme = {
      ...alt,
      themeAxes: {
        mode: { night: { colors: {} } },
        palette: { night: { colors: {} } },
      },
    };
    expect(map(theme, { name: "Alt" }).error).toMatch(
      /two themes share the id "night"/,
    );
  });
});
