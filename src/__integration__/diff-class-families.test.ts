import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = join(
  __dirname,
  "..",
  "..",
  "scripts",
  "diff-class-families.mjs",
);

const baselineClasses = [
  "bg-primary",
  "hover:bg-primary",
  "rounded-lg",
  "rounded-t-lg",
  "md:rounded-t-lg",
  "sp-top",
  "text-heading-lg",
  "top-[14px]",
  "-mt-2",
  "flex",
].join("\n");

const fullCss = `
/*! banner v4.3.0 | https://example.com */
.bg-primary{background-color:var(--color-primary)}
@media (hover:hover){.hover\\:bg-primary:hover{background-color:var(--color-primary)}}
.rounded-lg{border-radius:.5rem}
.rounded-t-lg{border-top-left-radius:.5rem}
@media (width>=768px){.md\\:rounded-t-lg{border-top-left-radius:.5rem}}
.sp-top{top:var(--sg-sp-top)}
.text-heading-lg{font-size:1.25rem}
.top-\\[14px\\]{top:14px}
.-mt-2{margin-top:-.5rem}
.flex{display:flex}
`;

/**
 * Runs `diff-class-families.mjs` against the fixture baseline and proxy files.
 * @param {string[]} extra - Extra CLI arguments (e.g. `--allow <file>`)
 * @returns {{ status: number | null, output: string }} Exit code and combined stdout/stderr
 */
function run(...extra: string[]) {
  const result = spawnSync(
    process.execPath,
    [script, join(dir, "classes.txt"), join(dir, "proxy.css"), ...extra],
    { encoding: "utf8" },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "class-family-"));
  writeFileSync(join(dir, "classes.txt"), `${baselineClasses}\n`);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * Writes the proxy CSS fixture.
 * @param {string} css - CSS text the script will diff against the baseline
 */
function withCss(css: string) {
  writeFileSync(join(dir, "proxy.css"), css);
}

describe("integration: scripts/diff-class-families.mjs", () => {
  it("exits 0 when every baseline family is still present (escaped variant selectors, arbitrary values, comments and decimals in values are not misread)", () => {
    withCss(fullCss);

    const result = run();

    expect(result.status).toBe(0);
    expect(result.output).toContain("baseline classes absent from proxy: 0");
  });

  it("negative control: removing every rounded-* rule exits 1 and lists the rounded families", () => {
    withCss(fullCss.replace(/^.*rounded-.*$/gm, ""));

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toMatch(/rounded-\s+1\s+0/);
    expect(result.output).toMatch(/rounded-t-\s+2\s+0/);
  });

  it("exits 1 when a family survives but loses a variant the baseline used", () => {
    withCss(fullCss.replace(/^@media \(hover:hover\).*$/gm, ""));

    const result = run();

    expect(result.status).toBe(1);
    expect(result.output).toContain("hover: bg-");
  });

  it("an allowlist entry (family | reason | replacement) turns a missing family into exit 0", () => {
    withCss(fullCss.replace(/^\.sp-top.*$/gm, ""));
    const allow = join(dir, "allow.txt");
    writeFileSync(
      allow,
      "# comment\nsp- | dropped on purpose | use spacing utilities\n",
    );

    expect(run().status).toBe(1);
    const allowed = run("--allow", allow);
    expect(allowed.status).toBe(0);
    expect(allowed.output).toContain("dropped on purpose");
  });

  it("exits 2 on an allowlist line without a reason or replacement", () => {
    withCss(fullCss);
    const allow = join(dir, "allow.txt");
    writeFileSync(allow, "sp- | only a reason\n");

    const result = run("--allow", allow);

    expect(result.status).toBe(2);
    expect(result.output).toContain("allow.txt:1");
  });
});
