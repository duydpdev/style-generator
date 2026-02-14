# BE Spec Template – Agent Guide

## Big picture

- **Project Type**: Node.js library generating TypeScript types and client SDK from OpenAPI specs.
- **Package Manager**: **Yarn Berry (v4)**. Use `yarn install`, `yarn add`, `yarn build`. Do NOT use `npm`.
- **Workflow**: Release -> Tag -> Deploy.

## Source layout

- `src/`: Source code.
- `dist/`: Generated output.
- `.github/workflows/`:
  - `release-tag.yml`: Semantic Release (Create Tag).
  - `deploy.yml`: Build & Publish Package.

## Commit Convention

We use a **custom commit format**:

> `[type] subject`

Examples:

- `[feat] add user login endpoint`
- `[fix] correct response schema`
- `[chore] update dependencies`
- `[docs] update readme`

**Types**:

- `feat`: New feature (Minor release).
- `fix`: Bug fix (Patch release).
- `perf`: Performance improvement (Patch release).
- `chore`, `docs`, `style`, `refactor`, `test`: No release (or Patch if configured).

## Release Process

- **Automated**: Commits to `main`/`develop` trigger `release-tag.yml`.
- **Versioning**: Semantic Release parses the commit message (e.g. `[feat]`) to determine the next version.
- **Publishing**: A new tag triggers `deploy.yml` to publish to GitHub Packages.

## Environment Variables

- `CI_WORKER_REPOSITORY_TOKEN`: Authentication token.
- `CI_SERVICE_REPOSITORY_NPM_PUBLIC_URL`: Registry URL.
