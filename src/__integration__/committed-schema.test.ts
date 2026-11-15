import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";
import { z } from "zod";

import { ThemeSchema } from "../core/themeSchema";
import { StyleGenConfigFileSchema } from "../node/loadStyleGenConfig";

const repoRoot = join(__dirname, "..", "..");

// Committed copies referenced by `"$schema"` in the workspace theme.json
// files. Deep-equal (not byte) comparison: lint-staged prettier reformats them.
const committedSchemas = [
  "examples/theme.schema.json",
  "examples/design-system/src/theme.schema.json",
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

// Copies referenced by `"$schema"` in the workspace style-gen.config.json
// files. The plain apps point at the shared `examples/` copy (they are
// copy-paste folders and carry none of their own).
const committedConfigSchemas = [
  "examples/style-gen.config.schema.json",
  "examples/design-system/style-gen.config.schema.json",
  "site/style-gen.config.schema.json",
];

describe("integration: committed style-gen.config.schema.json files match StyleGenConfigFileSchema", () => {
  const expected = z.toJSONSchema(StyleGenConfigFileSchema);

  it.each(committedConfigSchemas)("%s is up to date", (file) => {
    const actual: unknown = JSON.parse(
      readFileSync(join(repoRoot, file), "utf8"),
    );
    expect(
      actual,
      `${file} is stale; regenerate from the repository root with: yarn build:cli && node dist/cli/index.mjs schema --out examples/theme.schema.json --config-out ${file}`,
    ).toEqual(expected);
  });
});
