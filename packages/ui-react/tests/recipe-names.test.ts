import * as factories from "design-system-example/recipes";
import { describe, expect, it } from "vitest";

import { BANNED_TAGS, UI_COMPONENT_NAMES } from "../registry.mjs";

import { ui } from "./ui";

/** Recipes that are a part of another component, not a component of their own. */
const PART_RECIPES: Readonly<Record<string, string>> = {
  DialogOverlay: "Dialog",
};
/** Components that reuse another component's recipe (§11.2 rule 3: Flex and Stack share one). */
const SHARED_RECIPE: Readonly<Record<string, string>> = {
  Flex: "Stack",
  ListItem: "Box",
};
/** The positive tag list, plus tags whose ban the user approved in phase 03 (none by default). */
const APPROVED_EXTRA_TAGS: readonly string[] = [];
const BASE_TAGS = [
  "article",
  "aside",
  "button",
  "div",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "input",
  "main",
  "nav",
  "p",
  "section",
  "select",
  "span",
];

const byName = (a: string, b: string): number => a.localeCompare(b);
const recipeNames = Object.keys(factories)
  .flatMap((name) => /^create(\w+)Recipe$/.exec(name)?.[1] ?? [])
  .sort(byName);
const componentNames = Object.keys(ui).sort(byName);

describe("one recipe, one component (by name)", () => {
  it("every recipe factory backs a component", () => {
    expect(
      recipeNames.filter(
        (r) => !componentNames.includes(r) && !(r in PART_RECIPES),
      ),
    ).toEqual([]);
  });
  it("every component has a recipe factory", () => {
    expect(
      componentNames.filter(
        (c) => !recipeNames.includes(c) && !(c in SHARED_RECIPE),
      ),
    ).toEqual([]);
  });
  it("allow-lists only name real recipes and components", () => {
    for (const [recipe, component] of Object.entries(PART_RECIPES)) {
      expect(recipeNames).toContain(recipe);
      expect(componentNames).toContain(component);
    }
    for (const [component, recipe] of Object.entries(SHARED_RECIPE)) {
      expect(componentNames).toContain(component);
      expect(recipeNames).toContain(recipe);
    }
  });
  it("the registry lists exactly the createUi components", () => {
    expect([...UI_COMPONENT_NAMES].sort(byName)).toEqual(componentNames);
  });
  it("bans exactly the positive tag list plus approved extras", () => {
    expect([...BANNED_TAGS].sort(byName)).toEqual(
      [...BASE_TAGS, ...APPROVED_EXTRA_TAGS].sort(byName),
    );
  });
});
