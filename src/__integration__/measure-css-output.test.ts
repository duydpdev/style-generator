import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const script = join(__dirname, "..", "..", "scripts", "measure-css-output.mjs");

describe("integration: scripts/measure-css-output.mjs", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "measure-css-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("does not read class names out of the leading banner comment", () => {
    // The banner contains `.3`, `.0` and `.com`. It is followed directly by an
    // `@layer properties` block, exactly like Tailwind's minified output.
    const css =
      "/*! tailwindcss v4.3.0 | MIT License | https://tailwindcss.com */" +
      "@layer properties{@supports (x:y){*,:before{--tw-a:0}}}" +
      ".bg-primary{background-color:var(--color-primary)}";
    const file = join(dir, "banner.css");
    const classesOut = join(dir, "classes.txt");
    writeFileSync(file, css);

    const result = spawnSync(
      process.execPath,
      [script, file, "--classes-out", classesOut],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(readFileSync(classesOut, "utf8")).toBe("bg-primary\n");
  });
});
