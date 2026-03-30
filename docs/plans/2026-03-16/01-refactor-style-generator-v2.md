# Project Plan: Refactor & Clean Code — style-generator v2

## 🎯 Overview

Refactor `@duydpdev/style-generator` v2.0.0: gộp 3 color namespaces (base/text/common) thành 1 flat `colors` object, tận dụng Tailwind v4 `@theme` auto-generation, loại bỏ các option phức tạp không cần thiết.

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. `ThemeConfig.colors` là flat `Record<string, string | Record<string, string>>` — không còn base/text/common
2. `Options` đơn giản hơn: xóa `colorNamingMode`, `disableColorPrefix`, `enableCssVariables`; thêm `safelistColors`, `tailwindVersion`
3. `generateThemeCss()` tạo CSS string với `@theme inline` cho Tailwind v4
4. V3/V4 plugin auto-detect qua `detectTailwindVersion()`
5. Safelist colors là optional (default OFF)
6. `createStyleSystem()` trả về `themeCss` thêm vào return object
7. `yarn tsc --noEmit` pass
8. `yarn test` — tất cả tests pass
9. `yarn build:all` — build thành công
10. `yarn lint` — không có lỗi/warning

## 📋 Task Breakdown

### [x] Task 1: Phase 1 — New Type System

- **Agent**: N/A (library code)
- **Input**: `src/core/ThemeConfig.ts`, `src/core/Options.ts`, `src/core/inference.ts`, `src/core/defineTheme.ts`
- **Output**: Flat colors type, simplified options, updated inference
- **Verify**: `yarn tsc --noEmit`

### [x] Task 2: Phase 2 — Tailwind Version Detection & CSS Generation

- **Agent**: N/A
- **Input**: `src/shared/`, `src/features/`
- **Output**: `detectTailwindVersion.ts`, `generateThemeCss.ts`, test file
- **Verify**: `yarn test` — 6 new tests pass

### [x] Task 3: Phase 3 — Simplify Plugin

- **Agent**: N/A
- **Input**: `src/features/plugin/createStylePlugin.ts`, `src/features/plugin/cssVariables.ts`
- **Output**: Simplified plugin with v3/v4 split, simplified cssVariables (2-param)
- **Verify**: `yarn test` — plugin tests pass

### [x] Task 4: Phase 4 — Safelist Simplification

- **Agent**: N/A
- **Input**: `src/features/safelist/generateSafelist.ts`
- **Output**: Colors optional (safelistColors flag), flat input
- **Verify**: `yarn test` — safelist tests pass

### [x] Task 5: Phase 5 — Design Tokens Update

- **Agent**: N/A
- **Input**: `src/features/tokens/createDesignTokens.ts`
- **Output**: Removed variantBaseColor/TextColor/CommonColor, flat variantColor
- **Verify**: `yarn test` — tokens tests pass

### [x] Task 6: Phase 6 — Core Factory + Public API

- **Agent**: N/A
- **Input**: `src/core/createStyleSystem.ts`, `src/core/factories.index.ts`, `src/index.ts`
- **Output**: `themeCss` in return, new exports
- **Verify**: `yarn tsc --noEmit`

### [x] Task 7: Phase 7 — CLI Updates

- **Agent**: N/A
- **Input**: `src/cli/templates.ts`, `src/cli/commands/doctor.ts`
- **Output**: Flat color templates, v1→v2 migration warning in doctor
- **Verify**: `yarn build:cli`

### [x] Task 8: Phase 8 — Examples

- **Agent**: N/A
- **Input**: `examples/theme.json`, `examples/shadcn-theme.json`
- **Output**: Flat color format
- **Verify**: Manual review

### [x] Task 9: Phase 9 — Type Tests & Integration

- **Agent**: N/A
- **Input**: `src/core/inference.test-d.ts`, `src/features/plugin/cssVariables.test.ts`
- **Output**: Updated type tests for flat structure
- **Verify**: `yarn test` — type tests pass (no errors)
