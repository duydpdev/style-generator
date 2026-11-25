import { expect, test } from "vitest";

import standardDoc from "../../../../documents/components.md?raw";

/** The values of each axis row in the marked component-axes table of `documents/components.md`. */
const standardAxes = (doc: string): Record<string, string[]> => {
  const start = doc.indexOf("<!-- component-axes:start -->");
  const end = doc.indexOf("<!-- component-axes:end -->");
  if (start === -1 || end < start)
    throw new Error("component-axes markers not found");
  const axes: Record<string, string[]> = {};
  for (const row of doc.slice(start, end).split("\n")) {
    const cells = row.split("|").map((cell) => cell.trim());
    const axis = /^`(\w+)`$/.exec(cells[1] ?? "")?.[1];
    if (axis === undefined) continue;
    axes[axis] = [...(cells[2] ?? "").matchAll(/`(\w+)`/g)].map(
      (m) => m[1] ?? "",
    );
  }
  return axes;
};

const modules = import.meta.glob<Record<string, unknown>>(
  "../../src/ui/*/style.ts",
  {
    eager: true,
  },
);

/** Every `<name>Tables` export with its `variant` and `size` option keys. */
const tables = Object.entries(modules).flatMap(([path, mod]) =>
  Object.entries(mod)
    .filter(
      ([name, value]) =>
        name.endsWith("Tables") && typeof value === "object" && value !== null,
    )
    .map(([name, value]) => {
      const variants =
        (value as { variants?: Record<string, object> }).variants ?? {};
      return {
        name: `${path.split("/").at(-2) ?? path}/${name}`,
        variant: Object.keys(variants.variant ?? {}),
        size: Object.keys(variants.size ?? {}),
      };
    }),
);

test("the standard table names the variant and size values", () => {
  expect(standardAxes(standardDoc)).toMatchObject({
    variant: ["solid", "soft", "outline", "ghost", "link"],
    size: ["sm", "md", "lg", "icon"],
  });
});

/** `<axis>:<value>` for each value the standard does not list. */
const outside = (
  table: { variant: string[]; size: string[] },
  axes: Record<string, string[]>,
): string[] =>
  (["variant", "size"] as const).flatMap((axis) =>
    table[axis]
      .filter((value) => !(axes[axis] ?? []).includes(value))
      .map((value) => `${axis}:${value}`),
  );

test.each(tables)(
  "$name uses only the standard variant and size values",
  (table) => {
    expect(outside(table, standardAxes(standardDoc))).toEqual([]);
  },
);

test("a value outside the standard is reported, and the scan finds the components", () => {
  expect(
    outside(
      { variant: ["solid", "fill"], size: ["md", "xl"] },
      standardAxes(standardDoc),
    ),
  ).toEqual(["variant:fill", "size:xl"]);
  expect(tables.map((table) => table.name)).toEqual(
    expect.arrayContaining(["button/buttonTables", "checkbox/checkboxTables"]),
  );
});
