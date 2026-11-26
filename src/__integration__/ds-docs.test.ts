import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { generate } from "../index";

import { buttonPreset } from "./__fixtures__/ds-build/ds.preset";

interface Theme {
  colors: Record<string, string>;
  typography?: Record<string, { fontSize: string }> | undefined;
  borderRadius?: Record<string, string> | undefined;
  controlHeight?: Record<string, string> | undefined;
  themeAxes?: Record<
    string,
    Record<string, { colors?: Record<string, string> }>
  >;
}
interface DsDocsModule {
  README_SECTIONS: string[];
  buildReadme: (input: {
    name: string;
    themeFile: string;
    theme: Theme;
    namespace: string;
    intents: readonly string[];
  }) => string;
  renderCover: (
    template: string,
    input: {
      name: string;
      namespace: string;
      theme: Theme;
      titleClass: string;
    },
  ) => string;
  dsInputFailures: (input: {
    theme: Theme;
    coverTemplate: string;
    buttonPreset: typeof buttonPreset;
  }) => string[];
  verifyDsOutput: (output: {
    readme: string;
    cover: string;
    coverVars: ReadonlySet<string>;
    titleClass: string;
    bundleCss: string;
  }) => string[];
}

const root = join(__dirname, "..", "..");
const fixtureDir = join(__dirname, "__fixtures__", "ds-build");
const theme = JSON.parse(
  readFileSync(join(fixtureDir, "theme.json"), "utf8"),
) as Theme;
const template = readFileSync(
  join(root, "scripts", "ds-cover.html.tmpl"),
  "utf8",
);
const coverVars = new Set(
  [...generate(theme as never).css.matchAll(/(--sg-[a-z0-9-]+)\s*:/g)].map(
    (m) => m[1] ?? "",
  ),
);
const titleClass = "text-32-bold";
/** Stands in for the compiled bundle.css; build-ds.test.ts checks the real one. */
const bundleCss = ".text-32-bold { font-size: 32px; }";

let mod: DsDocsModule;
let readme: string;
let cover: string;

beforeAll(async () => {
  mod = (await import(
    pathToFileURL(join(root, "scripts", "ds-docs.mjs")).href
  )) as DsDocsModule;
  readme = mod.buildReadme({
    name: "Fixture",
    themeFile: "theme.json",
    theme,
    namespace: "Fixture",
    intents: ["primary", "danger"],
  });
  cover = mod.renderCover(template, {
    name: "Fixture",
    namespace: "Fixture",
    theme,
    titleClass,
  });
});

const verify = (edit: {
  readme?: string;
  cover?: string;
  titleClass?: string;
  bundleCss?: string;
}) =>
  mod.verifyDsOutput({
    readme: edit.readme ?? readme,
    cover: edit.cover ?? cover,
    coverVars,
    titleClass: edit.titleClass ?? titleClass,
    bundleCss: edit.bundleCss ?? bundleCss,
  });

describe("buildReadme", () => {
  it("writes every README section, each non-empty", () => {
    for (const section of mod.README_SECTIONS)
      expect(readme).toContain(`\n## ${section}\n`);
    expect(verify({})).toEqual([]);
  });

  it("gives the Semantic table one column per theme variant", () => {
    expect(readme).toContain("| key | base | dark |");
    expect(readme).toContain("| `background` | $white | $gray900 |");
    expect(readme).toContain("| `muted` | $gray500 | — |");
  });

  it("prints a translucent alias as `$<key> at <n>%`, never the raw `/<n>` form", () => {
    const alpha = mod.buildReadme({
      name: "Fixture",
      themeFile: "theme.json",
      theme: {
        ...theme,
        colors: { ...theme.colors, navy700: "#1f2a44", border: "$navy700/8" },
        themeAxes: {
          theme: { dark: { colors: { border: "$navy700/16" } } },
        },
      },
      namespace: "Fixture",
      intents: ["primary", "danger"],
    });
    expect(alpha).toContain("| `border` | $navy700 at 8% | $navy700 at 16% |");
    expect(
      alpha.split("\n").filter((l) => l.includes("$navy700/")),
    ).toHaveLength(0);
  });

  it.each([
    ["absent", undefined],
    ["empty", {}],
  ])("annotates ## Radius when borderRadius is %s", (_label, borderRadius) => {
    const noRadius = mod.buildReadme({
      name: "Fixture",
      themeFile: "theme.json",
      theme: { ...theme, borderRadius },
      namespace: "Fixture",
      intents: ["primary", "danger"],
    });
    expect(noRadius).toContain(
      "## Radius\n\nThis theme defines no `borderRadius` keys.\n",
    );
    expect(verify({ readme: noRadius })).toEqual([]);
  });

  it("links the naming convention instead of copying it", () => {
    expect(readme).toContain(
      'Full convention: style-generator documents/agent-contract.md → "Naming convention".',
    );
  });
});

describe("renderCover", () => {
  it("starts with the card marker and reads only bundle.css colour variables", () => {
    expect(cover.split("\n")[0]).toBe("<!-- @dsCard height=288 -->");
    const vars = [...cover.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
    expect(vars.length).toBeGreaterThan(0);
    for (const v of vars) expect(v).toMatch(/^--sg-color-/);
    expect(cover).not.toContain("{{");
    expect(cover).toContain('<p class="name text-32-bold">Fixture</p>');
  });

  it("escapes the name, keeps $& literally and does not expand a placeholder inside it", () => {
    const odd = mod.renderCover(template, {
      name: "A & <B> $& {{swatches}}",
      namespace: "Fixture",
      theme,
      titleClass,
    });
    expect(odd).toContain(
      '<p class="name text-32-bold">A &amp; &lt;B&gt; $&amp; {{swatches}}</p>',
    );
    expect(verify({ cover: odd })).toEqual([
      "cover keeps placeholder {{swatches}}",
    ]);
  });

  it("leaves {{v:<key>}} for a colour the theme lacks", () => {
    const colors = Object.fromEntries(
      Object.entries(theme.colors).filter(([key]) => key !== "success"),
    );
    const partial = mod.renderCover(template, {
      name: "Fixture",
      namespace: "Fixture",
      theme: { ...theme, colors },
      titleClass,
    });
    expect(verify({ cover: partial })).toEqual([
      "cover keeps placeholder {{v:success}}",
    ]);
  });
});

describe("verifyDsOutput negative controls", () => {
  it("reports a missing README section", () => {
    expect(
      verify({ readme: readme.replace("## Typography\n", "## Type\n") }),
    ).toEqual(["README misses section ## Typography"]);
  });

  it("reports an empty README section", () => {
    const start = readme.indexOf("## Radius\n");
    const end = readme.indexOf("## Components\n");
    const emptied = `${readme.slice(0, start)}## Radius\n\n${readme.slice(end)}`;
    expect(verify({ readme: emptied })).toEqual([
      "README section ## Radius is empty",
    ]);
  });

  it("counts a table without rows as empty", () => {
    const start = readme.indexOf("## Radius\n");
    const end = readme.indexOf("## Components\n");
    const headerOnly = `${readme.slice(0, start)}## Radius\n\n| key | value |\n| --- | --- |\n\n${readme.slice(end)}`;
    expect(verify({ readme: headerOnly })).toEqual([
      "README section ## Radius is empty",
    ]);
  });

  it("reports a variable the theme does not produce", () => {
    expect(
      verify({
        cover: cover.replace(
          "</style>",
          ".x { color: var(--bogus); }\n</style>",
        ),
      }),
    ).toEqual(["cover reads var(--bogus), which the theme does not produce"]);
  });

  it("reports an unfilled placeholder", () => {
    expect(
      verify({
        cover: cover.replace("name text-32-bold", "name {{titleClass}}"),
      }),
    ).toEqual(["cover keeps placeholder {{titleClass}}"]);
  });

  it("reports a title class bundle.css does not define", () => {
    const failure = "cover title class .text-32-bold is not in bundle.css";
    expect(verify({ bundleCss: ".text-16-regular { }" })).toEqual([failure]);
    expect(verify({ bundleCss: ".text-32-bold-x { }" })).toEqual([failure]);
  });

  it("reports a theme without a typography key for the title", () => {
    expect(verify({ titleClass: "", bundleCss: "content: '.';" })).toEqual([
      "theme has no typography key for the cover title",
    ]);
  });
});

describe("dsInputFailures", () => {
  const inputs = (edit: Partial<Theme>) =>
    mod.dsInputFailures({
      theme: { ...theme, ...edit },
      coverTemplate: template,
      buttonPreset,
    });
  const noTypography =
    "theme has no typography: a design system needs at least one typography key (the cover title and the Text component use one)";

  it("accepts the fixture theme", () => {
    expect(inputs({})).toEqual([]);
  });

  it("accepts a theme without borderRadius", () => {
    expect(inputs({ borderRadius: undefined })).toEqual([]);
  });

  it.each([
    ["absent", undefined],
    ["empty", {}],
  ])("refuses a theme whose typography is %s", (_label, typography) => {
    expect(inputs({ typography })).toEqual([noTypography]);
  });

  it("names a colour the cover reads and the theme lacks", () => {
    const colors = Object.fromEntries(
      Object.entries(theme.colors).filter(([key]) => key !== "success"),
    );
    expect(inputs({ colors })).toEqual([
      'theme has no colour key "success": the cover reads background, primary, foreground, success, warning',
    ]);
  });

  it("names a controlHeight key a Button size reads and the theme lacks", () => {
    expect(inputs({ controlHeight: { sm: "1.75rem", md: "2.25rem" } })).toEqual(
      [
        'theme has no controlHeight key "lg": the Button preset\'s size lg reads it',
      ],
    );
    expect(inputs({ controlHeight: undefined })).toHaveLength(3);
  });

  it("names a Button preset without a height map instead of throwing", () => {
    const oldShape = Object.fromEntries(
      Object.entries(buttonPreset).filter(([key]) => key !== "height"),
    );
    expect(
      mod.dsInputFailures({
        theme,
        coverTemplate: template,
        buttonPreset: oldShape as unknown as typeof buttonPreset,
      }),
    ).toEqual([
      "button preset has no height map: it needs one controlHeight key per size (height: { sm, md, lg })",
    ]);
  });

  it("names a Subtle colour a Button intent needs and the theme lacks", () => {
    const colors = Object.fromEntries(
      Object.entries(theme.colors).filter(([key]) => key !== "dangerSubtle"),
    );
    expect(inputs({ colors })).toEqual([
      'theme has no colour key "dangerSubtle": the Button\'s soft variant reads <intent>Subtle and <intent>SubtleForeground; outline and ghost hover on <intent>Subtle',
    ]);
  });
});
