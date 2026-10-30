/**
 * Custom Semantic Release configuration for commit format: [type] subject
 */

const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

// Features land on develop and on main separately (documents/deploy.md), so
// main is not an ancestor of develop. A DEV release that committed
// package.json/CHANGELOG.md to develop would make every back-merge of a stable
// release conflict on those lines (measured in a dry run of the feature-from-main
// flow). Only a release on main
// commits them; deploy.yml sets the published version from the tag. Any branch
// value other than exactly "main" (develop, HEAD, a PR ref) means no commit, so
// a detection failure costs a CHANGELOG entry, never a commit on develop.
function currentBranch() {
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME;
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}
const branch = currentBranch();
const commitsRelease = branch === "main";
console.log(
  `[release.config] branch=${branch || "<unknown>"} commitsRelease=${commitsRelease}`,
);

const template = fs.readFileSync("./changelog-template.hbs", "utf8");

const parserOpts = {
  headerPattern: /^\[(\w+)\] ([^:].+)/,
  headerCorrespondence: ["type", "subject"],
};

const FIX_SECTION = "Bug Fixes";
const FEAT_SECTION = "Features";

// A `[fix]` often tightens validation, so its body says what is now rejected
// and how to migrate; a `[feat]` body lists behaviour notes (changed
// defaults, new semantics). Attach it to the entry as `details`, indented to
// stay inside the Markdown list item (changelog-template.hbs).
const DETAIL_SECTIONS = new Set([FEAT_SECTION, FIX_SECTION]);

const finalizeContext = (context) => {
  for (const group of context.commitGroups) {
    if (!DETAIL_SECTIONS.has(group.title)) continue;
    group.commits = group.commits.map((commit) => {
      const body = commit.body?.trim();
      if (!body) return commit;
      const details = body
        .split("\n")
        .map((line) => (line.trim() === "" ? "" : `  ${line}`))
        .join("\n");
      return { ...commit, details };
    });
  }
  return context;
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
        // `presetConfig` is honoured only by the conventionalcommits preset;
        // under the default (angular) preset it was ignored, so `[release]`,
        // `[refactor]` and `[style]` commits were missing from the notes.
        preset: "conventionalcommits",
        parserOpts,
        writerOpts: {
          mainTemplate: template,
          finalizeContext,
        },
        presetConfig: {
          types: [
            { type: "release", section: "Release" },
            { type: "feat", section: "Features" },
            { type: "fix", section: FIX_SECTION },
            { type: "perf", section: "Performance Improvements" },
            { type: "refactor", section: "Refactor" },
            { type: "style", section: "Style" },
            { type: "revert", section: "Reverts" },
            { type: "docs", section: "Documentation", hidden: true },
            { type: "chore", section: "Miscellaneous Chores", hidden: true },
            { type: "test", section: "Tests", hidden: true },
            { type: "build", section: "Build System", hidden: true },
            { type: "ci", section: "Continuous Integration", hidden: true },
            { type: "conf", section: "Configuration", hidden: true },
            { type: "temp", section: "Temporary", hidden: true },
            { type: "wip", section: "Work in Progress", hidden: true },
          ],
        },
      },
    ],
    ...(commitsRelease ? ["@semantic-release/changelog"] : []),
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    ...(commitsRelease
      ? [
          [
            "@semantic-release/git",
            {
              assets: ["package.json", "CHANGELOG.md"],
              message:
                "[chore] release ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
            },
          ],
        ]
      : []),
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
