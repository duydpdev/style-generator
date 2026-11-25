import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { generate } from "../index";

const root = join(__dirname, "..", "..");
const moduleUrl = pathToFileURL(join(root, "scripts", "ds-tokens.mjs")).href;
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
 * Run `themeToDsTokens` in a Node child process (the script is plain ESM over the built `dist/`).
 * @param {unknown} theme - The theme object
 * @param {Record<string, unknown>} options - The mapper options
 * @returns {{ ok?: DsTokens, error?: string }} The tokens, or the thrown message
 */
function map(
  theme: unknown,
  options: Record<string, unknown>,
): { ok?: DsTokens; error?: string } {
  const code = `import { themeToDsTokens } from ${JSON.stringify(moduleUrl)};
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { theme, options } = JSON.parse(input);
try { process.stdout.write(JSON.stringify({ ok: themeToDsTokens(theme, options) })); }
catch (e) { process.stdout.write(JSON.stringify({ error: e.message })); }`;
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    input: JSON.stringify({ theme, options }),
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout) as { ok?: DsTokens; error?: string };
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
      "the theme declares a color-mix(), which the page drops; the published system resolved it per theme",
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
      expect(lower(got.get(token.name)), token.name).toEqual(
        lower(token.value),
      );
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
    const line = generated.color.tokens.find((t) => t.name === "line");
    expect(JSON.stringify(line?.value)).toContain("color-mix(");
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
