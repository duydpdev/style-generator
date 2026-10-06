// The only lint-staged config. lint-staged hides unstaged changes first, so
// every task below sees exactly the staged snapshot. String tasks get the
// staged file paths appended; never call a `yarn` script that already
// targets `.` here. Script files also get `prettier --write` because ESLint
// ignores some paths (`*.cjs`, `examples/**`, …) that CI's `prettier:check`
// still covers.
//
// Function tasks choose their own arguments: `tsc` type-checks the whole
// project once (a file list would bypass tsconfig.json), and `vitest related`
// runs only the tests that import a staged file. Both run after the fixers,
// so they check the code that is about to be committed.
export default {
  "*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}": [
    "eslint --fix --no-warn-ignored --max-warnings 0",
    "prettier --write",
    () => "tsc --noEmit",
    (files) =>
      `vitest related --run --passWithNoTests ${files.map((f) => JSON.stringify(f)).join(" ")}`,
  ],
  "*.{json,md,yml,yaml,css}": "prettier --write",
};
