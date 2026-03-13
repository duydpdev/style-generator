---
trigger: always_on
---

# Lessons Learned

> **Self-Improvement Loop:** This file tracks mistakes, user corrections, and important project-specific patterns. **Review this file at the start of every session.**

Whenever the user corrects you on a mistake:

1. Identify the pattern or root cause.
2. Add a new entry here with the date, description, and the new rule to follow.

---

## Example Entry

### [2026-03-01] - Avoid Hardcoding API Keys

- **Mistake:** Hardcoded development API key in a test file.
- **New Rule:** ALWAYS use `process.env.TEST_API_KEY` for any test environments. Never commit literal tokens.

---

_(Add new lessons below this line)_

### [2026-03-07] - Luôn lập kế hoạch trước khi code (Always Plan Before Coding)

- **Mistake:** Cứ thế code luôn mà không khởi tạo file kế hoạch và thỏa thuận rõ ràng với user. Đặt file plan sai cấu trúc thư mục (để file markdown trần hoặc tên folder có chứa text).
- **New Rule:** LUÔN PHẢI lên plan TRƯỚC khi code bất kỳ tính năng lớn/nhỏ nào. Mọi plan mới đều phải xuất hiện dưới dạng Markdown checklist và được MẶC ĐỊNH lưu vào **đúng cấu trúc thư mục** `docs/plans/YYYY-MM-DD/XX-ten-tinh-nang.md` (ví dụ: `docs/plans/2026-03-07/03-refactor-color-system.md`). Thư mục ngày (`YYYY-MM-DD`) phải chứa một file `task.md` để liệt kê thứ tự thực hiện các kế hoạch trong ngày đó. File markdown của plan phải tuân theo **TEMPLATE BẮT BUỘC** sau:
  - `XX` là số thứ tự thực hiện trong ngày (01, 02, 03...). **LƯU Ý:** Khi chuyển sang thư mục ngày mới (`YYYY-MM-DD`), số thứ tự ĐẢM BẢO phải bắt đầu lại từ `01`.
  - Tên file không chứa ký tự đặc biệt ngoài gạch nối `-`.

```markdown
# Project Plan: [Tên Task]

## 🎯 Overview

[Mục tiêu ngắn gọn của task]

## 📱 Project Type

[WEB / BACKEND / APP / LIBRARY]

## ✅ Success Criteria

1. [Điều kiện hoàn thành 1]
2. [Điều kiện hoàn thành 2]

## 📋 Task Breakdown

### [ ] Task 1: [Tên bước 1]

- **Agent**: [Tên Agent xử lý (nếu có)]
- **Input**: [Các file bị ảnh hưởng]
- **Output**: [Kết quả mong muốn]
- **Verify**: [Cách kiểm tra xem đã xong chưa]

### [ ] Task 2: [Tên bước 2]

...
```

### [2026-03-07] - Đa nền tảng (Cross-platform) & Kiểm tra Test Automation

- **Mistake:** Chỉ tập trung fix cho macOS (python3) mà quên mất tính đa nền tảng (Windows/Linux) và không phát hiện project thiếu Unit Tests / config test npm scripts.
- **New Rule:** LUÔN PHẢI đảm bảo scripts và code hoạt động ĐA NỀN TẢNG (Linux, Windows, macOS).
  - Với Python: Phải có cơ chế kiểm tra lệnh khả dụng (`python3` cho Unix, `python` cho Windows/một số bản Linux) hoặc sử dụng môi trường ảo chuẩn hóa.
  - Với Tests: Nếu project chưa có tests / framework tests, hãy chủ động đưa vào plan để setup (vd: Vitest cho Vite stack) và viết tests ngay. Bất kỳ function nào làm ra cũng cần test để chứng minh logic hoạt động đúng trên mọi môi trường.

### [2026-03-07] - Không sử dụng đường dẫn tuyệt đối (No Absolute Paths in Docs)

- **Mistake:** Sử dụng đường dẫn tuyệt đối (vd: `file:///Users/phanduy/...`) trong file README/Plan của project. Việc này làm lộ cấu trúc thư mục cá nhân và khiến link bị hỏng trên máy người khác.
- **New Rule:** LUÔN PHẢI sử dụng **đường dẫn tương đối** (relative path) cho mọi liên kết bên trong tài liệu của project. Chỉ sử dụng đường dẫn tuyệt đối khi AI tool yêu cầu cụ thể (vd: trong các artifact nội bộ của AI), nhưng tuyệt đối không đưa vào mã nguồn hoặc tài liệu git của project.

### [2026-03-07] - Tuân thủ Agent & Skill Protocol (Strict Protocol Enforcement)

- **Mistake:** Bỏ qua việc thông báo Agent (`🤖 Applying knowledge...`), không đọc `SKILL.md` trước khi làm, và quan trọng nhất là không chạy `checklist.py` trước khi thông báo hoàn thành.
- **New Rule:** TUYỆT ĐỐI không được đánh dấu Task hoàn thành nếu chưa chạy `python3 .agent/scripts/checklist.py .` và đạt kết quả PASS (hoặc giải trình lý do chính đáng nếu là Library đặc thù). Luôn phải load và đọc hướng dẫn Agent chuyên biệt trước khi bắt đầu step implementation.

### [2026-03-07] - Đồng bộ hóa Kế hoạch và Kiểm tra Cuối cùng (Syncing Plans & Final Checks)

- **Mistake:** Quên cập nhật trạng thái `[x]` vào file kế hoạch vật lý (`docs/plans/*.md`) và file `task.md` tóm tắt ngày. Không chạy `checklist.py` để verify toàn bộ project trước khi báo cáo hoàn thành.
- **New Rule:** LUÔN PHẢI cập nhật song song tiến độ vào cả Task Artifact (brain) và các file kế hoạch vật lý (`docs/plans/YYYY-MM-DD/task.md` và `XX-plan.md`). Chỉ được coi là hoàn thành khi đã cập nhật tất cả tài liệu liên quan và lệnh `python3 .agent/scripts/checklist.py .` trả về kết quả đạt (hoặc đã xử lý hết các lỗi nghiêm trọng).

### [2026-03-07] - Không bao giờ thực thi mã (Code) khi chưa được Approve Plan

- **Mistake:** Đã tự ý nhảy sang bước lập trình/thực thi (Phase 4 - Implementation) cho Task 05 khi người dùng chưa đồng ý/approve bản kế hoạch (Phase 3 - Solutioning/Plan). Việc này vi phạm nghiêm trọng phương pháp 4-Phase của dự án.
- **New Rule:** LUÔN PHẢI dừng lại chờ người dùng xác nhận bằng các câu "ok", "duyệt", "triển khai" sau khi nộp file `.md` kế hoạch. Tuyệt đối không được kích hoạt các tool sửa code ngay sau khi notify_user bằng `BlockedOnUser: true` nếu người dùng chưa hồi đáp thuận tình.

### [2026-03-08] - Tuyệt đối tuân thủ quy trình lập kế hoạch (4-Phase) và cấu trúc thư mục

- **Mistake:** Tiếp tục bỏ qua việc tạo file kế hoạch vật lý (`docs/plans/...`) và không sử dụng đúng template bắt buộc dù đã có lesson trước đó. Ngoài ra còn sử dụng đường dẫn tuyệt đối trong plan.
- **New Rule:** LUÔN PHẢI kiểm tra `lessons.md` trước khi bắt đầu bất kỳ task nào. Việc tạo plan trong `docs/plans/YYYY-MM-DD/XX-plan.md` là BẮT BUỘC và phải là bước đầu tiên sau khi phân tích. Không được phép "quên" hoặc "sơ suất" vì đây là quy trình vận hành tiêu chuẩn của dự án.

### [2026-03-08] - Không bao giờ thực thi mã (Code) khi chưa được Approve Plan (Lặp lại lỗi)

- **Mistake:** Trong quá trình xử lý bug border, dù đã tạo plan nhưng ngay sau khi giải thích đã tự ý thực thi mã nguồn trước khi user phản hồi phê duyệt. Đây là lặp lại lỗi vi phạm nghiêm trọng Phase 3.
- **New Rule:** LUÔN PHẢI DỪNG LẠI CHỜ DUYỆT. Tuyệt đối KHÔNG gộp chung bước giải thích lỗi + fix bug vào cùng 1 lượt. `[ ] Task` chỉ được phép chuyển thành `[/]` hoặc `[x]` sau khi có sự đồng ý của user.

### [2026-03-09] - Chú ý xử lý script trên môi trường ESM

- **Mistake**: Chạy script thử nghiệm (`.js`) bằng `node` mà vẫn dùng cú pháp `require()` trong một project đã setup `"type": "module"` trong `package.json`, dẫn tới lỗi `ReferenceError: require is not defined in ES module scope`.
- **New Rule**: TRƯỚC KHI tạo script chạy bằng Node, LUÔN phải check `package.json` xem đang ở chế độ CommonJS hay ES Module. Nếu là ESM, bắt buộc dùng cú pháp `import` hoặc đổi đuôi file script thành `.cjs` để Node hiểu đúng context.

### [2026-03-13] - Luôn đánh dấu `[x]` vào plan và task.md ngay sau khi hoàn thành

- **Mistake:** Sau khi implement xong tất cả tasks, quên cập nhật checkbox `[x]` trong file plan (`docs/plans/YYYY-MM-DD/XX-plan.md`) và `task.md`. Báo cáo hoàn thành mà tài liệu vật lý vẫn còn `[ ]`.
- **New Rule:** SAU KHI implement xong mỗi task (test pass, lint sạch), NGAY LẬP TỨC phải:
  1. Đổi `[ ]` → `[x]` trong file plan tương ứng
  2. Đổi `[ ]` → `[x]` trong `task.md` của ngày đó
  - Đây là bước bắt buộc trước khi báo cáo hoàn thành với user. Không được bỏ qua dù "chỉ quên".

### [2026-03-11] - Brainstorm: Cải thiện lib (type safe, bundle size, easy setup)

- **Context:** Phân tích toàn bộ codebase `@duydpdev/style-generator` và đưa ra options cải thiện theo 3 mục tiêu.
- **Kết quả lưu tại:** `docs/brainstorm/2026-03-11/01-improve-lib.md`
- **Recommended options:**
  1. **`defineTheme()` + `satisfies`** — Zero runtime cost, tăng type safety ngay tại config site, effort Low
  2. **Subpath exports** (`/plugin`, `/tokens`, `/cva`) — Tree-shaking thật sự, giảm 60% import size, effort Medium (breaking → major version)
  3. **Polish zero-config defaults** — 80% users không cần truyền options, effort Low
  4. **JSON Schema trong `doctor` command** — Runtime validation theme.json, effort Medium
  5. **Tailwind v4 CSS plugin format** — Future-proof, effort High (đợi v4 stable)
- **New Rule:** Khi brainstorm tính năng cho library, LUÔN lưu kết quả vào `docs/brainstorm/YYYY-MM-DD/XX-topic.md` (tương tự cấu trúc `docs/plans/`) và tạo file `session.md` tóm tắt ngày. Cấu trúc thư mục brainstorm phải mirror cấu trúc plans.
