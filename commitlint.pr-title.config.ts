import type { UserConfig } from "@commitlint/types";

import base from "./commitlint.config";

// The PR title is kept in the `[type] subject` format so it matches the
// feature's commit header (which decides the release). commitlint's default
// ignores (`Merge …`, `Revert "…"`, semver-like, …) are right for the commit
// range in ci.yml, where real merge commits appear, but wrong for a title:
// GitHub's default revert title `Revert "[feat] x"` would pass unnoticed.
const config: UserConfig = { ...base, defaultIgnores: false };

export default config;
