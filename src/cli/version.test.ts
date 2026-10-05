import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readCliVersion } from "./version";

describe("readCliVersion", () => {
  it("returns the repository package.json version, not the Unknown fallback", () => {
    // Vitest runs from the repository root.
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve("package.json"), "utf8"),
    ) as { version: string };

    expect(readCliVersion()).toBe(pkg.version);
  });
});
