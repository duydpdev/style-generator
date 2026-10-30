import { describe, expect, it } from "vitest";

import {
  badgeRecipe,
  boxRecipe,
  buttonRecipe,
  cardRecipe,
  dialogOverlayRecipe,
  dialogRecipe,
  inputRecipe,
  intents,
  stackRecipe,
  textRecipe,
  tokens,
} from "../src";

type Recipe = (props?: Record<string, unknown>) => string;
type Axes = Readonly<Record<string, readonly unknown[]>>;
type Combo = Record<string, unknown>;

const cartesian = (axes: Axes): Combo[] =>
  Object.entries(axes).reduce<Combo[]>(
    (acc, [key, values]) =>
      acc.flatMap((combo) =>
        values.map((value) => ({ ...combo, [key]: value })),
      ),
    [{}],
  );

const singles = (axes: Axes): Combo[] =>
  Object.entries(axes).flatMap(([key, values]) =>
    values.map((value) => ({ [key]: value })),
  );

const run = (recipe: unknown, combos: Combo[]): string[] => {
  const call = recipe as Recipe;
  return [
    `{} => ${call()}`,
    ...combos.map((p) => `${JSON.stringify(p)} => ${call(p)}`),
  ];
};

const sizes = ["sm", "md", "lg"] as const;

describe("bound recipe output (frozen before the factory refactor)", () => {
  it("buttonRecipe", () => {
    expect(
      run(
        buttonRecipe,
        cartesian({
          variant: ["fill", "outline", "soft", "ghost", "link"],
          color: intents,
          size: sizes,
        }),
      ),
    ).toMatchSnapshot();
  });
  it("badgeRecipe", () => {
    expect(
      run(
        badgeRecipe,
        cartesian({
          color: intents,
          variant: ["soft", "solid", "outline"],
        }),
      ),
    ).toMatchSnapshot();
  });
  it("cardRecipe", () => {
    expect(
      run(
        cardRecipe,
        cartesian({
          tone: ["surface", "muted", "outline"],
          padding: ["none", "sm", "md", "lg"],
        }),
      ),
    ).toMatchSnapshot();
  });
  it("inputRecipe", () => {
    expect(
      run(inputRecipe, cartesian({ size: sizes, invalid: [true, false] })),
    ).toMatchSnapshot();
  });
  it("dialogRecipe", () => {
    expect(run(dialogRecipe, cartesian({ size: sizes }))).toMatchSnapshot();
  });
  it("dialogOverlayRecipe", () => {
    expect(
      run(dialogOverlayRecipe, cartesian({ blur: ["none", "sm", "md", "lg"] })),
    ).toMatchSnapshot();
  });
  it("stackRecipe", () => {
    expect(
      run(
        stackRecipe,
        singles({
          direction: ["column", "row"],
          align: ["start", "center", "end", "stretch"],
          justify: ["start", "center", "end", "between"],
          wrap: [true],
        }),
      ),
    ).toMatchSnapshot();
  });
  it("textRecipe", () => {
    expect(
      run(
        textRecipe,
        singles({
          type: tokens.typography,
          color: tokens.colors,
          decoration: ["underline", "lineThrough", "none"],
          align: ["left", "center", "right"],
        }),
      ),
    ).toMatchSnapshot();
  });
  it("boxRecipe", () => {
    const widths = tokens.borderWidth;
    const radii = tokens.borderRadius;
    expect(
      run(
        boxRecipe,
        singles({
          backgroundColor: tokens.colors,
          borderColor: tokens.colors,
          border: widths,
          borderX: widths,
          borderY: widths,
          borderT: widths,
          borderB: widths,
          borderL: widths,
          borderR: widths,
          rounded: radii,
          roundedT: radii,
          roundedB: radii,
          roundedL: radii,
          roundedR: radii,
          shadow: tokens.shadows,
          backdropBlur: tokens.backDropBlurs,
          position: ["absolute", "relative", "fixed", "sticky"],
          innerBorder: [true],
        }),
      ),
    ).toMatchSnapshot();
  });
});
