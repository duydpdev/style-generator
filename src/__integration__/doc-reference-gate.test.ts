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
  init: ["--force"],
  generate: ["--theme", "--watch"],
  doctor: [],
  schema: ["--out", "--config-out"],
  tokens: ["--out"],
  budget: ["--max-gzip"],
};

const CONFIG_KEYS = ["$schema", "themePath", "outDir"];

/**
 * A stand-in for `dist/cli/index.mjs`: `<command> --help` prints the fixed
 * flags, `schema` writes both schema files relative to the working directory.
 * @param {string[]} schemaKeys - Keys of the config schema it writes
 * @returns {string} Script source
 */
const fakeCli = (schemaKeys: string[]): string => `#!/usr/bin/env node
import { writeFileSync } from "node:fs";

const flags = ${JSON.stringify(COMMAND_FLAGS)};
const [command, ...rest] = process.argv.slice(2);

if (command === "schema" && !rest.includes("--help")) {
  const out = rest[rest.indexOf("--out") + 1];
  const configOut = rest[rest.indexOf("--config-out") + 1];
  writeFileSync(out, "{}\\n");
  writeFileSync(
    configOut,
    JSON.stringify({
      properties: Object.fromEntries(${JSON.stringify(schemaKeys)}.map((k) => [k, {}])),
    }),
  );
} else {
  console.log(\`Usage: style-gen \${command} \${(flags[command] ?? []).join(" ")}\`);
}
`;

/**
 * A fixture root the gate accepts: fake CLI, both reference pages (one
 * section per command with each flag in an inline code span; every key in an
 * inline code span) and one clean rendered page.
 * @param {string} root - Fixture root
 * @param {string[]} [schemaKeys] - Keys the fake `schema` command writes
 */
const writeFixture = (root: string, schemaKeys = CONFIG_KEYS) => {
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
  writeTmpFile(root, "dist/cli/index.mjs", fakeCli(schemaKeys));
  writeTmpFile(
    root,
    "documents/reference/cli.md",
    ["# CLI", "", ...cliSections].join("\n"),
  );
  writeTmpFile(
    root,
    "documents/reference/options.md",
    ["# Options", "", ...CONFIG_KEYS.map((k) => `- \`${k}\``), ""].join("\n"),
  );
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
    const page = join(dir, "documents/reference/cli.md");
    writeFileSync(
      page,
      readFileSync(page, "utf8").replace("`--theme`, `--watch`", "`--theme`"),
    );
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("style-gen generate does not document --watch");
  });

  it("fails when the config schema holds a key options.md lacks", () => {
    writeFixture(dir, [...CONFIG_KEYS, "extraKey"]);
    const { status, output } = runGate(dir);
    expect(status).toBe(1);
    expect(output).toContain("config key extraKey is not documented");
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
