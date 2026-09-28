import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";
import { z } from "zod";

import { ThemeSchema } from "../core/themeSchema";

const repoRoot = join(__dirname, "..", "..");

// Committed copies referenced by `"$schema"` in the workspace theme.json
// files. Deep-equal (not byte) comparison: lint-staged prettier reformats them.
const committedSchemas = [
  "examples/theme.schema.json",
  "examples/react-v4/src/theme/theme.schema.json",
  "examples/next-v4/app/theme/theme.schema.json",
  "examples/nuxt-v4/theme/theme.schema.json",
  "site/src/theme/theme.schema.json",
];

describe("integration: committed theme.schema.json files match ThemeSchema", () => {
  const expected = z.toJSONSchema(ThemeSchema);

  it.each(committedSchemas)("%s is up to date", (file) => {
    const actual: unknown = JSON.parse(
      readFileSync(join(repoRoot, file), "utf8"),
    );
    expect(
      actual,
      `${file} is stale; regenerate with: yarn build:cli && node dist/cli/index.mjs schema --out ${file}`,
    ).toEqual(expected);
  });
});
