# Deployment & CI/CD

Quy trình deploy thư viện `fe-style-generator`.

## Mục lục

- [Deployment \& CI/CD](#deployment--cicd)
  - [Mục lục](#mục-lục)
  - [CI/CD Overview](#cicd-overview)
  - [GitHub Actions Workflows](#github-actions-workflows)
    - [`ci.yml` — PR Check](#ciyml--pr-check)
    - [`release.yml` — Semantic Release Orchestrator](#releaseyml--semantic-release-orchestrator)
    - [`deploy.yml` — Build \& Publish](#deployyml--build--publish)
    - [`back-merge.yml` — Back-merge](#back-mergeyml--back-merge)
  - [Branching Strategy](#branching-strategy)
  - [Release Process](#release-process)
    - [Quy trình đúng](#quy-trình-đúng)
  - [Commit Format](#commit-format)
    - [Config](#config)

---

## CI/CD Overview

```mermaid
flowchart TD
    PR["Pull Request → main/develop"] --> CI["ci.yml\nLint + Build Check"]
    CI -->|Pass| Merge["Merge vào main/develop"]
    Merge --> Release["release.yml\nSemantic Release"]
    Release -->|New tag created| Deploy["deploy.yml\nBuild & Publish to npm"]
    Release -->|Stable tag trên main| BackMerge["back-merge.yml\nBack-merge main → develop"]
```

---

## GitHub Actions Workflows

### `ci.yml` — PR Check

**Trigger:** Pull Request vào `main` hoặc `develop`

**Các bước:**

1. Checkout code
2. Setup Node.js 20 + Yarn cache
3. `yarn install --immutable`
4. `yarn lint` — ESLint check
5. `yarn build` — TypeScript compile + Vite build

> PR chỉ được merge nếu CI pass toàn bộ.

---

### `release.yml` — Semantic Release Orchestrator

**Trigger:** Push vào `main` hoặc `develop`

**Các bước:**

1. Chạy `semantic-release` → tự động tăng version, tạo git tag, cập nhật CHANGELOG
2. So sánh tags trước/sau để phát hiện tag mới
3. Nếu có tag mới → trigger `deploy.yml`
4. Nếu tag stable (không có `-`) và ở `main` → trigger `back-merge.yml`

---

### `deploy.yml` — Build & Publish

**Trigger:** Được gọi từ `release.yml` (workflow_call) khi có release mới

**Các bước:**

1. Checkout tại tag mới
2. `yarn build` → sinh `dist/`
3. Publish lên GitHub Packages (npm registry)

---

### `back-merge.yml` — Back-merge

**Trigger:** Được gọi từ `release.yml` sau stable release trên `main`

**Mục đích:** Tự động merge code từ `main` về `develop` sau mỗi stable release, đảm bảo `develop` luôn có đủ commit từ `main`.

---

## Branching Strategy

| Branch      | Mục đích                                         |
| ----------- | ------------------------------------------------ |
| `main`      | Stable releases. Mọi push → trigger release flow |
| `develop`   | Development. Pre-release versions (DEV suffix)   |
| `feature/*` | Feature branches → mở PR vào `develop`           |
| `hotfix/*`  | Hotfix → PR vào cả `main` và `develop`           |

---

## Release Process

> [!IMPORTANT]
> Dự án dùng **semantic-release** — version được tự động tính từ commit messages. **Không cần** tự tay chỉnh `package.json`.

### Quy trình đúng

1. Code thay đổi trên feature branch
2. Commit theo format `[type] subject` (xem bên dưới)
3. Mở Pull Request vào `develop` (pre-release) hoặc `main` (stable release)
4. CI check pass → merge PR
5. `release.yml` tự động:
   - Tính version mới
   - Tạo git tag (`v1.2.3`)
   - Cập nhật `CHANGELOG.md`
   - Trigger `deploy.yml` để publish lên npm

---

## Commit Format

Commit message format: `[type] subject`

| Type                        | Version bump    | Ví dụ                                      |
| --------------------------- | --------------- | ------------------------------------------ |
| `feat`                      | Minor (`1.1.0`) | `[feat] add multi-theme support`           |
| `fix`                       | Patch (`1.0.1`) | `[fix] correct spacing var fallback`       |
| `perf`                      | Patch (`1.0.1`) | `[perf] improve safelist generation`       |
| `docs`, `chore`, `refactor` | Không bump      | `[docs] update architecture guide`         |

### Config

Xem: [`commitlint.config.ts`](commitlint.config.ts) và [`release.config.cjs`](release.config.cjs)
