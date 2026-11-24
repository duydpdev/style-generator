import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeTmpFile } from "./__fixtures__/tmpProject";

const repoRoot = join(__dirname, "..", "..");
const gate = join(repoRoot, "scripts", "check-doc-reference.mjs");

/** Flags each fake command prints in `--help` and the page must document. */
const COMMAND_FLAGS: Record<string, string[]> = {
  init: ["--force", "-y"],
  generate: ["--theme", "-w", "--watch"],
  doctor: [],
  schema: ["--out", "--config-out"],
  tokens: ["--out"],
  budget: ["--max-gzip"],
  canvas: ["--canvas", "--theme"],
};

/** The shape of a per-category entry: `boolean | { prefixes?, keys? }`. */
const CATEGORY = {
  anyOf: [
    { type: "boolean" },
    { type: "object", properties: { prefixes: {}, keys: {} } },
  ],
};

/** Properties of the config schema the fake CLI writes. */
const SCHEMA_PROPERTIES: Record<string, unknown> = {
  $schema: { type: "string" },
  themePath: { type: "string" },
  screens: { type: "object", additionalProperties: { type: "string" } },
  spacing: {
    type: "object",
    properties: { enabled: {}, properties: {} },
  },
  coverage: {
    type: "object",
    properties: { colors: CATEGORY, shadows: CATEGORY },
  },
};

/** The options page the gate accepts for `SCHEMA_PROPERTIES`. */
const OPTIONS_PAGE = [
  "# Options",
  "",
  "| Option | Type |",
  "| :-- | :-- |",
  "| `$schema` | `string` |",
  "| `themePath` | `string` |",
  "| `screens` | `Record<string, string>` |",
  "| `spacing.enabled` | `boolean` |",
  "| `spacing.properties` | `SpacingPropertyMap` |",
  "| `coverage` | `Partial<Record<CategoryKey, CoverageRule>>` |",
  "",
  "### `coverage`: trim the lines per category",
  "",
  "Categories: `colors`, `shadows`.",
  "",
  "| Value | Effect |",
  "| :-- | :-- |",
  "| `{ prefixes: [...] }` | Keep only these prefixes. |",
  '| `{ keys: "aliased" }` | Keep only the aliased keys. |',
  "",
].join("\n");

/**
 * A stand-in for `dist/cli/index.mjs`: `<command> --help` prints the fixed
 * flags, `schema` writes both schema files relative to the working directory.
 * @param {Record<string, unknown>} properties - `properties` of the config schema it writes
 * @returns {string} Script source
 */
const fakeCli = (
  properties: Record<string, unknown>,
): string => `#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const flags = ${JSON.stringify(COMMAND_FLAGS)};
const [command, ...rest] = process.argv.slice(2);

if (command === "schema" && !rest.includes("--help")) {
  const out = rest[rest.indexOf("--out") + 1];
  const configOut = rest[rest.indexOf("--config-out") + 1];
  writeFileSync(out, "{}\\n");
  writeFileSync(
    configOut,
    JSON.stringify({ properties: ${JSON.stringify(properties)} }),
  );
} else {
  console.log(\`Usage: style-gen \${command} \${(flags[command] ?? []).join(" ")}\`);
}
`;

/**
 * A fixture root the gate accepts: fake CLI, both reference pages (one
 * section per command with each flag in an inline code span; every key
 * defined in a table row, nested keys and the `coverage` section included)
 * and one clean rendered page.
 * @param {string} root - Fixture root
 * @param {Record<string, unknown>} [properties] - Properties the fake `schema` command writes
 */
const writeFixture = (root: string, properties = SCHEMA_PROPERTIES) => {
  const cliSections = Object.entries(COMMAND_FLAGS).flatMap(
    ([command, flags]) => {
      const spans = flags.map((f) => `\`${f}\``).join(", ");
      return [
        `## \`style-gen ${command}\``,
        "",
        flags.length > 0 ? `Flags: ${spans}.` : "No flags.",
        "",
      ];
    },
  );
  writeTmpFile(root, "dist/cli/index.mjs", fakeCli(properties));
  writeTmpFile(
    root,
    "documents/reference/cli.md",
    ["# CLI", "", ...cliSections].join("\n"),
  );
  writeTmpFile(root, "documents/reference/options.md", OPTIONS_PAGE);
  writeTmpFile(root, "documents/guide.md", "# Guide\n\nPlain text.\n");
};

/**
 * Run the gate against the fixture.
 * @param {string} root - Fixture root
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
const runGate = (root: string) => {
  const result = spawnSync(process.execPath, [gate, "--root", root], {
    encoding: "utf8",
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
};

const HISTORY_LINE = "> Changed in 5.2.0: the flag moved.";

/**
 * Rewrite a fixture page in place.
 * @param {string} root - Fixture root
 * @param {string} rel - Repo-relative page
 * @param {(page: string) => string} change - Page transform
 */
const editPage = (root: string, rel: string, change: (p: string) => string) => {
  const file = join(root, rel);
  writeFileSync(file, change(readFileSync(file, "utf8")));
};

describe("integration: check-doc-reference rejects stale references", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "style-gen-doc-reference-"));
    writeFixture(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("passes on the complete fixture", () => {
    const { status, output } = runGate(dir);
    expect(output).toContain("OK:");
    expect(status).toBe(0);
  });

  it("fails when a flag of `generate --help` is missing from its section", () => {
    editPage(dir, "documents/reference/cli.md", (p) =>
      p.replace("`--theme`, `-w`, `--watch`", "`--theme`, `-w`"),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("style-gen generate does not document --watch");
  });

  it("fails when a short flag of `--help` is missing from its section (D-M2)", () => {
    editPage(dir, "documents/reference/cli.md", (p) =>
      p.replace("`--force`, `-y`", "`--force`"),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("style-gen init does not document -y");
  });

  it("accepts a short and a long flag together in one span", () => {
    editPage(dir, "documents/reference/cli.md", (p) =>
      p.replace("`-w`, `--watch`", "`-w, --watch`"),
    );
    expect(runGate(dir).status).toBe(0);
  });

  it("fails when the config schema holds a key options.md lacks", () => {
    writeFixture(dir, { ...SCHEMA_PROPERTIES, extraKey: {} });
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("config key extraKey is not documented");
  });

  it("fails when a key is named only in running text, not defined (D-M2)", () => {
    editPage(dir, "documents/reference/options.md", (p) =>
      p
        .replace("| `themePath` | `string` |\n", "")
        .concat("\nRemoved: `themePath` is no longer read.\n"),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("config key themePath is not documented");
  });

  it("fails when a nested key of a fixed-shape object is removed (D-M2)", () => {
    editPage(dir, "documents/reference/options.md", (p) =>
      p
        .replace("| `spacing.properties` | `SpacingPropertyMap` |\n", "")
        .concat("\nRunning text about `spacing.properties` stays.\n"),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("config key spacing.properties is not documented");
    expect(output).not.toContain("spacing.enabled");
  });

  it("accepts a nested key named by its leaf inside the parent's section", () => {
    editPage(dir, "documents/reference/options.md", (p) =>
      p
        .replace("| `spacing.properties` | `SpacingPropertyMap` |\n", "")
        .concat(
          "\n### `spacing`: the utilities\n\nSet `properties` to replace the map.\n",
        ),
    );
    expect(runGate(dir).status).toBe(0);
  });

  it("fails when a leaf of the per-category map is gone from its section (D-M2)", () => {
    editPage(dir, "documents/reference/options.md", (p) =>
      p.replace(
        '| `{ keys: "aliased" }` | Keep only the aliased keys. |\n',
        "",
      ),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain(
      "config key coverage.keys is not documented in the `coverage` section",
    );
    expect(output).not.toContain("coverage.prefixes");
  });

  it("fails when a category of the per-category map is gone from its section", () => {
    editPage(dir, "documents/reference/options.md", (p) =>
      p.replace("Categories: `colors`, `shadows`.", "Categories: `colors`."),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("config key coverage.shadows is not documented");
  });

  it("does not ask for every category x leaf pair (L9)", () => {
    // Its own fixture: three categories with different leaves, so the
    // category x leaf product (9 pairs, only 4 of them in the schema) is far
    // from the 6 names the page gives. Each category and each leaf is named
    // once, in the section; no `colors.prefixes`-style pair exists.
    const entry = (leaves: string[]) => ({
      anyOf: [
        { type: "boolean" },
        {
          type: "object",
          properties: Object.fromEntries(leaves.map((leaf) => [leaf, {}])),
        },
      ],
    });
    writeFixture(dir, {
      ...SCHEMA_PROPERTIES,
      coverage: {
        type: "object",
        properties: {
          colors: entry(["prefixes", "keys"]),
          shadows: entry(["prefixes"]),
          radius: entry(["opacities"]),
        },
      },
    });
    editPage(dir, "documents/reference/options.md", (p) =>
      p
        .replace(
          "Categories: `colors`, `shadows`.",
          "Categories: `colors`, `shadows`, `radius`.",
        )
        .replace(
          '| `{ keys: "aliased" }` | Keep only the aliased keys. |\n',
          '| `{ keys: "aliased" }` | Keep only the aliased keys. |\n| `{ opacities: [...] }` | Add opacity steps. |\n',
        ),
    );

    const { status, output } = runGate(dir);
    expect(output).toContain("OK:");
    expect(output).not.toMatch(/coverage\.\w+\.\w+/);
    expect(status).toBe(0);
  });

  it("fails when a per-category map has no section", () => {
    editPage(dir, "documents/reference/options.md", (p) =>
      p.replace("### `coverage`: trim the lines per category", "### Trimming"),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("no section for `coverage`");
  });

  it("fails on version history in a rendered page, naming file and line", () => {
    writeTmpFile(
      dir,
      "documents/guide.md",
      `# Guide\n\nPlain text.\n${HISTORY_LINE}\n`,
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("documents/guide.md:4:");
  });

  it("ignores version history in a migration guide", () => {
    writeTmpFile(
      dir,
      "documents/migration/x.md",
      `# Move\n\n${HISTORY_LINE}\n`,
    );
    expect(runGate(dir).status).toBe(0);
  });

  it("ignores version history inside a fenced code block", () => {
    writeTmpFile(
      dir,
      "documents/guide.md",
      `# Guide\n\n\`\`\`md\n${HISTORY_LINE}\n\`\`\`\n`,
    );
    expect(runGate(dir).status).toBe(0);
  });
});
