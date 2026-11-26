import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dsBuildCommand } from "../cli/commands/ds/build";
import { COMPONENTS } from "../cli/commands/ds/dsDocs";
import { sameMinor } from "../cli/commands/ds/stamp";
import { COVER_TEMPLATE } from "../cli/commands/ds/templates";
import { DS_COVER_KEYS } from "../shared/dsTokenNames";

const fixtureDir = join(__dirname, "__fixtures__", "ds-build");
const fixtureTheme = JSON.parse(
  readFileSync(join(fixtureDir, "theme.json"), "utf8"),
) as Record<string, unknown>;

const scratch: string[] = [];
let errors: string[];

beforeEach(() => {
  errors = [];
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of scratch.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const tempDir = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  scratch.push(dir);
  return dir;
};

/**
 * Runs `ds build` on a theme file with the fixture config and preset, into an `out` directory that does not exist yet.
 * @param {string} themeFile - The theme to build
 * @param {Record<string, string>} flags - Flags that replace or add to the fixture's
 * @returns {Promise<{ code: number, out: string }>} The exit code and the `out` directory
 */
async function runDsBuild(
  themeFile: string,
  flags: Record<string, string> = {},
): Promise<{ code: number; out: string }> {
  const out = join(tempDir("ds-build-test-"), "out");
  const code = await dsBuildCommand(
    {
      theme: themeFile,
      config: join(fixtureDir, "style-gen.config.json"),
      preset: join(fixtureDir, "ds.preset.ts"),
      namespace: "Fixture",
      out,
      ...flags,
    },
    fixtureDir,
  );
  return { code, out };
}

// The fixture theme with `change` applied, written to a scratch file.
function writeTheme(change: (theme: Record<string, unknown>) => unknown) {
  const file = join(tempDir("ds-build-theme-"), "theme.json");
  writeFileSync(file, JSON.stringify(change({ ...fixtureTheme })));
  return file;
}

const themeWithout = (key: string): string =>
  writeTheme((theme) =>
    Object.fromEntries(Object.entries(theme).filter(([name]) => name !== key)),
  );

describe("style-gen ds build end to end", () => {
  it("builds a design system with a README and a cover from a theme that follows the standard", async () => {
    const { code, out } = await runDsBuild(join(fixtureDir, "theme.json"));
    expect(code, errors.join("\n")).toBe(0);

    const cover = join(out, "components", "Cover", "preview.html");
    expect(readFileSync(cover, "utf8")).not.toContain("{{");

    const stamp = JSON.parse(
      readFileSync(join(out, "ds-stamp.json"), "utf8"),
    ) as { themeSha256: string };
    expect(stamp.themeSha256).toBe(
      createHash("sha256")
        .update(readFileSync(join(fixtureDir, "theme.json")))
        .digest("hex"),
    );
    expect(readFileSync(join(out, "README.md"), "utf8")).toContain("## Naming");

    const bundle = readFileSync(join(out, "components", "bundle.js"), "utf8");
    expect(bundle).not.toContain("jsxDEV");
    expect(bundle).not.toContain("jsx-dev-runtime");
    expect(bundle).not.toContain("design-system-example");
  });

  it("builds a theme without borderRadius and says so in the README", async () => {
    const { code, out } = await runDsBuild(themeWithout("borderRadius"));
    expect(code, errors.join("\n")).toBe(0);
    expect(readFileSync(join(out, "README.md"), "utf8")).toContain(
      "## Radius\n\nThis theme defines no `borderRadius` keys.\n",
    );
    expect(
      readFileSync(join(out, "components", "index.d.ts"), "utf8"),
    ).toContain("RadiusToken = never");
  });

  it("refuses a theme without typography before building and writes nothing", async () => {
    const { code, out } = await runDsBuild(themeWithout("typography"));
    expect(code).toBe(1);
    expect(errors.join("\n")).toContain(
      "theme has no typography: a design system needs at least one typography key (the cover title and the Text component use one)",
    );
    expect(existsSync(out)).toBe(false);
  });

  it("resolves a translucent alias to a literal rgba in tokens.json and prints it as `$<key> at <n>%` in the README", async () => {
    const { code, out } = await runDsBuild(
      writeTheme((theme) => ({
        ...theme,
        colors: {
          ...(theme.colors as Record<string, string>),
          hairline: "$gray900/8",
        },
        themeAxes: { theme: { dark: { colors: { hairline: "$white/16" } } } },
      })),
    );
    expect(code, errors.join("\n")).toBe(0);

    const tokens = JSON.parse(
      readFileSync(join(out, "tokens.json"), "utf8"),
    ) as { color: { tokens: { name: string; value: unknown }[] } };
    expect(
      tokens.color.tokens.find((t) => t.name === "hairline")?.value,
    ).toEqual({
      light: "rgba(17, 24, 39, 0.08)",
      dark: "rgba(255, 255, 255, 0.16)",
    });
    const readme = readFileSync(join(out, "README.md"), "utf8");
    expect(readme).toContain("$gray900 at 8%");
    expect(readme).not.toContain("$gray900/8");
  });

  it("exits 2 for a missing flag and for a namespace that is not an identifier", async () => {
    const theme = join(fixtureDir, "theme.json");
    expect((await runDsBuild(theme, { namespace: "" })).code).toBe(2);
    expect(errors.join("\n")).toContain("missing --namespace");
    errors.length = 0;
    expect((await runDsBuild(theme, { namespace: "9bad" })).code).toBe(2);
    expect(errors.join("\n")).toContain(
      "--namespace must be a JavaScript identifier",
    );
  });

  it("exits 2 and writes nothing for a preset that is not data", async () => {
    const preset = join(tempDir("ds-build-preset-"), "ds.preset.mjs");
    writeFileSync(
      preset,
      `export const boxPreset = {};
export const textPreset = { defaultType: "body", defaultColor: "foreground", pick: () => 1 };
export const buttonPreset = { intents: ["primary"] };`,
    );
    const { code, out } = await runDsBuild(join(fixtureDir, "theme.json"), {
      preset,
    });
    expect(code).toBe(2);
    expect(errors.join("\n")).toContain("a preset is data");
    expect(existsSync(out)).toBe(false);
  });
});

describe("ds build output gate", () => {
  it("names the classes the components render when the stylesheet has no rule for them", async () => {
    const preset = join(tempDir("ds-build-preset-"), "ds.preset.mjs");
    // `zz-unknown-class` is no Tailwind utility: the Box renders it and the stylesheet has no rule for it.
    const fixturePreset = readFileSync(
      join(fixtureDir, "ds.preset.ts"),
      "utf8",
    );
    writeFileSync(
      preset,
      fixturePreset
        .replaceAll(" as const", "")
        .replace('base: "relative"', 'base: "relative zz-unknown-class"'),
    );
    const { code, out } = await runDsBuild(join(fixtureDir, "theme.json"), {
      preset,
    });
    expect(code).toBe(1);
    expect(errors.join("\n")).toContain("zz-unknown-class");
    expect(existsSync(out)).toBe(false);
  });
});

describe("the stamp's version", () => {
  it.each([
    ["9.3.0", "9.3.1", true],
    ["9.3.1", "9.3.0", true],
    ["9.3.0", "9.4.0", false],
    ["9.3.0", "10.3.0", false],
  ])("installed %s against stamped %s is %s", (installed, stamped, same) => {
    expect(sameMinor(installed, stamped)).toBe(same);
  });

  it("is never the same as a stamp without a version", () => {
    expect(sameMinor("9.3.0", undefined)).toBe(false);
    expect(sameMinor("9.3.0", 9.3)).toBe(false);
  });
});

describe("the design system's fixed lists", () => {
  it("reads exactly the colours the cover template names", () => {
    const named = new Set(
      [...COVER_TEMPLATE.matchAll(/\{\{v:(\w+)\}\}/g)].map((m) => m[1]),
    );
    expect(new Set(DS_COVER_KEYS)).toEqual(named);
  });

  it("builds the six components the standard names", () => {
    expect(COMPONENTS.map((c) => c.name)).toEqual([
      "Box",
      "Text",
      "Stack",
      "Flex",
      "Grid",
      "Button",
    ]);
  });
});
