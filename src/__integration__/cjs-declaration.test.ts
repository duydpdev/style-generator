import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const moduleUrl = pathToFileURL(
  join(__dirname, "..", "..", "scripts", "cjs-declaration.mjs"),
).href;

/**
 * Run `toCjsDeclaration` in a Node child process (the script is plain ESM).
 * @param {string} source - A declaration file's text
 * @returns {{ ok?: string, error?: string }} The output, or the thrown message
 */
function convert(source: string): { ok?: string; error?: string } {
  const code = [
    `import { toCjsDeclaration } from ${JSON.stringify(moduleUrl)};`,
    `const source = ${JSON.stringify(source)};`,
    "let result;",
    'try { result = { ok: toCjsDeclaration(source, "x.d.ts") }; }',
    "catch (error) { result = { error: error.message }; }",
    "process.stdout.write(JSON.stringify(result));",
  ].join("\n");
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
  });
  return JSON.parse(run.stdout) as { ok?: string; error?: string };
}

describe("integration: toCjsDeclaration", () => {
  it.each([
    "zod",
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "react",
  ])("keeps a single-line named import of %s", (pkg) => {
    const source = `import { X } from '${pkg}';\nimport type { Y } from '${pkg}';\nexport declare const x: X;\n`;
    expect(convert(source)).toEqual({ ok: source });
  });

  it("rewrites the vite import to a type-only import with resolution-mode", () => {
    expect(convert("import { Plugin as Plugin_2 } from 'vite';\n")).toEqual({
      ok: "import type { Plugin as Plugin_2 } from 'vite' assert { 'resolution-mode': 'import' };\n",
    });
  });

  it("leaves relative imports alone", () => {
    const source =
      "import { a } from './a';\nexport type B = import('./b').B;\n";
    expect(convert(source)).toEqual({ ok: source });
  });

  it("ignores import examples in JSDoc comments", () => {
    const source =
      "/**\n * import { x } from \"lodash\";\n * const m = import('zod');\n */\nexport declare const x: number;\n";
    expect(convert(source)).toEqual({ ok: source });
  });

  it.each([
    ["an unlisted package", "import { x } from 'lodash';\n", "lodash"],
    ["a default import", "import React from 'react';\n", "react"],
    ["a namespace import", "import * as z from 'zod';\n", "zod"],
    ["a side-effect import", "import 'clsx';\n", "clsx"],
    ["a named re-export", "export { z } from 'zod';\n", "zod"],
    [
      "an import type node",
      "export declare const x: import('tailwind-merge').Foo;\n",
      "tailwind-merge",
    ],
    ["an import-equals require", "import x = require('clsx');\n", "clsx"],
    ["an ambient module", "declare module 'react' {}\n", "react"],
  ])("throws on %s", (_label, source, pkg) => {
    const result = convert(source);
    expect(result.ok).toBeUndefined();
    expect(result.error).toContain(`"${pkg}"`);
  });
});
