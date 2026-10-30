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

The plan's Task 5 line assumed Tailwind **4.3.0 [UNVERIFIED until the PoC
ran]**. Running the PoC required first checking what's actually resolved.

**Initial state (as found when the PoC was first run).** Root
`node_modules/tailwindcss` was **4.2.1**, while `@tailwindcss/node` (which
`compileFixtureCss.ts`, every integration/e2e test and this PoC import
`compile` from) required `tailwindcss@4.2.4` and had a nested copy of it. The
compiled banner reported `tailwindcss v4.2.4`, but the `@import "tailwindcss"`
CSS files (`theme.css`, `preflight.css`, `utilities.css`) were loaded from the
root **4.2.1** copy — so the suite ran a 4.2.4-engine / 4.2.1-CSS hybrid that
no consumer ships, while the examples built on 4.3.0. (The earlier version of
this paragraph wrongly said the root copy was never used by `compile()`.)

**Current state (fixed).** Root devDependencies `tailwindcss` and
`@tailwindcss/node` are pinned to exactly **4.3.0**, matching the examples and
site. Verified: `compile('@import "tailwindcss"')` prints
`/*! tailwindcss v4.3.0 | ... */`, its `onDependency` callback reports
`node_modules/tailwindcss/index.css`, `node_modules/tailwindcss/package.json`
is 4.3.0, no `node_modules/@tailwindcss/node/node_modules/tailwindcss` exists,
and `yarn why tailwindcss` lists only 4.3.0.

**Actual engine version exercised by this repo's compiled-CSS tests: Tailwind
v4.3.0** (the PoC below was re-run on the unified 4.3.0 install and produced the
identical output; the mechanism does not depend on the version).

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
disposition rule ("PASS: propose considering for the 4.1 minor"). Concretely, this
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
- The PoC was first run on a skewed install (root `tailwindcss@4.2.1` beside a
  nested `@tailwindcss/node`-owned `4.2.4` engine). That skew is resolved:
  root `tailwindcss` and `@tailwindcss/node` are now both pinned to `4.3.0`,
  the same version the examples and site resolve, so `compile()` runs one
  engine against that same engine's own `index.css`/`theme.css`/`utilities.css`.
  The peer floor (`tailwindcss >=4.1.0`) is still not exercised by any
  in-repo test.
