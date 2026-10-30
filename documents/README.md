# Documents

Mục lục toàn bộ tài liệu của `@duydpdev/style-generator`. Tra cứu API, option và CLI nằm ở [`README.md`](../README.md) của repo; quy ước cho agent nằm ở [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## Tài liệu sống (hiển thị trên site `/docs`)

| File                                   | Nội dung                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| [`architecture.md`](./architecture.md) | Kiến trúc 4.0.0: data flow, registry, `themeAxes`, spacing, exports, site    |
| [`guide.md`](./guide.md)               | Hướng dẫn tích hợp từng bước (tiếng Việt), link sang README cho bảng tra cứu |
| [`testing.md`](./testing.md)           | Các lớp test, vì sao tồn tại, chạy ở đâu                                     |
| [`deploy.md`](./deploy.md)             | Git flow (feature cắt từ `main`), CI, release, publish GitHub Packages       |

Site render mọi file `documents/*.md` cấp cao nhất trừ file này (`site/src/lib/docs-content.ts`).

## Standards (không hiển thị trên site)

| File                                                               | Nội dung                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [`standards/git-workflow-app.md`](./standards/git-workflow-app.md) | Chuẩn git cho app có 4 nhánh môi trường (`develop` → `staging` → `pre-release` → `release`), dùng cho team |

## Migration

| File                                                                                       | Nội dung                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md)                                     | Breaking changes 3.x → 4.0.0 và runbook rollback                |
| [`migration/4.0-to-4.1.md`](./migration/4.0-to-4.1.md)                                     | Validation siết chặt ở 4.1.0 (options, config, biến CSS, ngoặc) |
| [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md)                   | Lịch sử subpath exports của 3.x                                 |
| [`migration/v4-ac4-letterspacing-proof.md`](./migration/v4-ac4-letterspacing-proof.md)     | Bằng chứng thêm một category chạm đúng 3 file                   |
| [`migration/v4-schema-autocomplete-proof.md`](./migration/v4-schema-autocomplete-proof.md) | Bằng chứng `theme.schema.json` từ chối key lạ (AC6)             |
| [`migration/poc-custom-variant.md`](./migration/poc-custom-variant.md)                     | PoC `@custom-variant` cho state palette                         |

## Local notes (not published)

`documents/plans/` and `documents/brainstorm/` are git-ignored local working directories (plans, reports, journals, brainstorm). Rules: `.claude/rules/validation.md` (Plan layout).
