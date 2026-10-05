import fs from "node:fs";

/**
 * Version of the installed package, or `"Unknown"` when `package.json` cannot
 * be read. Resolved from this module's URL, not `__dirname` (undefined in the
 * ESM CLI bundle): `src/cli/` in source and `dist/cli/` in the bundle both sit
 * two levels below `package.json`.
 * @returns {string} The `version` field of the package's `package.json`
 */
export function readCliVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : "Unknown";
  } catch {
    return "Unknown";
  }
}
