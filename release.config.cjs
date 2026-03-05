/**
 * Custom Semantic Release configuration for commit format: [type] subject
 */

const fs = require("node:fs");

const template = fs.readFileSync("./changelog-template.hbs", "utf8");

const parserOpts = {
  headerPattern: /^\[(\w+)\] ([^:].+)/,
  headerCorrespondence: ["type", "subject"],
};

module.exports = {
  branches: ["main", { name: "develop", prerelease: "DEV" }],
  parserOpts,
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        parserOpts: {
          headerPattern: /^\[(\w+)\] ([^:].+)/,
          headerCorrespondence: ["type", "subject"],
        },
        releaseRules: [
          { type: "release", release: "major" },
          { type: "feat", release: "minor" },
          { type: "fix", release: "patch" },
          { type: "perf", release: "patch" },
          { type: "revert", release: "patch" },
          { type: "style", release: "patch" },
          { type: "refactor", release: "patch" },
          { type: "test", release: false },
          { type: "build", release: false },
          { type: "ci", release: false },
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        parserOpts,
        writerOpts: {
          mainTemplate: template,
        },
        presetConfig: {
          types: [
            { type: "release", section: "Release" },
            { type: "feat", section: "Features" },
            { type: "fix", section: "Bug Fixes" },
            { type: "perf", section: "Performance Improvements" },
            { type: "revert", section: "Reverts" },
            { type: "docs", section: "Documentation", hidden: true },
            { type: "style", section: "Styles", hidden: true },
            { type: "chore", section: "Miscellaneous Chores", hidden: true },
            { type: "refactor", section: "Code Refactoring", hidden: true },
            { type: "test", section: "Tests", hidden: true },
            { type: "build", section: "Build System", hidden: true },
            { type: "ci", section: "Continuous Integration", hidden: true },
          ],
        },
      },
    ],
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["package.json", "CHANGELOG.md"],
        message:
          "[chore] release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    [
      "@semantic-release/github",
      {
        successComment: false,
        failComment: false,
        releasedLabels: false,
      },
    ],
  ],
};
