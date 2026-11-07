import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeTmpFile } from "./__fixtures__/tmpProject";

const repoRoot = join(__dirname, "..", "..");

type Script = "docs-embed" | "check-doc-snippets" | "check-doc-exports";

/**
 * Write `content` to `<root>/<rel>`, creating parent directories.
 * @param {string} root - Fixture root
 * @param {string} rel - Root-relative file path
 * @param {string} content - File contents
 */
/**
 * Run a docs script in place (it needs the repo's `node_modules`) against a fixture tree.
 * @param {Script} script - Script name without extension
 * @param {string} dir - Fixture root, passed as `--root`
 * @param {string[]} args - Arguments before `--root`
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
function run(script: Script, dir: string, args: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, "scripts", `${script}.mjs`), ...args, "--root", dir],
    { encoding: "utf8" },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Create a fresh temp dir before each test and remove it afterwards.
 * @returns {{ dir: string }} State object whose `dir` is set while a test runs
 */
function useTempDir() {
  const state = { dir: "" };
  beforeEach(() => {
    state.dir = mkdtempSync(join(tmpdir(), "style-gen-docs-"));
  });
  afterEach(() => {
    rmSync(state.dir, { recursive: true, force: true });
  });
  return state;
}

describe("integration: docs-embed", { timeout: 60_000 }, () => {
  const t = useTempDir();
  const marked = (target: string) =>
    `# T\n\n<!-- embed: ${target} -->\n\n\`\`\`ts\nold\n\`\`\`\n`;

  it("flags a stale block, rewrites it, then passes", () => {
    writeTmpFile(
      t.dir,
      "examples/a.ts",
      "x\n  // #region docs:one\n  const a = 1;\n  // #endregion docs:one\n",
    );
    writeTmpFile(t.dir, "README.md", marked("examples/a.ts#one"));
    const stale = run("docs-embed", t.dir, ["--check"]);
    expect(stale.status).toBe(1);
    expect(stale.output).toContain("README.md: embedded code is out of date");
    expect(run("docs-embed", t.dir, ["--write"]).status).toBe(0);
    expect(readFileSync(join(t.dir, "README.md"), "utf8")).toContain(
      "```ts\nconst a = 1;\n```",
    );
    expect(run("docs-embed", t.dir, ["--check"]).status).toBe(0);
  });

  it("fails on a region that does not exist", () => {
    writeTmpFile(
      t.dir,
      "examples/a.ts",
      "// #region docs:one\nconst a = 1;\n// #endregion docs:one\n",
    );
    writeTmpFile(t.dir, "README.md", marked("examples/a.ts#two"));
    const result = run("docs-embed", t.dir, ["--check"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("region two not found in examples/a.ts");
  });

  it("fails on a missing file", () => {
    writeTmpFile(t.dir, "README.md", marked("examples/missing.ts"));
    const result = run("docs-embed", t.dir, ["--check"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("not found");
  });

  it.each([
    ["../x.ts", "embed path ../x.ts not allowed"],
    ["/etc/hosts", "embed path /etc/hosts not allowed"],
    ["README.md", "not allowed"],
    ["examples/a.txt", "not allowed"],
    ["packages/a.ts", "embed path packages/a.ts not allowed"],
  ])("rejects the embed path %s", (target, message) => {
    writeTmpFile(t.dir, "examples/a.txt", "text\n");
    writeTmpFile(t.dir, "README.md", marked(target));
    const result = run("docs-embed", t.dir, ["--check"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain(message);
  });

  it("exits 2 without a mode", () => {
    expect(run("docs-embed", t.dir).status).toBe(2);
  });
});

describe("integration: check-doc-snippets", { timeout: 60_000 }, () => {
  const t = useTempDir();
  const fenced = (...lines: string[]) =>
    `\`\`\`ts\n${lines.join("\n")}\n\`\`\`\n`;
  const valid = fenced(
    'import { generate } from "@duydpdev/style-generator";',
    "generate({ colors: {} });",
  );

  beforeEach(() => {
    writeTmpFile(
      t.dir,
      "dist/index.d.ts",
      "export declare function generate(theme: { colors: Record<string, string> }): { css: string };\n",
    );
  });

  it("exits 2 when dist is missing", () => {
    rmSync(join(t.dir, "dist"), { recursive: true, force: true });
    writeTmpFile(t.dir, "README.md", valid);
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(2);
    expect(result.output).toContain("run yarn build:all first");
  });

  it("accepts a valid block", () => {
    writeTmpFile(t.dir, "README.md", `# T\n\n${valid}`);
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 checked");
  });

  it("resolves `next` to a stub and still rejects other uninstalled modules", () => {
    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n${fenced('import type { NextConfig } from "next";', "export const c: NextConfig = {};")}`,
    );
    const stubbed = run("check-doc-snippets", t.dir);
    expect(stubbed.status).toBe(0);
    expect(stubbed.output).toContain("1 checked");

    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n${fenced('import type { Other } from "not-installed";', "export type O = Other;")}`,
    );
    const missing = run("check-doc-snippets", t.dir);
    expect(missing.status).toBe(1);
    expect(missing.output).toContain("TS2307");
  });

  it("reports a type error at its markdown line", () => {
    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n${fenced("const ok = 1;", 'const n: number = "x";')}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("README.md:5:");
  });

  it("requires a reason for no-check", () => {
    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n<!-- snippet: no-check -->\n\n${valid}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("no-check needs a reason");
  });

  it("fails when more than 10% of the blocks opt out", () => {
    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n${valid}\n<!-- snippet: no-check partial -->\n\n${fenced("declare const x: Missing;")}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("opted out (> 10%)");
  });

  it("does not check embedded blocks", () => {
    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n<!-- embed: examples/a.ts -->\n\n${fenced("const n: number = 'x';")}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 embedded");
  });

  it("skips signature blocks without counting them as snippets", () => {
    writeTmpFile(
      t.dir,
      "README.md",
      `# T\n\n<!-- signature: generate -->\n\n${fenced("export declare function generate(): Missing;")}\n${valid}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 checked");
    expect(result.output).toContain("1 signatures skipped");
  });

  it("checks the blocks of a Vietnamese twin", () => {
    writeTmpFile(t.dir, "README.md", `# T\n\n${valid}`);
    writeTmpFile(
      t.dir,
      "documents/vi/guide.md",
      `# T\n\n${fenced('const n: number = "x";')}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("documents/vi/guide.md:4:");
  });

  it("skips the Vietnamese twins of the migration guides", () => {
    writeTmpFile(t.dir, "README.md", `# T\n\n${valid}`);
    writeTmpFile(
      t.dir,
      "documents/vi/migration/4.x-to-5.0.md",
      `# T\n\n${fenced('const n: number = "x";')}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 checked");
  });
});

describe("integration: check-doc-exports", { timeout: 60_000 }, () => {
  const t = useTempDir();
  const vitePage = "# Vite\n\n## `styleGenVite`\n";

  beforeEach(() => {
    writeTmpFile(
      t.dir,
      "package.json",
      JSON.stringify({
        exports: {
          ".": { import: { types: "./dist/index.d.ts" } },
          "./vite": { import: { types: "./dist/vite.d.ts" } },
          "./package.json": "./package.json",
        },
      }),
    );
    writeTmpFile(
      t.dir,
      "dist/index.d.ts",
      '/** Generates CSS. */\nexport declare const generate: () => void;\nexport { styleGenVite } from "./vite";\n',
    );
    writeTmpFile(
      t.dir,
      "dist/vite.d.ts",
      "/** Vite plugin. */\nexport declare const styleGenVite: () => void;\n",
    );
    writeTmpFile(
      t.dir,
      "documents/reference/core.md",
      "# Core\n\n## `generate`\n",
    );
    writeTmpFile(t.dir, "documents/reference/vite.md", vitePage);
  });

  it("asks for signature blocks, writes them, then passes", () => {
    const stale = run("check-doc-exports", t.dir);
    expect(stale.status).toBe(1);
    expect(stale.output).toContain(
      "signature blocks are out of date; run yarn docs:signatures",
    );
    expect(run("check-doc-exports", t.dir, ["--write"]).status).toBe(0);
    const core = readFileSync(
      join(t.dir, "documents/reference/core.md"),
      "utf8",
    );
    expect(core).toContain("<!-- signature: generate -->");
    expect(core).toContain("export declare const generate: () => void;");
    expect(core).toContain("Generates CSS.");
    expect(core).toContain("<!-- /signature -->");
    const fresh = run("check-doc-exports", t.dir);
    expect(fresh.status).toBe(0);
    expect(fresh.output).toContain("2 signature blocks up to date");
  });

  it("detects a hand-edited signature", () => {
    run("check-doc-exports", t.dir, ["--write"]);
    const file = join(t.dir, "documents/reference/core.md");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace("() => void", "() => string"),
    );
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("signature blocks are out of date");
  });

  it("reports an unclosed signature block and never rewrites the page", () => {
    const page =
      "# Core\n\n<!-- signature: generate -->\n\nstale\n\n## `generate`\n\nprose\n\n## Notes\n\nprose\n";
    const file = join(t.dir, "documents/reference/core.md");
    writeTmpFile(t.dir, "documents/reference/core.md", page);
    for (const args of [[], ["--write"]]) {
      const result = run("check-doc-exports", t.dir, args);
      expect(result.status).toBe(1);
      expect(result.output).toContain(
        "documents/reference/core.md: unclosed signature block at line 3",
      );
      expect(result.output).not.toContain("have a reference heading");
      expect(readFileSync(file, "utf8")).toBe(page);
    }
  });

  it("fails on an export without TSDoc", () => {
    writeTmpFile(
      t.dir,
      "dist/vite.d.ts",
      "export declare const styleGenVite: () => void;\n",
    );
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("`styleGenVite` has no TSDoc");
  });

  it("fails on an export without a heading", () => {
    writeTmpFile(t.dir, "documents/reference/core.md", "# Core\n");
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("no heading for `generate`");
  });

  it("fails on a page that belongs to no subpath", () => {
    writeTmpFile(t.dir, "documents/reference/extra.md", "# Extra\n");
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("not a subpath page");
  });

  it("exits 2 on an unknown argument", () => {
    const result = run("check-doc-exports", t.dir, ["--bogus"]);
    expect(result.status).toBe(2);
    expect(result.output).toContain("usage: check-doc-exports.mjs");
  });

  const EN = "documents/reference/core.md";
  const VI = "documents/vi/reference/core.md";
  const BLOCK = /<!-- signature: generate -->[\s\S]*?<!-- \/signature -->/;
  const hashOf = (text: string) =>
    createHash("sha256")
      .update(text.replace(/\r\n/g, "\n"), "utf8")
      .digest("hex")
      .slice(0, 12);
  const read = (rel: string) => readFileSync(join(t.dir, rel), "utf8");
  const twin = (hash: string) =>
    `<!-- source: ${EN} sha256: ${hash} -->\n\n# Lõi\n\n## \`generate\`\n\nVăn bản tiếng Việt.\n`;

  it("writes the signature blocks of a Vietnamese twin and moves its source hash with the English page", () => {
    writeTmpFile(t.dir, VI, twin(hashOf(read(EN))));
    const stale = run("check-doc-exports", t.dir);
    expect(stale.status).toBe(1);
    expect(stale.output).toContain(
      `${VI}: signature blocks are out of date; run yarn docs:signatures`,
    );
    expect(run("check-doc-exports", t.dir, ["--write"]).status).toBe(0);
    const en = read(EN);
    const vi = read(VI);
    expect(BLOCK.exec(en)).not.toBeNull();
    expect(BLOCK.exec(vi)?.[0]).toBe(BLOCK.exec(en)?.[0]);
    expect(vi.split("\n")[0]).toBe(
      `<!-- source: ${EN} sha256: ${hashOf(en)} -->`,
    );
    const fresh = run("check-doc-exports", t.dir);
    expect(fresh.status).toBe(0);
    expect(fresh.output).toContain("1 in Vietnamese twins");
  });

  it("a TSDoc edit changes the blocks of the English page and of its Vietnamese twin", () => {
    writeTmpFile(t.dir, VI, twin(hashOf(read(EN))));
    run("check-doc-exports", t.dir, ["--write"]);
    const before = BLOCK.exec(read(VI))?.[0];
    writeTmpFile(
      t.dir,
      "dist/index.d.ts",
      '/** Generates CSS files. */\nexport declare const generate: () => void;\nexport { styleGenVite } from "./vite";\n',
    );
    const stale = run("check-doc-exports", t.dir);
    expect(stale.status).toBe(1);
    expect(stale.output).toContain(`${EN}: signature blocks are out of date`);
    expect(stale.output).toContain(`${VI}: signature blocks are out of date`);
    expect(run("check-doc-exports", t.dir, ["--write"]).status).toBe(0);
    const en = read(EN);
    const vi = read(VI);
    expect(BLOCK.exec(en)?.[0]).toContain("Generates CSS files.");
    expect(BLOCK.exec(vi)?.[0]).toBe(BLOCK.exec(en)?.[0]);
    expect(BLOCK.exec(vi)?.[0]).not.toBe(before);
    expect(vi.split("\n")[0]).toBe(
      `<!-- source: ${EN} sha256: ${hashOf(en)} -->`,
    );
    expect(run("check-doc-exports", t.dir).status).toBe(0);
  });

  it("keeps the source hash of a Vietnamese twin that was already stale", () => {
    writeTmpFile(t.dir, VI, twin("000000000000"));
    expect(run("check-doc-exports", t.dir, ["--write"]).status).toBe(0);
    const vi = read(VI);
    expect(vi.split("\n")[0]).toBe(
      `<!-- source: ${EN} sha256: 000000000000 -->`,
    );
    expect(BLOCK.exec(vi)).not.toBeNull();
  });

  it("reports an unclosed signature block in a Vietnamese twin and never rewrites it", () => {
    const page = "# T\n\n<!-- signature: generate -->\n\nstale\n";
    writeTmpFile(t.dir, VI, page);
    for (const args of [[], ["--write"]]) {
      const result = run("check-doc-exports", t.dir, args);
      expect(result.status).toBe(1);
      expect(result.output).toContain(
        `${VI}: unclosed signature block at line 3`,
      );
      expect(read(VI)).toBe(page);
    }
  });
});
