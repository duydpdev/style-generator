# Lessons Learned

> **Self-Improvement Loop:** File này ghi lại lỗi đã mắc, các lần user sửa, và pattern riêng của project. **Đọc lại ở đầu mỗi session.**

Khi user sửa một lỗi:

1. Xác định pattern hoặc nguyên nhân gốc.
2. Thêm một mục mới ở cuối file: ngày, bối cảnh/lỗi, rule mới.

Mục cũ bị rule mới thay thế thì sửa hoặc gộp tại chỗ, không để hai rule mâu thuẫn cùng tồn tại.

---

### [2026-03-07 → 2026-09-29] - Luôn lập plan vật lý trước khi code, đúng layout

- **Mistake (lặp lại 2026-03-07, 03-08, 03-13, 03-16):** code khi chưa có file plan; đặt plan sai thư mục; quên tick `[x]`; user đưa plan trong prompt thì bỏ qua bước tạo file.
- **New Rule:**
  1. Mọi task không tầm thường phải có plan directory `documents/plans/YYYY-MM-DD/<plan-slug>/` gồm `plan.md` + `phase-NN-<name>.md`, theo template trong `.claude/rules/validation.md`, TRƯỚC khi code. Không có `task.md` theo ngày.
  2. User đưa plan inline ("Implement the following plan") vẫn phải materialize plan directory ở bước đầu tiên.
  3. Xong task nào tick `[x]` ngay trong phase file và cập nhật cột Status của `plan.md` trong cùng thay đổi, trước khi báo cáo.

### [2026-03-07] - Không bao giờ thực thi mã khi chưa được approve plan

- **Mistake (lặp lại 2026-03-08):** tự nhảy sang implementation khi user chưa duyệt; gộp giải thích lỗi + fix vào cùng một lượt.
- **New Rule:** DỪNG LẠI CHỜ DUYỆT sau khi nộp plan ("ok", "duyệt", "triển khai" hoặc tương đương). `[ ] Task` chỉ chuyển `[x]` sau khi user đã đồng ý plan và gate đã exit 0.

### [2026-03-07] - Đa nền tảng & test tự động

- **Mistake:** chỉ fix cho macOS và không phát hiện project thiếu test.
- **New Rule:** script và code phải chạy trên Linux, Windows, macOS (script Node, không phụ thuộc shell riêng của một OS). Hàm mới phải có test chứng minh hành vi.

### [2026-03-07] - Không dùng đường dẫn tuyệt đối trong docs

- **Mistake:** dùng `file://` + đường dẫn máy cá nhân trong README/plan — lộ cấu trúc thư mục cá nhân, hỏng link trên máy khác.
- **New Rule:** mọi liên kết trong tài liệu git của project dùng **đường dẫn tương đối**.

### [2026-03-07] - Gate trước khi báo hoàn thành

- **Mistake:** không đọc hướng dẫn skill liên quan trước khi làm và báo hoàn thành khi chưa chạy gate kiểm tra.
- **New Rule:** TUYỆT ĐỐI không đánh dấu task hoàn thành khi gate trong `.claude/rules/validation.md` chưa exit 0. Đọc skill phù hợp của runtime trước bước implementation.

### [2026-03-09] - Chú ý script trên môi trường ESM

- **Mistake:** chạy script `.js` dùng `require()` trong project `"type": "module"` → `ReferenceError: require is not defined in ES module scope`.
- **New Rule:** trước khi tạo script Node, kiểm `package.json`. ESM thì dùng `import` hoặc đuôi `.cjs`.

### [2026-06-07] - CI token hết hạn + reusable workflow permissions + GitHub Packages

- **Mistake/Context:** Release CI fail vì PAT `CI_WORKER_REPOSITORY_TOKEN` hết hạn (checkout "could not read Username") và npm publish 404 do `NPM_TOKEN` hết hạn. Khi chuyển sang GitHub Packages, suýt bỏ sót `packages: write` ở caller workflow.
- **New Rule:**
  1. Ưu tiên `GITHUB_TOKEN` built-in (tự hết hạn theo job, không cần xoay tay) thay PAT/npm-token có hạn cho CI publish/checkout. Nếu buộc dùng PAT → đặt expiry dài + lịch nhắc gia hạn.
  2. **Reusable workflow (`workflow_call`)**: token permissions ⊆ caller. Muốn job con (vd `deploy.yml`) có `packages: write` thì PHẢI khai quyền đó ở **caller** (`release.yml` top-level `permissions`), không chỉ ở file con.
  3. Yarn Berry auth lấy từ `.yarnrc.yml` (`npmScopes.<scope>.npmAuthToken` interpolate env), KHÔNG từ `.npmrc` mà `setup-node registry-url` tạo. Set đúng env `YARN_NPM_AUTH_TOKEN`.
  4. GitHub Packages trên private repo: chỉ collaborator/được-grant cài được, kể cả có PAT `read:packages` → muốn share người lạ phải invite hoặc dùng org.

### [2026-06-07] - Example workspace KHÔNG được có `postinstall` build hook

- **Mistake:** Thêm `"postinstall": "nuxt prepare"` vào `examples/nuxt-v4/package.json`. CI `yarn install --immutable` chạy hook này trong Link step — TRƯỚC khi lib `dist/` được build — `nuxt.config.ts` import `@duydpdev/style-generator/vite` không resolve được → workspace build fail (exit 1) → cả install fail. Local pass vì `dist/` đã tồn tại.
- **New Rule:** Trong monorepo, example/consumer workspace TUYỆT ĐỐI không đặt lifecycle hook (`postinstall`/`prepare`) gọi tool cần lib đã build (vd `nuxt prepare`, codegen). `yarn install --immutable` chạy các hook đó trước khi root build → fail. Đổi thành script thủ công (`prepare:nuxt`) hoặc để `dev`/`build`/`typecheck` tự lo. Đối chiếu các example sẵn có (các example hiện có KHÔNG có install hook) trước khi thêm script.
- **Liên quan:** `examples/*` mới cũng phải được thêm vào `exclude` của root `tsconfig.json` (pre-commit `tsc --noEmit` ở root sẽ check chúng → lỗi `--jsx`/auto-import nếu không exclude).

### [2026-09-29] - Một cây tài liệu `documents/`; không vendor khung agent/skill; chỉ giữ lịch sử từ v4

- **Context:** Khung agent Antigravity/Gemini (thư mục `.agent` ở root cùng bản sao agents/commands/skills trong `.claude`) lệch pha với runtime và bắt chạy script Python không có trong quy trình của một lib TypeScript. Tài liệu nằm rải ở `docs/` và `plans/` ở root; plan theo file phẳng + `task.md` theo ngày khó theo dõi khi một plan có nhiều phase. Plan/brainstorm trước 2026-09-28 mô tả API đã xoá ở 4.0.0.
- **New Rule:**
  1. Nguồn sự thật cho agent là `.claude/CLAUDE.md` + `.claude/rules/*.md`. Không thêm lại thư mục agent/command/skill vào repo; dùng skill của runtime.
  2. Mọi tài liệu nằm dưới `documents/` theo layout ở mục "Documentation layout" của `.claude/CLAUDE.md`; `.agentkit/config.yaml` trỏ `paths.docs`/`paths.plans` vào đó. Tool nào tạo `docs/` hoặc `plans/` ở root thì chuyển file vào `documents/` trước khi commit và sửa cấu hình của tool đó.
  3. Lịch sử trước 2026-09-28 tra bằng git history, không khôi phục vào tree.
