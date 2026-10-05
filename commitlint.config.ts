import type { SyncRule, UserConfig } from "@commitlint/types";

const headerMatchTeamPattern: SyncRule = ({ type, subject }) => {
  if (!type || !subject) {
    return [
      false,
      "header must be in format '[type] subject' (no colon after bracket)",
    ];
  }
  return [true, ""];
};

// Case-sensitive on purpose: release.config.cjs maps lowercase types only, so
// `[Feat] x` would pass a case-insensitive check and then cut no release.
const typeEnum: SyncRule<string[]> = ({ type }, _when, expectedValue = []) => {
  if (type && !expectedValue.includes(type)) {
    return [false, `type must be one of ${expectedValue} (lowercase)`];
  }
  return [true, ""];
};

const config: UserConfig = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[(\w+)\] ([^:].+)/,
      headerCorrespondence: ["type", "subject"],
    },
  },
  plugins: [
    {
      rules: {
        "header-match-team-pattern": headerMatchTeamPattern,
        "type-enum": typeEnum,
      },
    },
  ],
  rules: {
    "header-match-team-pattern": [2, "always"],
    "type-enum": [
      2,
      "always",
      [
        /**
         * Release commits
         * Marks a new version release
         * Used by automated release tools
         */
        "release",

        /**
         * Feature commits
         * Introduces a new user-facing feature or capability
         */
        "feat",

        /**
         * Bug fixes
         * Fixes incorrect behavior or defects in the code
         */
        "fix",

        /**
         * Documentation changes
         * Updates to README, comments, guides, or docs
         */
        "docs",

        /**
         * Code style updates
         * Formatting, lint fixes, whitespace, etc.
         * No functional code changes
         */
        "style",

        /**
         * Code refactoring
         * Improves structure without changing behavior
         */
        "refactor",

        /**
         * Tests
         * Adding or updating unit / integration tests
         */
        "test",

        /**
         * Maintenance tasks
         * Dependency updates, housekeeping tasks
         */
        "chore",

        /**
         * Revert previous commit
         * Used when undoing a previous change
         */
        "revert",

        /**
         * Continuous Integration changes
         * CI pipeline, workflows, GitHub Actions, etc.
         */
        "ci",

        /**
         * Performance improvements
         * Optimizations that improve speed or reduce memory usage
         */
        "perf",

        /**
         * Build system changes
         * Affects build tools, bundlers, or packaging
         */
        "build",

        /**
         * Temporary commits
         * Short-lived commits not meant for production history
         * No release
         */
        "temp",

        /**
         * Configuration changes
         * Updates to project configuration files
         * Example: eslint, tsconfig, vite, tailwind
         * No release
         */
        "conf",

        /**
         * Work in progress
         * Partial or experimental changes. No release; the header of every
         * commit counts, so collapse the branch into one `[type] subject`
         * commit before the first PR (documents/deploy.md).
         */
        "wip",
      ],
    ],
  },
};

export default config;
