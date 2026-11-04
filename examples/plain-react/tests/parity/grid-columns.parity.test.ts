import { describe, expect, test } from "vitest";

import { Grid } from "../../src/ui/grid/Grid";
import { gridColumns } from "../../src/ui/grid/style";

import { HarnessGrid } from "./harness";
import { loose, renderClasses } from "./parity";

/** What a call or a render throws: its constructor name and message, or `null` when it does not throw. */
interface Thrown {
  readonly name: string;
  readonly message: string;
}

const thrownBy = async (run: () => unknown): Promise<Thrown | null> => {
  try {
    await run();
    return null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { name: error.constructor.name, message: error.message };
  }
};

const invalid = [
  { name: "0", columns: 0 },
  { name: "-1", columns: -1 },
  { name: "1.5", columns: 1.5 },
  { name: "empty track list", columns: "" },
  { name: "unknown breakpoint { huge: 2 }", columns: { huge: 2 } },
] as const;

describe("Grid columns errors (plain vs harness)", () => {
  test.each(invalid)(
    "$name: the plain gridColumns and the harness Grid throw the same error",
    async ({ columns }) => {
      const plain = await thrownBy(() => gridColumns(columns));
      const harness = await thrownBy(() =>
        renderClasses(loose(HarnessGrid), { columns }),
      );
      expect(plain).not.toBeNull();
      expect(harness).toEqual(plain);
    },
  );

  test.each(invalid)(
    "$name: the plain Grid throws the same error as the plain gridColumns",
    async ({ columns }) => {
      const direct = await thrownBy(() => gridColumns(columns));
      const rendered = await thrownBy(() =>
        renderClasses(loose(Grid), { columns }),
      );
      expect(rendered).toEqual(direct);
    },
  );

  // `xl` is a known class key, not an unknown breakpoint: neither side throws
  // (the harness types reject it, the runtime does not), and both agree.
  test("{ xl: 2 } does not throw on either side", async () => {
    const columns = { xl: 2 };
    expect(await thrownBy(() => gridColumns(columns))).toBeNull();
    expect(
      await thrownBy(() => renderClasses(loose(HarnessGrid), { columns })),
    ).toBeNull();
  });
});
