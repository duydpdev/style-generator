import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { selectedClasses } from "../cli/commands/canvas/compileCss";
import { dsBuildCommand } from "../cli/commands/ds/build";
import { renderTrees } from "../cli/commands/ds/render";

const fixture = join(__dirname, "__fixtures__", "ds-build");
const golden = join(fixture, "golden-9.2");

const read = (dir: string, file: string): string =>
  readFileSync(join(dir, file), "utf8");
const readJson = (dir: string, file: string): unknown =>
  JSON.parse(read(dir, file));
const byCodeUnit = (a: string, b: string): number =>
  Number(a > b) - Number(a < b);

// `usage` is the one field that changed on purpose: descriptions now come from the packaged standard.
const withoutUsage = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (key, v: unknown) => (key === "usage" ? "" : v)),
  );

describe("ds build against the previous build's goldens", () => {
  let out: string;
  let exit: number;

  beforeAll(async () => {
    out = mkdtempSync(join(tmpdir(), "sg-ds-parity-"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    exit = await dsBuildCommand(
      {
        theme: join(fixture, "theme.json"),
        config: join(fixture, "style-gen.config.json"),
        preset: join(fixture, "ds.preset.ts"),
        namespace: "Fixture",
        out,
      },
      fixture,
    );
  });
  afterAll(() => {
    vi.restoreAllMocks();
    rmSync(out, { recursive: true, force: true });
  });

  it("writes the bundle", () => {
    expect(exit).toBe(0);
  });

  it("writes the same tokens apart from the usage lines", () => {
    expect(withoutUsage(readJson(out, "tokens.json"))).toEqual(
      withoutUsage(readJson(golden, "tokens.json")),
    );
  });

  it.each([
    "README.md",
    "components/index.d.ts",
    "components/Cover/preview.html",
  ])("writes %s byte for byte", (file) => {
    expect(read(out, file)).toBe(read(golden, file));
  });

  it("renders the same element tree for every component, intent, variant and size", () => {
    const trees = renderTrees(read(out, "components/bundle.js"), "Fixture", [
      "primary",
      "danger",
    ]);
    expect(trees).toEqual(readJson(golden, "trees.json"));
  });

  it("detects one changed recipe class in the rendered trees", () => {
    const bundle = read(out, "components/bundle.js");
    expect(bundle).toContain('"base":"relative"');
    const changed = renderTrees(
      bundle.replace('"base":"relative"', '"base":"static"'),
      "Fixture",
      ["primary", "danger"],
    );
    expect(changed).not.toEqual(readJson(golden, "trees.json"));
  });

  it("selects every class the previous build did, plus the two it left without a rule", () => {
    // The Button's subtle variant renders `bg-<intent>-subtle`, built from the theme at run time: the 9.2 build
    // never saw those classes, so its stylesheet drew the variant without a background.
    expect(
      [...selectedClasses(read(out, "components/bundle.css"))].sort(byCodeUnit),
    ).toEqual(
      [
        ...(readJson(golden, "selectors.json") as string[]),
        "bg-danger-subtle",
        "bg-primary-subtle",
      ].sort(byCodeUnit),
    );
  });

  it("records what the bundle was built from", () => {
    const stamp = readJson(out, "ds-stamp.json") as Record<string, string>;
    expect(Object.keys(stamp).sort(byCodeUnit)).toEqual([
      "libVersion",
      "presetSha256",
      "tailwindVersion",
      "themeSha256",
    ]);
    expect(stamp.themeSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
