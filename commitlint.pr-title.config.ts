import type { UserConfig } from "@commitlint/types";

import base from "./commitlint.config";

// PR titles become the squash commit on develop. commitlint's default ignores
// (`Merge …`, `Revert "…"`, semver-like, …) are right for the commit range in
// ci.yml, where real merge commits appear, but wrong for a title: GitHub's
// default revert title `Revert "[feat] x"` would pass and then release nothing,
// because semantic-release only parses `[type] subject`.
const config: UserConfig = { ...base, defaultIgnores: false };

export default config;
