import postcss, { type AtRule, type Root, type Rule } from "postcss";
import { describe, it, expect } from "vitest";

import { defineTheme } from "../core/defineTheme";
import { generate } from "../core/generate";
import type { StyleGeneratorOptions } from "../core/Options";

import { compileFixtureCss } from "./compileFixtureCss";

const theme = defineTheme({
  colors: { primary: "#3B82F6" },
  typography: {
    text12Mono: { fontSize: "12px", lineHeight: "16px", fontWeight: 400 },
  },
});

const compileRoot = async (
  options: StyleGeneratorOptions,
  candidates: string[],
) => {
  const g = generate(theme, options);
  return {
    tokens: g.tokens,
    root: postcss.parse(await compileFixtureCss(g.css, candidates)),
  };
};

const ruleFor = (root: Root, selector: string): Rule | undefined => {
  let found: Rule | undefined;
  root.walkRules((r) => {
    if (r.selector === selector) found ??= r;
  });
  return found;
};

const mediaParams = (rule: Rule | undefined): string[] =>
  (rule?.nodes ?? [])
    .filter((n): n is AtRule => n.type === "atrule" && n.name === "media")
    .map((n) => n.params);

const declProps = (rule: Rule | undefined): string[] =>
  (rule?.nodes ?? []).flatMap((n) => (n.type === "decl" ? [n.prop] : []));

describe("integration: non-default options through the real Tailwind engine (X-17)", () => {
  it("custom screens and breakpoints drive the variants and the spacing chain", async () => {
    const { root, tokens } = await compileRoot(
      { screens: { md: "800px", xl: "1300px" }, breakpoints: ["md", "xl"] },
      ["md:flex", "xl:flex", "sp-p"],
    );
    expect(mediaParams(ruleFor(root, ".sp-p"))).toEqual([
      "(width >= 800px)",
      "(width >= 1300px)",
    ]);
    expect(mediaParams(ruleFor(root, ".md\\:flex"))).toEqual([
      "(width >= 800px)",
    ]);
    expect(mediaParams(ruleFor(root, ".xl\\:flex"))).toEqual([
      "(width >= 1300px)",
    ]);
    expect(tokens.Web.breakpoints).toEqual(["md", "xl"]);
  });

  it("custom spacing properties replace the default sp-* utilities", async () => {
    const { root, tokens } = await compileRoot(
      {
        spacing: {
          properties: {
            inset: { top: "var(--sg-sp-inset)", bottom: "var(--sg-sp-inset)" },
          },
        },
      },
      ["sp-inset", "sp-p"],
    );
    expect(declProps(ruleFor(root, ".sp-inset"))).toEqual(["top", "bottom"]);
    expect(ruleFor(root, ".sp-p")).toBeUndefined();
    expect(tokens.Web.spacingProperties).toEqual(["inset"]);
  });

  it("cssVarDriven typography reads :root variables", async () => {
    const { root } = await compileRoot({ typography: { cssVarDriven: true } }, [
      "text-12-mono",
    ]);
    const fontSize = ruleFor(root, ".text-12-mono")?.nodes.find(
      (n) => n.type === "decl" && n.prop === "font-size",
    );
    expect(fontSize?.type === "decl" ? fontSize.value : undefined).toBe(
      "var(--typography-text-12-mono-font-size)",
    );
    const rootValues: string[] = [];
    root.walkRules(":root", (r) => {
      r.walkDecls("--typography-text-12-mono-font-size", (d) => {
        rootValues.push(d.value);
      });
    });
    expect(rootValues).toContain("12px");
  });

  it("enableResponsive: false emits sp-* without media queries", async () => {
    const { root } = await compileRoot({ enableResponsive: false }, ["sp-p"]);
    expect(mediaParams(ruleFor(root, ".sp-p"))).toEqual([]);
    expect(declProps(ruleFor(root, ".sp-p"))).toEqual(["padding"]);
  });

  it("spacing.enabled: false emits no sp-* utility", async () => {
    const { root } = await compileRoot({ spacing: { enabled: false } }, [
      "sp-p",
    ]);
    expect(ruleFor(root, ".sp-p")).toBeUndefined();
  });
});
