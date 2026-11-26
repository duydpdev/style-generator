import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkCanvas } from "../cli/commands/canvas";
import { contrastRatio, resolveColor } from "../cli/commands/canvas/contrast";
import { mergeDescriptions } from "../cli/commands/canvas/descriptions";
import { packagedStandard } from "../cli/commands/canvas/standardSchema";
import { logger } from "../cli/logger";
import { runCli } from "../cli/run";
import { dsNameCollisions, dsTokenNames } from "../shared/dsTokenNames";

import { writeTmpFile } from "./__fixtures__/tmpProject";

type Theme = Record<string, Record<string, unknown>>;

const fixtures = join(__dirname, "__fixtures__", "canvas-standard");
const BODYLOG: Theme = JSON.parse(
  readFileSync(join(fixtures, "bodylog-theme.json"), "utf8"),
) as Theme;

/**
 * A deep copy of the body-log theme with one change.
 * @param {(t: Theme) => void} edit - The change
 * @returns {Theme} The edited copy
 */
const bodylog = (edit: (t: Theme) => void = () => undefined): Theme => {
  const copy = structuredClone(BODYLOG);
  edit(copy);
  return copy;
};

/**
 * The body-log theme with every defect the standard names fixed.
 * @param {(t: Theme) => void} edit - A further change
 * @returns {Theme} The edited copy
 */
const FIXED = (edit: (t: Theme) => void = () => undefined): Theme =>
  bodylog((t) => {
    t.controlHeight = {
      xs: "1.5rem",
      sm: "1.75rem",
      md: "2.25rem",
      lg: "2.75rem",
    };
    t.borderWidth = { thin: "1px", thick: "2px" };
    t.fontFamily = {
      sans: String(t.fontFamily?.sans),
      mono: String(t.fontFamily?.mono),
      display: String(t.fontFamily?.serif),
    };
    const colors = t.colors as Record<string, string>;
    colors.foregroundSecondary = colors.foregroundSubtle ?? "";
    delete colors.foregroundSubtle;
    colors.mutedForeground = "$navy500";
    colors.domainNutritionSubtleForeground = "$green900";
    colors.domainTrainingSubtleForeground = "$navy900";
    const axes = t.themeAxes as Record<
      string,
      Record<string, Record<string, Record<string, string>>>
    >;
    for (const variant of Object.values(axes.theme ?? {})) {
      const dark = variant.colors ?? {};
      if (dark.foregroundSubtle !== undefined) {
        dark.foregroundSecondary = dark.foregroundSubtle;
        delete dark.foregroundSubtle;
      }
    }
    edit(t);
  });

describe("integration: canvas check theme rules", () => {
  let dir: string;
  let canvas: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-canvas-theme-rules-"));
    canvas = join(dir, "canvas");
    writeTmpFile(canvas, "a.dc.html", "<p>x</p>");
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const theme = (value: object, name = "theme.json"): string =>
    writeTmpFile(dir, name, value);

  const check = (
    value: object,
    extra: { standard?: object; usage?: object; noRule?: string[] } = {},
  ) =>
    checkCanvas({
      canvasDir: canvas,
      theme: theme(value),
      naming: true,
      ...(extra.standard === undefined
        ? {}
        : { standard: theme(extra.standard, "standard.json") }),
      ...(extra.usage === undefined
        ? {}
        : { usage: theme(extra.usage, "ds.usage.json") }),
      ...(extra.noRule === undefined ? {} : { noRule: extra.noRule }),
    });

  const cli = async (...args: string[]) => {
    const log = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    try {
      const status = await runCli(
        ["canvas", "check", "--canvas", canvas, "--naming", ...args],
        dir,
      );
      const lines = log.mock.calls.map((c) => c[0]);
      const errors = error.mock.calls.map((c) => c[0]);
      return { status, lines, errors, last: lines.at(-1) ?? "" };
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  };

  const withoutPath = (lines: string[]): string[] =>
    lines.map((line) => line.slice(line.indexOf(":1 ") + 3));

  describe("body-log theme", () => {
    it("fails the closed scale, contrast and collision rules with their basis", () => {
      const { errors } = check(BODYLOG);
      const text = withoutPath(errors);
      expect(text).toContain(
        "controlHeight mixes units: rem (sm, md, lg), px (pill, chip) [scale-unit; technical: mixed units cannot be compared or ordered]",
      );
      expect(text).toContain(
        "controlHeight.chip (28px) has the same value as sm (1.75rem) [scale-duplicate; technical: two steps with one value make a step meaningless]",
      );
      expect(
        text.some(
          (l) =>
            l.startsWith(
              "mutedForeground on background is 4.45:1, below 4.5:1 (",
            ) ||
            l.startsWith(
              "mutedForeground on background is 4.45:1, below 4.5:1 [contrast-text;",
            ),
        ),
      ).toBe(true);
      expect(
        text.some((l) =>
          l.startsWith("mutedForeground on muted is 4.14:1, below 4.5:1"),
        ),
      ).toBe(true);
      expect(
        text.some((l) =>
          l.startsWith(
            "design-system token name border-strong is used by colors.borderStrong and borderWidth.strong [ds-name-collision;",
          ),
        ),
      ).toBe(true);
    });

    it("renames foregroundSubtle to foregroundSecondary", () => {
      const text = withoutPath(check(BODYLOG).errors);
      expect(
        text.filter((l) => l.startsWith("colors.foregroundSubtle ")),
      ).toEqual([
        expect.stringContaining(
          "(rename to foregroundSecondary) [name-vocabulary;",
        ),
      ]);
    });

    it("reports an off-scale step and an undeclared role as findings, not errors", () => {
      const { errors, findings } = check(BODYLOG);
      expect(errors.some((l) => l.includes("controlHeight.pill"))).toBe(false);
      expect(
        findings.some(
          (l) =>
            l.includes(
              "controlHeight.pill is not a step of the closed scale",
            ) && l.endsWith("[scale-name]"),
        ),
      ).toBe(true);
      expect(
        findings.some(
          (l) =>
            l.includes("role domainBody is not declared") &&
            l.endsWith("[name-vocabulary]"),
        ),
      ).toBe(true);
    });

    it("never value-checks a compound shadow or a cubic-bezier", () => {
      const { errors, findings } = check(BODYLOG);
      for (const line of [...errors, ...findings]) {
        expect(line).not.toContain("shadows.");
        expect(line).not.toContain("motionEasing.");
      }
    });

    it("keeps failing scale-unit for a full-copy standard", () => {
      const full = JSON.parse(
        readFileSync(join(fixtures, "bodylog-standard.json"), "utf8"),
      ) as object;
      const { errors } = check(BODYLOG, { standard: full });
      expect(errors.some((l) => l.includes("[scale-unit;"))).toBe(true);
    });
  });

  describe("fixed body-log theme", () => {
    it("passes the scale, contrast, collision and vocabulary rules", () => {
      const { errors, findings } = check(FIXED());
      expect(withoutPath(errors)).toEqual([]);
      expect(findings.some((l) => l.includes("is not measurable"))).toBe(false);
    });

    it("measures the fixed muted text colour", () => {
      const { errors } = check(
        FIXED((t) => {
          (t.colors as Record<string, string>).mutedForeground = "$navy400";
        }),
      );
      const text = withoutPath(errors).filter((l) =>
        l.startsWith("mutedForeground on"),
      );
      expect(text).toHaveLength(2);
    });
  });

  describe("declared roles", () => {
    it("silences the finding of a role the additions file declares", () => {
      const roles = Object.fromEntries(
        ["cellAuto", "domainBody"].map((r) => [
          r,
          { description: `${r} fill` },
        ]),
      );
      const { findings } = check(FIXED(), { standard: { roles } });
      expect(
        findings.some((l) => l.includes("role cellAuto is not declared")),
      ).toBe(false);
      expect(
        findings.some((l) => l.includes("role domainBody is not declared")),
      ).toBe(false);
      expect(
        findings.some((l) => l.includes("role cellInput is not declared")),
      ).toBe(true);
    });
  });

  describe("two axes", () => {
    const base = {
      colors: {
        white: "#ffffff",
        gray400: "#999999",
        gray700: "#555555",
        gray900: "#111111",
        black: "#000000",
        background: "$white",
        surface: "$white",
        muted: "$white",
        foreground: "$gray900",
        mutedForeground: "$gray900",
        border: "$gray400",
        focus: "$black",
        scrim: "$black",
      },
    };
    const axes = (names: ("a" | "b")[]) => ({
      ...base,
      themeAxes: Object.fromEntries(
        names.map((axis) => [
          axis,
          {
            x:
              axis === "a"
                ? {
                    colors: {
                      background: "$gray400",
                      surface: "$gray400",
                      muted: "$gray400",
                    },
                  }
                : {
                    colors: {
                      foreground: "$gray700",
                      mutedForeground: "$gray700",
                    },
                  },
          },
        ]),
      ),
    });
    const contrast = (value: object) =>
      withoutPath(check(value).errors).filter((l) => l.includes("[contrast-"));

    it("passes with either axis alone", () => {
      expect(contrast(axes(["a"]))).toEqual([]);
      expect(contrast(axes(["b"]))).toEqual([]);
    });

    it("fails only where both axes apply at once", () => {
      const lines = contrast(axes(["a", "b"]));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) expect(line).toContain("(in a=x+b=x)");
    });
  });

  describe("descriptions", () => {
    it("reports a usage entry naming no theme colour", () => {
      const { errors } = check(FIXED(), {
        usage: { usage: { ghost: "Nothing." } },
      });
      expect(withoutPath(errors)).toContainEqual(
        expect.stringMatching(
          /^usage entry ghost names no theme colour \[description-unknown-key/,
        ),
      );
    });

    it("reports a blank description for a neutral key", () => {
      const { errors } = check(FIXED(), { usage: { usage: { focus: "  " } } });
      expect(withoutPath(errors)).toContainEqual(
        expect.stringMatching(
          /^colors\.focus has an empty description \[description-empty/,
        ),
      );
    });

    it("lets the usage file beat a declared role, which beats the packaged text", () => {
      const standard = packagedStandard();
      const merged = mergeDescriptions({
        standard,
        additions: {
          roles: {
            primary: { description: "role text" },
            accent: { description: "role accent" },
          },
        },
        usage: { primary: "usage text" },
      });
      expect(merged.primary).toBe("usage text");
      expect(merged.accent).toBe("role accent");
      expect(merged.background).toBe(standard.descriptions?.background);
    });
  });

  describe("ds token names", () => {
    it("treats thin and thick as collision free", () => {
      const names = dsTokenNames({ theme: FIXED() });
      expect(dsNameCollisions(names)).toEqual([]);
    });

    it("finds borderStrong against borderWidth.strong", () => {
      const names = dsTokenNames({
        theme: {
          colors: { borderStrong: "#000" },
          borderWidth: { strong: "2px" },
        },
      });
      expect(dsNameCollisions(names)).toEqual([
        {
          name: "border-strong",
          tokens: [
            { name: "border-strong", family: "colors", key: "borderStrong" },
            { name: "border-strong", family: "borderWidth", key: "strong" },
          ],
        },
      ]);
    });

    it("imports nothing from node or zod", () => {
      const source = readFileSync(
        join(__dirname, "..", "shared", "dsTokenNames.ts"),
        "utf8",
      );
      expect(source).not.toMatch(/from ["'](?:node:|zod)/);
    });

    it("names the same tokens as the design-system build script", () => {
      const theme = {
        colors: { primary: "#000000", blue500: "#0000ff" },
        borderRadius: { md: "8px", fullPill: "9px" },
        shadows: { baseSoft: "0 0 1px #000000" },
        borderWidth: { thin: "1px" },
        backdropBlurs: { glassy: "4px" },
      };
      const code = `import { themeToDsTokens } from ${JSON.stringify(
        pathToFileURL(join(__dirname, "..", "..", "scripts", "ds-tokens.mjs"))
          .href,
      )};
let input = "";
for await (const chunk of process.stdin) input += chunk;
process.stdout.write(JSON.stringify(themeToDsTokens(JSON.parse(input), { name: "x" })));`;
      const run = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", code],
        {
          input: JSON.stringify(theme),
          encoding: "utf8",
        },
      );
      expect(run.status, run.stderr).toBe(0);
      const built = JSON.parse(run.stdout) as Record<
        string,
        { tokens?: { name: string }[] }
      >;
      const fromScript = [
        "color",
        "radius",
        "shadow",
        "borderWidth",
        "backdropBlur",
      ]
        .flatMap((family) => built[family]?.tokens ?? [])
        .map((token) => token.name)
        .sort((a, b) => a.localeCompare(b));
      const fromShared = dsTokenNames({ theme })
        .map((token) => token.name)
        .sort((a, b) => a.localeCompare(b));
      expect(fromShared).toEqual(fromScript);
    });
  });

  describe("exemptions and exceptions", () => {
    const ONLY = (lines: string[], id: string) =>
      lines.filter((l) => l.includes(`[${id}`));

    it("silences exactly the exempted name and nothing else of that rule", () => {
      const standard = {
        exemptions: [
          {
            rule: "scale-duplicate",
            name: "controlHeight.chip",
            reason: "kept",
          },
        ],
      };
      const { errors, findings } = check(BODYLOG, { standard });
      expect(ONLY(errors, "scale-duplicate")).toEqual([]);
      expect(errors.some((l) => l.includes("[scale-unit;"))).toBe(true);
      expect(findings.some((l) => l.includes("exemption-unused"))).toBe(false);
    });

    it("reports an exemption that matches nothing, once, as a finding", () => {
      const standard = {
        exemptions: [
          { rule: "scale-duplicate", name: "controlHeight.ghost", reason: "x" },
        ],
      };
      const { findings } = check(FIXED(), { standard });
      expect(
        findings.filter((l) =>
          l.includes(
            "exemption scale-duplicate controlHeight.ghost matches nothing",
          ),
        ),
      ).toHaveLength(1);
      expect(findings.some((l) => l.endsWith("[exemption-unused]"))).toBe(true);
    });

    it("does not call an exemption stale when its rule was switched off", () => {
      const standard = {
        exemptions: [{ rule: "contrast-text", name: "a/b", reason: "x" }],
        disabledRules: { "contrast-text": { reason: "backlog" } },
      };
      const { findings } = check(FIXED(), {
        standard,
        noRule: ["contrast-text"],
      });
      expect(findings.some((l) => l.includes("exemption-unused"))).toBe(false);
    });

    it("lets a contrast exception silence its pair, and reports one that matches nothing", () => {
      const standard = {
        exceptions: {
          contrast: [
            { pair: "mutedForeground/background", reason: "decorative" },
            { pair: "mutedForeground/muted", reason: "decorative" },
            { pair: "foreground/ghost", reason: "x" },
          ],
        },
      };
      const { errors, findings } = check(BODYLOG, { standard });
      expect(errors.some((l) => l.includes("mutedForeground on"))).toBe(false);
      expect(
        findings.filter((l) =>
          l.includes(
            "contrast exception foreground/ghost matches no failing pair",
          ),
        ),
      ).toHaveLength(1);
    });

    it("reports a pair it cannot measure as a finding instead of passing it", () => {
      const { errors, findings } = check(
        FIXED((t) => {
          (t.colors as Record<string, string>).mutedForeground =
            "oklch(40% 0.1 250)";
        }),
      );
      expect(errors.some((l) => l.includes("mutedForeground on"))).toBe(false);
      expect(
        findings.some(
          (l) =>
            l.includes("mutedForeground on") &&
            l.includes("is not measurable") &&
            l.endsWith("[contrast-text]"),
        ),
      ).toBe(true);
    });
  });

  describe("body-log contrast numbers", () => {
    const ratios = (colors: Record<string, string>, fg = "mutedForeground") =>
      ["background", "surface", "muted"].map((ground) => {
        const top = resolveColor(fg, colors);
        const bg = resolveColor(ground, colors);
        if (top === null || bg === null)
          throw new Error("unmeasurable " + ground);
        return Number(contrastRatio(top, bg).toFixed(2));
      });
    const light = BODYLOG.colors as Record<string, string>;
    const dark = {
      ...light,
      ...((
        BODYLOG.themeAxes as Record<
          string,
          Record<string, { colors: Record<string, string> }>
        >
      ).theme?.dark?.colors ?? {}),
    };

    it("pins muted text on background, surface and muted in the light variant", () => {
      expect(ratios({ ...light, mutedForeground: "$navy400" })).toEqual([
        4.45, 4.76, 4.14,
      ]);
      expect(ratios({ ...light, mutedForeground: "$navy500" })).toEqual([
        7.09, 7.58, 6.6,
      ]);
    });

    it("pins muted text in the dark variant", () => {
      expect(ratios({ ...dark, mutedForeground: "$navy300" })).toEqual([
        6.01, 5.62, 4.91,
      ]);
    });
  });

  describe("--no-rule and the output contract", () => {
    const disabling = (ids: string[]) => ({
      disabledRules: Object.fromEntries(
        ids.map((id) => [id, { reason: "tracked in the backlog" }]),
      ),
    });

    it("switches a rule off when the additions file records a reason", () => {
      const result = check(BODYLOG, {
        standard: disabling(["contrast-text"]),
        noRule: ["contrast-text"],
      });
      expect(result.disabled).toEqual(["contrast-text"]);
      expect(result.errors.some((l) => l.includes("[contrast-text;"))).toBe(
        false,
      );
      expect(result.errors.some((l) => l.includes("[scale-unit;"))).toBe(true);
    });

    it("prints the disabled rules before the last line", async () => {
      const t = theme(BODYLOG);
      const s = theme(disabling(["contrast-text"]), "standard.json");
      const out = await cli(
        "--theme",
        t,
        "--standard",
        s,
        "--no-rule",
        "contrast-text",
      );
      expect(out.lines).toContain("rules disabled: contrast-text");
      expect(out.lines.indexOf("rules disabled: contrast-text")).toBeLessThan(
        out.lines.length - 1,
      );
      expect(out.last).toMatch(/^\d+ violation\(s\)$/);
      expect(out.status).toBe(1);
    });

    it("ends a run with only findings in FINDINGS and exits 0", async () => {
      const out = await cli(
        "--theme",
        theme(
          FIXED((t) => {
            (t.colors as Record<string, string>).cellOddity = "$navy500";
          }),
        ),
      );
      expect(out.status).toBe(0);
      expect(out.last).toMatch(/^FINDINGS: \d+ in 1 files$/);
    });

    it.each([
      [
        "an unknown rule id",
        ["--no-rule", "no-such-rule"],
        /unknown rule no-such-rule/,
      ],
      [
        "a rule without a recorded reason",
        ["--no-rule", "contrast-text"],
        /rule contrast-text disabled without a reason/,
      ],
    ])("exits 2 for %s", async (_name, flags, message) => {
      const out = await cli("--theme", theme(BODYLOG), ...flags);
      expect(out.status).toBe(2);
      expect(out.errors.join("\n")).toMatch(message);
    });
  });
});
