import { describe, expect, it } from "vitest";

import {
  boxRecipe,
  buttonRecipe,
  gridRecipe,
  intents,
  stackRecipe,
  textLineClamp,
  textRecipe,
  textTransform,
  textWrap,
  tokens,
} from "../src";
import { gridColumns } from "../src/recipes/factories/grid";
import { createFlexRecipe } from "../src/recipes/factories/stack";

const colorValues = [
  ...tokens.colors,
  ...tokens.colors.flatMap((c) =>
    tokens.opacities.map((s) => `${c}/${String(s)}`),
  ),
];

/** `primary/<step>` with the literal step type kept, so it type-checks as a colour value. */
function primaryStep<S extends (typeof tokens.opacities)[number]>(
  step: S,
): `primary/${S}`;
function primaryStep(step: number): string {
  return `primary/${String(step)}`;
}

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
  it("stackRecipe", () => {
    expect(
      run(
        stackRecipe,
        singles({
          direction: ["column", "row"],
          align: ["start", "center", "end", "stretch"],
          justify: ["start", "center", "end", "between"],
          wrap: [true],
          divideColor: colorValues,
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
          transform: textTransform,
          italic: [true],
          truncate: [true],
          lineClamp: textLineClamp,
          wrap: textWrap,
        }),
      ),
    ).toMatchSnapshot();
  });

  it("textRecipe: color with an opacity step", () => {
    const classes = textRecipe({ color: "primary/50" });
    expect(classes).toContain("text-primary/50");
    expect(classes).not.toContain("text-foreground");
  });

  it("boxRecipe", () => {
    const widths = tokens.borderWidth;
    const radii = tokens.borderRadius;
    expect(
      run(
        boxRecipe,
        singles({
          backgroundColor: colorValues,
          borderColor: colorValues,
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
          display: [
            "block",
            "inlineBlock",
            "inline",
            "flex",
            "inlineFlex",
            "grid",
            "contents",
            "hidden",
          ],
          overflow: ["auto", "hidden", "clip", "visible", "scroll"],
          zIndex: [0, 10, 20, 30, 40, 50, "auto"],
          opacity: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          cursor: [
            "auto",
            "default",
            "pointer",
            "notAllowed",
            "grab",
            "grabbing",
            "text",
            "move",
          ],
          pointerEvents: ["none", "auto"],
          select: ["none", "text", "all", "auto"],
          transition: [
            "none",
            "all",
            "colors",
            "opacity",
            "shadow",
            "transform",
          ],
          aspect: ["auto", "square", "video"],
          objectFit: ["contain", "cover", "fill", "none", "scaleDown"],
          visibility: ["visible", "invisible", "collapse"],
          ringColor: colorValues,
          outlineColor: colorValues,
          innerBorder: [true],
        }),
      ),
    ).toMatchSnapshot();
  });

  it("gridRecipe (exact)", () => {
    expect(gridRecipe()).toBe("grid");
    expect(gridRecipe({ align: "center", flow: "dense" })).toBe(
      "grid items-center grid-flow-dense",
    );
    expect(gridRecipe({ rows: 3 })).toBe("grid grid-rows-3");
    expect(gridRecipe({ rows: "none" })).toBe("grid grid-rows-none");
    expect(gridColumns({ base: 1, md: 3 })).toEqual({
      className: "grid-cols-(--ui-grid-cols) md:grid-cols-(--ui-grid-cols-md)",
      style: {
        "--ui-grid-cols": "repeat(1, minmax(0, 1fr))",
        "--ui-grid-cols-md": "repeat(3, minmax(0, 1fr))",
      },
    });
    expect(() => gridColumns(0)).toThrow(RangeError);
    expect(() => gridColumns({ tablet: 2 })).toThrow(
      'unknown breakpoint "tablet"',
    );
  });

  it("flexRecipe (exact)", () => {
    const flexRecipe = createFlexRecipe(tokens);
    expect(flexRecipe()).toBe("flex flex-row");
    expect(flexRecipe({ grow: true, shrink: false, basis: "1/2" })).toBe(
      "flex flex-row grow shrink-0 basis-1/2",
    );
    expect(flexRecipe({ basis: 0 })).toBe("flex flex-row basis-0");
  });

  it("boxRecipe: numeric zIndex/opacity (zero too) and every background step map to table classes", () => {
    expect(boxRecipe({ zIndex: 0, opacity: 0 })).toBe("relative z-0 opacity-0");
    expect(boxRecipe({ zIndex: 10, opacity: 100 })).toBe(
      "relative z-10 opacity-100",
    );
    for (const step of tokens.opacities) {
      expect(boxRecipe({ backgroundColor: primaryStep(step) })).toBe(
        `relative bg-primary/${String(step)}`,
      );
    }
  });

  it("gridColumns takes CSS track strings", () => {
    expect(gridColumns("80px 1fr 80px")).toEqual({
      className: "grid-cols-(--ui-grid-cols)",
      style: { "--ui-grid-cols": "80px 1fr 80px" },
    });
    expect(gridColumns({ base: 1, md: "220px 1fr" })).toEqual({
      className: "grid-cols-(--ui-grid-cols) md:grid-cols-(--ui-grid-cols-md)",
      style: {
        "--ui-grid-cols": "repeat(1, minmax(0, 1fr))",
        "--ui-grid-cols-md": "220px 1fr",
      },
    });
    expect(() => gridColumns("  ")).toThrow(RangeError);
    expect(() => gridColumns({ md: "" })).toThrow(RangeError);
  });
});
