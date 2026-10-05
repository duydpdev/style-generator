// The only lint-staged config. lint-staged appends the staged file paths to
// each command, so these run on staged files only; never call a `yarn` script
// that already targets `.` here. Script files also get `prettier --write`
// because ESLint ignores some paths (`scripts/*`, `site/**`, `*.cjs`, …) that
// CI's `prettier:check` still covers.
export default {
  "*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}": [
    "eslint --fix --no-warn-ignored --max-warnings 0",
    "prettier --write",
  ],
  "*.{json,md,yml,yaml,css}": "prettier --write",
};
