# Publishing guards and release flow

Always loaded (no `paths`): a publish can start from a session that never reads a build file. Never add an `NPM_TOKEN` secret and never keep an `npmScopes.duydpdev` block in `.yarnrc.yml`; npm publishing uses trusted publishing (OIDC).
Whether a change warrants a release PR at all: `documents/deploy.md` → Release cadence.

## Release flow

`[conf]` `[temp]` `[wip]` are valid, no release. Features are cut from `develop` and land once, as a merge commit (never squash), through a PR into `develop`; a merge into `develop` publishes nothing.
A stable release is one PR `develop` → `main` (merge commit): semantic-release computes ONE version from every commit header that PR adds, Deploy publishes it to **npmjs.org** (public, scope `@duydpdev`, npm trusted publishing: no token secret)
and the back-merge returns `main` to `develop`. A DEV pre-release is cut only by hand: `gh workflow run release.yml --ref develop`. Hotfixes (`fix/<slug>`, `docs/<slug>`) are cut from `main` and go straight into `main`.
`[release]` (major) commits enter `develop` only while the repo variable `MAJOR_CYCLE` is `open`; CI fails a PR into `develop` that carries one otherwise.
The `no-delete` ruleset keeps GitHub from deleting `develop` after the release PR merges. Details: `documents/deploy.md`.

## Guards

- `yarn check:publish-target` (`prepublish` + `deploy.yml`) locks the registry to `registry.npmjs.org` and `access: public`; `deploy.yml` also runs `yarn npm publish --dry-run` and asserts `Package would be published to https://registry.npmjs.org`, then publishes with `--provenance` through npm trusted publishing (OIDC, `id-token: write`, no `NPM_TOKEN`).
  Yarn Berry runs `prepublish`, not `prepublishOnly`, on `yarn npm publish`.
- `yarn check:externals` fails if any `dist/**/*.map` lists a peer/dependency under `node_modules/` (or a JS file ships without a map) or any entry but `./ui` reaches a UI peer;
  `yarn check:sizes` enforces gzip budgets incl. the `cli` bundle (`scripts/check-sizes.mjs`); `yarn check:browser-safe` keeps browser subpaths free of Node/Zod.
  Negative controls: `src/__integration__/publish-gates.test.ts`.
- `yarn check:types-pack` (`scripts/check-types-pack.mjs`; CI after `build:all`, and `deploy.yml` before publish) packs the package and runs
  `@arethetypeswrong/cli --profile node16` on the tarball, so every subpath must resolve to `.d.ts` under `import` and `.d.cts` under `require`.
- The package is public on npmjs.org: consumers need no token or scope config. 7.2.0 is the first npm release and 8.0.0 the first npm major; versions up to 7.1.1 exist only on GitHub Packages (npm holds 1.7–3.0).
- The site is deployed by `deploy-site.yml` (GitHub Pages, base `/style-generator/`, `404.html` copy of `index.html` as the SPA fallback, `llms.txt` built from `site/src/lib/docs-meta.json` by `site/scripts/build-llms.mjs`); its deploy job runs only from `main` and holds the only `pages: write` / `id-token: write` permissions of that workflow.
