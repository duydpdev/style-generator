# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@duydpdev/style-generator` is a TypeScript library + CLI tool that generates Tailwind CSS utilities (plugin, safelist, design tokens) from a theme configuration JSON file. Supports Tailwind CSS v3 and v4, with CSS variables for colors, typography, shadows, and spacing.

## Package Manager

Use **Yarn Berry (v4)** exclusively. Never use `npm` or `npx` directly.

```bash
yarn install
yarn add <package>
```

## Common Commands

```bash
# Development
yarn build          # Vite library build (ESM + CJS + types)
yarn build:cli      # Bundle CLI tool with tsdown
yarn build:all      # Both builds

# Testing
yarn test           # Run Vitest once
yarn test:watch     # Vitest in watch mode
yarn test:coverage  # Coverage report
yarn test:types     # Type-checking tests (*.test-d.ts)

# Run a specific test file
yarn vitest run src/features/plugin/cssVariables.test.ts

# Code quality
yarn lint           # ESLint check
yarn lint:fix       # ESLint auto-fix
yarn prettier       # Prettier check
yarn prettier:fix   # Prettier auto-fix
yarn tsc --noEmit   # Type check without emitting
```

## Commit Convention

Custom format: `[type] subject`

- `[feat] add dark mode support` → minor release
- `[fix] correct token generation` → patch release
- `[perf]`, `[style]`, `[refactor]` → patch release
- `[chore]`, `[docs]`, `[test]`, `[build]`, `[ci]` → no release

Commits to `main`/`develop` trigger automated Semantic Release. A new tag triggers the deploy workflow to publish to GitHub Packages.

## Architecture

### Core Flow

`theme.json` → `createStyleSystem(themeConfig, options)` → `{ plugin, safelist }`

The main factory (`src/core/createStyleSystem.ts`) composes:

1. **tokens** (`src/features/tokens/`) — converts raw theme JSON into typed design tokens
2. **plugin** (`src/features/plugin/`) — generates Tailwind plugin with CSS variables
3. **safelist** (`src/features/safelist/`) — builds the class safelist from custom tokens only

### Source Layout

- `src/core/` — Main factory (`createStyleSystem`), types (`ThemeConfig`, `Options`), TypeScript inference utilities
- `src/features/plugin/` — CSS variable generation for Tailwind plugin (v3 + v4 compatible)
- `src/features/safelist/` — Safelist generation logic
- `src/features/tokens/` — Design token creation and type inference
- `src/features/cva/` — CVA (Class Variance Authority) helper utilities
- `src/features/spacing/` — Spacing CSS variable resolution
- `src/shared/` — Default options, helpers, safelist property definitions
- `src/cli/` — CLI commands (`init`, `safelist`, `doctor`), config resolution, templates
- `src/index.ts` — Public API exports
- `examples/` — Sample theme configs and usage examples

### Key Exports (public API)

```typescript
createStyleSystem(); // Main: returns { plugin, safelist }
createStylePlugin(); // Tailwind plugin only
generateSafelist(); // Safelist string[] only
createDesignTokens(); // Type-safe design tokens
createVariantMapper(); // Map tokens to CSS classes
resolveSpacingProps(); // Convert spacing props to CSS variables
getCssVariables(); // CSS variable output
Breakpoint; // Enum: MD, LG, etc.
```

### CLI Tool (`style-gen`)

Built separately via `tsdown` into `dist/cli/index.mjs`. Commands: `init`, `safelist`, `doctor`.

### Build Outputs

- `dist/` — Library (ESM `.js`, CJS `.cjs`, TypeScript declarations `.d.ts`)
- `dist/cli/index.mjs` — CLI executable

## Testing Approach

- Unit tests: Vitest with Node environment (`*.test.ts`)
- Type tests: Vitest typecheck (`*.test-d.ts`) — use `expectTypeOf` for type assertions
- Coverage: v8 provider, excludes test files and `dist/`

## Release Workflow

1. PRs merge to `develop` (pre-release with `DEV` tag) or `main` (stable)
2. Semantic Release creates version tag + updates `CHANGELOG.md`
3. Tag triggers deploy to GitHub Packages (private registry)
4. Stable releases on `main` trigger back-merge to `develop`
