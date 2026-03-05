import type { UserConfig } from "@commitlint/types";

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
        "header-match-team-pattern": (parsed: any) => {
          const { type, subject } = parsed;
          if (!type || !subject) {
            return [
              false,
              "header must be in format '[type] subject' (no colon after bracket)",
            ];
          }
          return [true, ""];
        },
        "type-enum": (parsed: any, _when: any, expectedValue: any) => {
          const { type } = parsed;
          if (
            type &&
            !expectedValue
              .map((v: string) => v.toLowerCase())
              .includes(type.toLowerCase())
          ) {
            return [false, `type must be one of ${expectedValue}`];
          }
          return [true, ""];
        },
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
         */
        "temp",

        /**
         * Configuration changes
         * Updates to project configuration files
         * Example: eslint, tsconfig, vite, tailwind
         */
        "conf",

        /**
         * Work in progress
         * Partial or experimental changes
         * Should usually be squashed before merging
         */
        "wip",
      ],
    ],
  },
};

export default config;
