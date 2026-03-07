# Project Plan: CI Pipeline & DesignTokens Type Tests

## 🎯 Overview

Thiết lập hệ thống CI/CD 2 lớp cho project:

- **Lớp 1 (Local)**: Husky pre-commit chạy lint-staged + tsc + test trước mỗi commit.
- **Lớp 2 (Remote)**: GitHub Actions CI đơn giản (1 job: lint → build → test) trên push/PR.

Đồng thời bổ sung type tests chứng minh `DesignTokensWeb` map chính xác từ theme config.

## 📱 Project Type

LIBRARY (Node.js / TypeScript)

## ✅ Success Criteria

1. Husky pre-commit chạy: `lint-staged` + `tsc --noEmit` + `vitest run` trước mỗi commit.
2. Có `.github/workflows/ci.yml` — 1 job đơn giản: lint → build → test (không tách matrix để tránh tốn phút).
3. Type tests xác nhận `DesignTokensWeb` mapping đúng với theme truyền vào (flat + nested + DEFAULT).
4. Unit tests bổ sung cho `createDesignTokens` với nested base colors.

## 📋 Task Breakdown

### [x] Task 1: Cập nhật Husky pre-commit hook

- **Agent**: `backend-specialist`
- **Input**: `.husky/pre-commit`
- **Output**: Hook chạy tuần tự: `lint-staged` → `tsc --noEmit` → `vitest run`.
- **Verify**: Stage 1 file TS, commit → hook chạy đủ 3 bước.

### [x] Task 2: Tạo GitHub Actions CI (đơn giản)

- **Agent**: `backend-specialist`
- **Input**: `.github/workflows/ci.yml` (NEW)
- **Output**: 1 job duy nhất, chạy trên push/PR vào `main`/`develop`:
  1. `yarn lint`
  2. `yarn build:all`
  3. `yarn test`
- **Verify**: CI syntax valid (`actionlint` hoặc push thử).

### [x] Task 3: Bổ sung Type Tests cho DesignTokens mapping

- **Agent**: `backend-specialist`
- **Input**: `src/core/inference.test-d.ts`
- **Output**: Thêm test cases:
  - `variantColor` chứa union đầy đủ 3 buckets (base + text + common).
  - `variantBaseColor` không tồn tại trên interface (by design).
  - Edge case: theme chỉ có `base`, không có `text`/`common`.
- **Verify**: `yarn test:types` pass.

### [x] Task 4: Bổ sung Unit Tests cho nested base colors

- **Agent**: `backend-specialist`
- **Input**: `src/features/tokens/createDesignTokens.test.ts`
- **Output**: Test case chứng minh `variantColor` chứa nested keys (vd: `blue-500`).
- **Verify**: `yarn test` pass.
