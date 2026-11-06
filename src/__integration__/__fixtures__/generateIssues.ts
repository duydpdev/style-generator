import { z } from "zod";

import { generate } from "../../core/generate";

/** A valid one-color theme: what `issuesOf` generates from. */
export const theme = { colors: { primary: "#fff" } };

/**
 * Run `generate()` on {@link theme} with `options` and list the `ZodError`
 * issues it throws (`[]` when it succeeds).
 * @param {unknown} options - Options under test, passed through unchecked
 * @returns {{ code: string, path: string, keys: unknown }[]} One entry per issue
 */
export const issuesOf = (options: unknown) => {
  try {
    generate(theme, options as never);
    return [];
  } catch (e) {
    if (!(e instanceof z.ZodError)) throw e;
    return e.issues.map((i) => ({
      code: i.code,
      path: i.path.join("."),
      keys: "keys" in i ? i.keys : [],
    }));
  }
};
