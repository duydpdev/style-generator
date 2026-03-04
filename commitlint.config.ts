import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^\[(\w+)\] (.+)/,
      headerCorrespondence: ["type", "subject"],
    },
  },
  plugins: [
    {
      rules: {
        "header-match-team-pattern": (parsed: any) => {
          const { type, subject } = parsed;
          if (!type || !subject) {
            return [false, "header must be in format '[type] subject'"];
          }
          return [true, ""];
        },
        "type-enum": (parsed: any, _when: any, expectedValue: any) => {
          const { type } = parsed;
          if (type && !expectedValue.includes(type)) {
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
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "test",
        "chore",
        "revert",
        "ci",
        "perf",
        "build",
        "temp",
        "conf",
      ],
    ],
  },
};

export default config;
