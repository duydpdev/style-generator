import { describe, expect, it } from "vitest";

import { buttonPreset, buttonRecipe, tokens } from "../src";
import { createButtonRecipe } from "../src/recipes/factories/button";

const classes = (recipe: (props?: object) => string, props: object) =>
  recipe(props).split(/\s+/);

describe("button preset literals", () => {
  it("keeps today's hover dim and duration when the preset sets neither", () => {
    const solid = classes(buttonRecipe, { color: "secondary" });
    expect(solid).toContain("duration-150");
    expect(classes(buttonRecipe, { variant: "soft" })).toContain(
      "hover:opacity-90",
    );
  });

  it("draws both from the preset's own keys", () => {
    const recipe = createButtonRecipe(tokens, {
      ...buttonPreset,
      hoverDim: "hover:opacity-disabled",
      duration: "duration-base",
    });
    const soft = classes(recipe, { variant: "soft" });
    expect(soft).toContain("hover:opacity-disabled");
    expect(soft).toContain("duration-base");
    expect(soft).not.toContain("hover:opacity-90");
    expect(soft).not.toContain("duration-150");
  });
});
