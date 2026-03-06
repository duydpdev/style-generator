# Project Plan: style-generator-refactor

## 🎯 Overview

Refactor kiến trúc thư viện `fe-style-generator` sang mô hình Feature-Based (Option A) và nâng cấp hệ thống TypeScript Inference (Zero-CSS Configuration engine). Mục tiêu giúp Developer dùng Tailwind chỉ cần truyền `theme.json/theme.ts` vào là thư viện tự động gen CSS Variables, Spacing và Type inference chính xác 100% giúp IDE gợi ý class, không cần gõ CSS/Tailwind tay.

## 📱 Project Type

**WEB/BACKEND (Library)**

## ✅ Success Criteria

1. Toàn bộ logic thư mục chia theo Feature: plugin, safelist, spacing, tokens, cva.
2. Hàm `createStyleSystem` tự động trả được generic Object Tokens khớp 100% với `theme.ts` user truyền vào.
3. Hỗ trợ Utility mapping dùng cùng thư viện `CVA` (hoặc độc lập) map data Type-safe thẳng ra chuỗi class.
4. Pass 100% Linter & TSC check sau refactor. Không lỗi logic plugin sinh CSS hiện tại.

## 🛠 Tech Stack

- Typescript, Node.js (CLI tool + Core Builder)
- Tailwind CSS v3 / v4 (Plugin engine)

## 📂 File Structure (Expected)

```text
src/
├── core/             # Base config & types
├── features/
│   ├── plugin/       # Plugin logic & Variables
│   ├── safelist/     # Safelist generation
│   ├── spacing/      # Spacing constants & responsive engine
│   ├── tokens/       # Design Token generation & Types Inference
│   └── cva/          # Variant Mapper Utils (NEW)
├── cli/              # CLI Tool (Giữ nguyên)
├── shared/           # Utils dùng chung
└── index.ts          # Public API Exposure
```

## 📋 Task Breakdown

### [x] Task 1: Refactor Structure - Core & Plugin

- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Input**: Source file ở `src/factories`, `src/utils`.
- **Output**: Thư mục `src/core`, `src/features/plugin`, `src/shared` hoàn chỉnh, CLI code trỏ đúng path.
- **Verify**: Chạy TS Build không báo lỗi Cannot find module ở các file plugin.

### [x] Task 2: Refactor Structure - Safelist & Spacing

- **Agent**: `backend-specialist`
- **Skill**: `clean-code`
- **Input**: Code Spacing và Safelist nằm rải rác.
- **Output**: Gom nhóm thành công vào `features/safelist` và `features/spacing`.
- **Verify**: `yarn tsc` pass.

### [x] Task 3: Upgrade TypeScript Inference Engine

- **Agent**: `backend-specialist`
- **Skill**: `typescript-patterns` / `clean-code`
- **Input**: Hàm `createDesignTokens.ts`, type `inference.ts`.
- **Output**: Export được `InferDesignTokens<T>` bắt chặt literal objects từ theme.
- **Verify**: Tạo file `.test.ts` giả lập, hover chuột thấy Type xổ ra chính xác các keys.

### [x] Task 4: CVA Variant Mapper Utility

- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Input**: Module `features/cva/` (mới).
- **Output**: Hàm `createVariantMapper` tự động ghép tokens với postfix (vd `bg-`, `border-`).
- **Verify**: Viết test/example chạy thành công component button xài Variant Mapper.

### [x] Task 5: Cập nhật docs & Final Verification

- **Agent**: `orchestrator`
- **Skill**: `documentation-templates`
- **Input**: README.md, `architecture.md`.
- **Output**: Documents phản ánh đúng cấu trúc và cách dùng Zero-CSS Type mới.
- **Verify**: Build project thành công ra file js/cjs/d.ts ở folder `dist`.

---

## ✅ PHASE X COMPLETE

- [x] Lint: Clean
- [x] Typescript Build: Passed
- [x] Logic/Test: Working Example
- Date: 2026-03-06
