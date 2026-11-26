import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { logger } from "../../logger";
import { runCli } from "../../run";

import { loadStandard } from "./standardLayer";

const fixtures = join(
  __dirname,
  "..",
  "..",
  "..",
  "__integration__",
  "__fixtures__",
  "canvas-standard",
);

const sha = (file: string): string =>
  createHash("sha256").update(readFileSync(file)).digest("hex");

/** The colour roles of the body-log theme that the packaged grammar does not declare. */
const BODYLOG_ROLES = [
  "cellAuto",
  "cellInput",
  "cellSetup",
  "cellTarget",
  "cellTotal",
  "domainBody",
  "domainNutrition",
  "domainSettings",
  "domainTraining",
  "macroCarb",
  "macroFat",
  "macroProtein",
];

describe("style-gen canvas standard", () => {
  let dir: string;
  let logSpy: MockInstance<(msg: string) => void>;
  let errorSpy: MockInstance<(msg: string) => void>;
  const stdout = (): string => logSpy.mock.calls.map((c) => c[0]).join("\n");
  const stderr = (): string => errorSpy.mock.calls.map((c) => c[0]).join("\n");
  const standardFile = (): string => join(dir, "canvas-standard.json");
  const readAdditions = (): Record<string, unknown> =>
    JSON.parse(readFileSync(standardFile(), "utf8")) as Record<string, unknown>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-standard-cmd-"));
    copyFileSync(join(fixtures, "bodylog-theme.json"), join(dir, "theme.json"));
    logSpy = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  describe("init", () => {
    it("writes an empty additions file the check accepts", async () => {
      expect(await runCli(["canvas", "standard", "init"], dir)).toBe(0);
      expect(readAdditions()).toEqual({});
      expect(loadStandard(standardFile(), "s.json").notices).toEqual([]);
    });

    it("never overwrites: exit 1 and the file is unchanged", async () => {
      writeFileSync(standardFile(), '{"alphaScale":[8]}');
      expect(await runCli(["canvas", "standard", "init"], dir)).toBe(1);
      expect(stderr()).toBe(
        "canvas-standard.json already exists; nothing written",
      );
      expect(readFileSync(standardFile(), "utf8")).toBe('{"alphaScale":[8]}');
    });

    it("writes the file --standard names", async () => {
      expect(
        await runCli(
          ["canvas", "standard", "init", "--standard", "x.json"],
          dir,
        ),
      ).toBe(0);
      expect(readFileSync(join(dir, "x.json"), "utf8")).toBe("{}\n");
    });
  });

  describe("migrate", () => {
    beforeEach(() => {
      copyFileSync(join(fixtures, "bodylog-standard.json"), standardFile());
    });

    it("reads the recorded body-log copy", () => {
      expect(sha(standardFile()).startsWith("1a18153115b4")).toBe(true);
    });

    it("rewrites the full copy as additions", async () => {
      expect(
        await runCli(
          ["canvas", "standard", "migrate", "--theme", "theme.json"],
          dir,
        ),
      ).toBe(0);
      const additions = readAdditions();
      expect(Object.keys(additions).sort((a, b) => a.localeCompare(b))).toEqual(
        ["alphaScale", "boards", "roles", "scaleSteps"],
      );
      expect(
        Object.keys(additions.roles as object).sort((a, b) =>
          a.localeCompare(b),
        ),
      ).toEqual(BODYLOG_ROLES);
      expect(
        Object.values(
          additions.roles as Record<string, { description: string }>,
        ).every((r) => r.description === ""),
      ).toBe(true);
      expect(additions.alphaScale).toEqual([8, 12, 16, 45, 60]);
      expect(additions.boards).toEqual([
        {
          file: "src-index.dc.html",
          page: "src",
          title: "Board / Nguồn component / Danh mục nguồn",
        },
      ]);
      expect(additions.scaleSteps).toEqual({
        controlHeight: { pill: { reason: "" }, chip: { reason: "" } },
        borderWidth: { hairline: { reason: "" }, strong: { reason: "" } },
        fontFamily: { serif: { reason: "" } },
      });
      for (const key of [
        "semanticCore",
        "grammar",
        "scales",
        "rules",
        "radius",
      ])
        expect(additions).not.toHaveProperty(key);
    });

    it("leaves the next check to report the empty reasons", async () => {
      await runCli(
        ["canvas", "standard", "migrate", "--theme", "theme.json"],
        dir,
      );
      expect(() =>
        loadStandard(standardFile(), "canvas-standard.json"),
      ).toThrow(
        /^canvas-standard\.json: scaleSteps\.\w+\.\w+\.reason must not be empty$/,
      );
    });

    it("--dry-run prints the JSON and leaves the file byte for byte", async () => {
      const before = sha(standardFile());
      expect(
        await runCli(
          [
            "canvas",
            "standard",
            "migrate",
            "--theme",
            "theme.json",
            "--dry-run",
          ],
          dir,
        ),
      ).toBe(0);
      expect(sha(standardFile())).toBe(before);
      const printed = JSON.parse(stdout()) as Record<string, unknown>;
      expect(printed.alphaScale).toEqual([8, 12, 16, 45, 60]);
    });

    it("prints an additions file unchanged on --dry-run and writes nothing without it", async () => {
      writeFileSync(standardFile(), '{"alphaScale":[8]}\n');
      const args = ["canvas", "standard", "migrate", "--theme", "theme.json"];
      expect(await runCli([...args, "--dry-run"], dir)).toBe(0);
      expect(JSON.parse(stdout())).toEqual({ alphaScale: [8] });
      expect(await runCli(args, dir)).toBe(0);
      expect(readFileSync(standardFile(), "utf8")).toBe('{"alphaScale":[8]}\n');
    });

    it("requires --theme", async () => {
      expect(await runCli(["canvas", "standard", "migrate"], dir)).toBe(2);
      expect(stderr()).toBe("--theme is required");
    });

    it("names an unreadable standard", async () => {
      rmSync(standardFile());
      expect(
        await runCli(
          ["canvas", "standard", "migrate", "--theme", "theme.json"],
          dir,
        ),
      ).toBe(2);
      expect(stderr()).toBe("canvas-standard.json: cannot read (ENOENT)");
    });
  });
});
