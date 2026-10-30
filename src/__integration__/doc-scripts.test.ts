import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");

type Script = "docs-embed" | "check-doc-snippets" | "check-doc-exports";

/**
 * Write `content` to `<root>/<rel>`, creating parent directories.
 * @param {string} root - Fixture root
 * @param {string} rel - Root-relative file path
 * @param {string} content - File contents
 */
function put(root: string, rel: string, content: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), content);
}

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
    put(
      t.dir,
      "examples/a.ts",
      "x\n  // #region docs:one\n  const a = 1;\n  // #endregion docs:one\n",
    );
    put(t.dir, "README.md", marked("examples/a.ts#one"));
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
    put(
      t.dir,
      "examples/a.ts",
      "// #region docs:one\nconst a = 1;\n// #endregion docs:one\n",
    );
    put(t.dir, "README.md", marked("examples/a.ts#two"));
    const result = run("docs-embed", t.dir, ["--check"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("region two not found in examples/a.ts");
  });

  it("fails on a missing file", () => {
    put(t.dir, "README.md", marked("examples/missing.ts"));
    const result = run("docs-embed", t.dir, ["--check"]);
    expect(result.status).toBe(1);
    expect(result.output).toContain("not found");
  });

  it.each([
    ["../x.ts", "embed path ../x.ts not allowed"],
    ["/etc/hosts", "embed path /etc/hosts not allowed"],
    ["README.md", "not allowed"],
    ["examples/a.txt", "not allowed"],
  ])("rejects the embed path %s", (target, message) => {
    put(t.dir, "examples/a.txt", "text\n");
    put(t.dir, "README.md", marked(target));
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
    put(
      t.dir,
      "dist/index.d.ts",
      "export declare function generate(theme: { colors: Record<string, string> }): { css: string };\n",
    );
  });

  it("exits 2 when dist is missing", () => {
    rmSync(join(t.dir, "dist"), { recursive: true, force: true });
    put(t.dir, "README.md", valid);
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(2);
    expect(result.output).toContain("run yarn build:all first");
  });

  it("accepts a valid block", () => {
    put(t.dir, "README.md", `# T\n\n${valid}`);
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 checked");
  });

  it("reports a type error at its markdown line", () => {
    put(
      t.dir,
      "README.md",
      `# T\n\n${fenced("const ok = 1;", 'const n: number = "x";')}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("README.md:5:");
  });

  it("requires a reason for no-check", () => {
    put(t.dir, "README.md", `# T\n\n<!-- snippet: no-check -->\n\n${valid}`);
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("no-check needs a reason");
  });

  it("fails when more than 10% of the blocks opt out", () => {
    put(
      t.dir,
      "README.md",
      `# T\n\n${valid}\n<!-- snippet: no-check partial -->\n\n${fenced("declare const x: Missing;")}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("opted out (> 10%)");
  });

  it("does not check embedded blocks", () => {
    put(
      t.dir,
      "README.md",
      `# T\n\n<!-- embed: examples/a.ts -->\n\n${fenced("const n: number = 'x';")}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 embedded");
  });

  it("skips signature blocks without counting them as snippets", () => {
    put(
      t.dir,
      "README.md",
      `# T\n\n<!-- signature: generate -->\n\n${fenced("export declare function generate(): Missing;")}\n${valid}`,
    );
    const result = run("check-doc-snippets", t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("1 checked");
    expect(result.output).toContain("1 signatures skipped");
  });
});

describe("integration: check-doc-exports", { timeout: 60_000 }, () => {
  const t = useTempDir();
  const vitePage = "# Vite\n\n## `styleGenVite`\n";

  beforeEach(() => {
    put(
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
    put(
      t.dir,
      "dist/index.d.ts",
      '/** Generates CSS. */\nexport declare const generate: () => void;\nexport { styleGenVite } from "./vite";\n',
    );
    put(
      t.dir,
      "dist/vite.d.ts",
      "/** Vite plugin. */\nexport declare const styleGenVite: () => void;\n",
    );
    put(t.dir, "documents/reference/core.md", "# Core\n\n## `generate`\n");
    put(t.dir, "documents/reference/vite.md", vitePage);
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

  it("fails on an export without TSDoc", () => {
    put(
      t.dir,
      "dist/vite.d.ts",
      "export declare const styleGenVite: () => void;\n",
    );
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("`styleGenVite` has no TSDoc");
  });

  it("fails on an export without a heading", () => {
    put(t.dir, "documents/reference/core.md", "# Core\n");
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("no heading for `generate`");
  });

  it("fails on a page that belongs to no subpath", () => {
    put(t.dir, "documents/reference/extra.md", "# Extra\n");
    const result = run("check-doc-exports", t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("not a subpath page");
  });

  it("exits 2 on an unknown argument", () => {
    const result = run("check-doc-exports", t.dir, ["--bogus"]);
    expect(result.status).toBe(2);
    expect(result.output).toContain("usage: check-doc-exports.mjs");
  });
});
