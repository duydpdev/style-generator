# AC4 sample PR — `letterSpacing` category (3-file proof)

Success Criteria 3 of `docs/plans/2026-09-28/07-v4-aliases-categories.md` (as
amended by "Quyết định user 2026-09-29") requires proving that adding a new
CSS-var category touches **exactly 3 files**: one line in `themeSchema.ts`
(the `ThemeCssVarShape` record), one descriptor in `builtInCategories.ts`,
and one new test. This was proven in a disposable git worktree
(`git worktree add ../sg-letterspacing-proof HEAD`, branch `feat/v4-dev-5` @
`97a9952`) and **not committed anywhere** — the worktree was removed after
capturing the evidence below.

## Changes made in the worktree

1. `src/core/themeSchema.ts` — added one field to `ThemeCssVarShape`:

   ```diff
      borderWidth: z.record(TokenKey, TokenValue).optional(),
   +  letterSpacing: z.record(TokenKey, TokenValue).optional(),
    });
   ```

   `ThemeConfig` (`z.infer<typeof ThemeSchema>`) and `ThemeOverrideSchema`
   (`ThemeCssVarShape.partial()`) pick this up automatically — no other
   type or schema code needs editing.

2. `src/features/registry/builtInCategories.ts` — one new descriptor,
   registered in `builtInCategories`:

   ```ts
   export const letterSpacingCategory = defineCategory({
     key: "letterSpacing",
     cssVarPrefix: "sg-tracking",
     themeNamespace: "--tracking-",
     classPrefixes: ["tracking"],
     select: (source) => source.letterSpacing,
   });
   ```

   `flattenByCategory`, `generateThemeCss` (`buildIntermediateVars` /
   `buildThemeMapping`), and `generateSourceInline` all iterate
   `builtInCategories` generically — none of them needed touching.

3. `src/features/registry/letterSpacing.test.ts` — new test proving
   `tracking-tight` compiles from an **empty candidate list** (i.e. purely
   via the registry-generated `@source inline`, not because some other
   scanned source referenced the class):

   ```ts
   const theme = {
     colors: { primary: "#3B82F6" },
     letterSpacing: { tight: "-0.025em" },
   };
   const { css } = generate(theme);
   const compiled = await compileFixtureCss(css, []);

   expect(compiled).toMatch(/--sg-tracking-tight:\s*-0\.025em/);
   expect(compiled).toMatch(
     /\.tracking-tight\s*\{[^}]*var\(--sg-tracking-tight\)/,
   );
   ```

## `git diff --stat` in the worktree (exactly 3 files)

```
 src/core/themeSchema.ts                     |  1 +
 src/features/registry/builtInCategories.ts  | 19 +++++++++++++++++
 src/features/registry/letterSpacing.test.ts | 33 +++++++++++++++++++++++++++++
 3 files changed, 53 insertions(+)
```

(The new test file is untracked by `git`, so it does not appear under plain
`git diff --stat` — `git add -N` (intent-to-add, no content staged) was used
to make it show up for this capture, then `git reset` immediately after to
restore the plain untracked state before removing the worktree.)

## Test run (`yarn vitest run src/features/registry/letterSpacing.test.ts`)

```
 RUN  v4.0.18 ~/workspace/duydpdev/sg-letterspacing-proof

 ✓ src/features/registry/letterSpacing.test.ts (1 test) 35ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
Type Errors  no errors
   Start at  10:02:44
   Duration  302ms (transform 65ms, setup 0ms, import 186ms, tests 35ms, environment 0ms)
```

## Note on the compiled shape

`@theme inline` **inlines** the referenced `--sg-*` value directly into each
consuming utility rule rather than re-declaring the namespaced variable
(`--tracking-tight`) standalone — the same pattern the existing
`.bg-primary { background-color: var(--sg-primary); }` assertion in
`src/__integration__/tailwind-compile.test.ts` already relies on. The
compiled `.tracking-tight` rule is:

```css
.tracking-tight {
  --tw-tracking: var(--sg-tracking-tight);
  letter-spacing: var(--sg-tracking-tight);
}
```

## Outcome

- Worktree removed via `git worktree remove ../sg-letterspacing-proof --force`
  after capturing the evidence above.
- Nothing was committed in the worktree; `letterSpacing` does not exist on
  `feat/v4-dev-5` outside this proof document.
