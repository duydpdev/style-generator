import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import defaultManifest from "../../canvas/design-canvas-standard.json";

import { packagedStandard, StandardSchema } from "./standardSchema";

const DEFAULT_STANDARD = packagedStandard();

const repoRoot = join(__dirname, "..", "..", "..", "..");
const legacy: unknown = JSON.parse(
  readFileSync(
    join(
      repoRoot,
      "src/__integration__/__fixtures__/canvas-standard/manifest-9.2.0.json",
    ),
    "utf8",
  ),
);

describe("packaged canvas standard", () => {
  const standard = DEFAULT_STANDARD;
  const described = [
    ...new Set([
      ...standard.semanticCore,
      ...(standard.grammar?.neutral ?? []),
      ...(standard.grammar?.roles ?? []),
    ]),
  ];

  it.each(described)("key %s has a non-empty description", (key) => {
    expect(standard.descriptions?.[key]?.trim()).toBeTruthy();
  });

  it("has no description for a key outside the core, neutral and role lists", () => {
    expect(
      Object.keys(standard.descriptions ?? {}).sort((a, b) =>
        a.localeCompare(b),
      ),
    ).toEqual([...described].sort((a, b) => a.localeCompare(b)));
  });

  it("gives every rule a basis with a source", () => {
    const rules = Object.entries(standard.rules ?? {});
    expect(rules.length).toBeGreaterThan(0);
    for (const [id, rule] of rules) {
      expect(rule.basis.source?.trim(), id).toBeTruthy();
    }
  });

  it("gives every scale family a kind and at least one step", () => {
    const families = Object.entries(standard.scales ?? {});
    expect(
      families.map(([family]) => family).sort((a, b) => a.localeCompare(b)),
    ).toEqual(
      [
        "borderRadius",
        "borderWidth",
        "controlHeight",
        "fontFamily",
        "iconSize",
        "motionDuration",
        "motionEasing",
        "opacity",
        "shadows",
        "zIndex",
      ].sort((a, b) => a.localeCompare(b)),
    );
    for (const [family, scale] of families) {
      expect(["size", "ordinal", "name"], family).toContain(scale.kind);
      expect(scale.steps.length, family).toBeGreaterThan(0);
    }
  });

  it("keeps the radius list only as scales.borderRadius", () => {
    expect(defaultManifest).not.toHaveProperty("radius");
    expect(standard.scales?.borderRadius?.steps).toEqual([
      "sm",
      "md",
      "lg",
      "xl",
      "full",
    ]);
  });

  it("accepts its own output", () => {
    expect(StandardSchema.safeParse(standard).success).toBe(true);
  });

  it("sends a text key ending in Soft to foregroundSecondary", () => {
    expect(standard.grammar?.renames.foregroundSoft).toBe(
      "foregroundSecondary",
    );
    expect(standard.grammar?.renames.Soft).toBe("Subtle");
  });
});

describe("packagedStandard", () => {
  it("reads the manifest once and returns the same object", () => {
    expect(packagedStandard()).toBe(packagedStandard());
  });
});

describe("older manifests", () => {
  it("parses the 9.2.0 packaged manifest and reads its radius list as scales.borderRadius", () => {
    const parsed = StandardSchema.parse(legacy);
    expect(parsed).not.toHaveProperty("radius");
    expect(parsed.scales?.borderRadius).toEqual({
      kind: "size",
      steps: ["sm", "md", "lg", "xl", "full"],
    });
    expect(parsed.descriptions).toBeUndefined();
    expect(parsed.rules).toBeUndefined();
  });

  it("lets an explicit scales.borderRadius win over a stale radius list", () => {
    const parsed = StandardSchema.parse({
      ...(legacy as object),
      radius: ["a"],
      scales: { borderRadius: { kind: "size", steps: ["b"] } },
    });
    expect(parsed.scales?.borderRadius?.steps).toEqual(["b"]);
  });

  it("ignores unknown keys", () => {
    expect(
      StandardSchema.safeParse({ ...(legacy as object), future: 1 }).success,
    ).toBe(true);
  });
});
