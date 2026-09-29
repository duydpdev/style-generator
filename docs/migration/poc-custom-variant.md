# PoC: `@custom-variant` for the D7 state-palette problem

## Question

DEV.6 Task 4 (state palette) closes AC10 by having `createVariantMapper(prefix,
tokens, { states })` chain `hover:`/`active:` classes onto flat sibling
tokens (`primaryHover`/`primaryActive`) at the CALL SITE — no Tailwind config
changes involved. This PoC asks a separate, forward-looking question: could a
FUTURE minor instead register a real Tailwind v4 variant
(`@custom-variant state-hover (&:hover)`) so a component author could write
plain `state-hover:bg-primary-hover` directly, without going through
`createVariantMapper`'s `{ states }` option at all? This is D7's option (b)
from the original plan; this document is the PoC gate the plan said must
exist (Success Criteria 5 / Task 5) before that option is ever pursued.

This PoC is **independent of runtime code** — it does not touch `src/` (`!
git grep -nE "@custom-variant" -- src` stays empty) and is **not** part of
`yarn build:all` or the Gate.

## Method

A throwaway script (`src/__integration__/__tmp_custom_variant_poc.test.ts`,
written then deleted — not committed) called the same
`@tailwindcss/node` `compile()` entry point `compileFixtureCss.ts` uses
elsewhere in this repo, with input:

```css
@import "tailwindcss";
@custom-variant state-hover (&:hover);

.composite-primary {
  @apply bg-blue-500 state-hover:bg-blue-700;
}
```

`result.build([])` was called with an **empty candidate list** — the same
empty-candidate proof style `cva-roundtrip.test.ts` uses — since
`.composite-primary` is a hand-authored selector (not a scanned utility
class), its `@apply` body is the only thing under test.

## Installed Tailwind version (verified, not assumed)

The plan's Task 5 line assumed Tailwind **4.3.0 [UNVERIFIED cho tới khi PoC
chạy]**. Running the PoC required first checking what's actually resolved:

- `node_modules/tailwindcss/package.json` (the direct project dependency):
  **4.2.1**.
- `@tailwindcss/node`'s **own** `package.json` depends on `tailwindcss@4.2.4`
  and Yarn's node-modules linker nested a second copy at
  `node_modules/@tailwindcss/node/node_modules/tailwindcss` (**4.2.4**) to
  satisfy it, since 4.2.1 doesn't satisfy `@tailwindcss/node`'s own `4.2.4`
  requirement.
- `compileFixtureCss.ts` (and every integration/e2e test built on it, plus
  this PoC) imports `compile` from `@tailwindcss/node`, which resolves the
  **nested 4.2.4** copy — confirmed directly from the compiled output's own
  banner comment: `/*! tailwindcss v4.2.4 | MIT License | ... */`.

**Actual engine version exercised by this repo's compiled-CSS tests: Tailwind
v4.2.4** (not 4.3.0, and not the root project's declared 4.2.1 either — that
copy is never the one `compile()` runs).

## Result: PASS

The compiled output (full `@layer theme`/`base` boilerplate elided) contains:

```css
@layer utilities;
.composite-primary {
  background-color: var(--color-blue-500);
  &:hover {
    background-color: var(--color-blue-700);
  }
}
```

`@custom-variant state-hover (&:hover)` registered a real Tailwind variant:
`state-hover:bg-blue-700` inside the `@apply` resolved to a nested `&:hover {
background-color: var(--color-blue-700); }` block, exactly like a built-in
`hover:` variant would. No warnings or errors were emitted during `compile()`
or `result.build([])`.

## Recommendation

**PASS → worth considering for a future 4.1 minor**, per the plan's own
disposition rule ("PASS: đề xuất cân nhắc cho 4.1 minor"). Concretely, this
opens the door to a `createStyleSystem`/`generate()` option that emits one
`@custom-variant <state>-hover (&:hover)` (etc.) per `descriptor.states`
entry, self-documenting the intent (`state-hover:` reads clearly at the call
site) instead of a bare `hover:`/`active:` that a component author might
mistake for a generic Tailwind pseudo-class variant unrelated to the theme's
sibling-token convention.

This is explicitly **not** adopted in DEV.6: Task 4 ships `createVariantMapper(
prefix, tokens, { states })`'s call-site class-string chaining (D7 option
(a)) as the only mechanism. Nothing in `src/` registers a `@custom-variant`
— confirmed by `! git grep -nE "@custom-variant" -- src` staying empty — and
this PoC is not wired into `yarn build:all` or any CI gate.

## Caveats

- This PoC only proves the mechanism compiles correctly in isolation. It does
  NOT prove a `@custom-variant`-per-state option would compose cleanly with
  the multi-axis `themeAxes` selectors DEV.6 Task 1–3 add (untested here —
  out of scope for this PoC).
- The nested-dependency version skew above (root `tailwindcss@4.2.1` vs. the
  `@tailwindcss/node`-resolved `4.2.4` actually driving every compiled-CSS
  test in this repo) is itself worth a follow-up: `yarn.lock`/`package.json`
  currently under-declare the effective engine version consumers' own
  `@tailwindcss/postcss`/CLI setups will resolve, which could differ from
  what this repo's own test suite exercises.
