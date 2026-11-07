# Spec-Code Graph

Một nguồn truy vết duy nhất cho đồ án: **Yêu cầu → Use case → Tính năng → Module / API / Thực thể / Thuật toán → File code → Test → Chương báo cáo**. Mỗi yếu tố là một file Markdown nhỏ (gọi là *node*); công cụ `tools/graph` đọc tất cả, kiểm tra, rồi sinh ra bảng truy vết, tư liệu theo từng chương và một trang web xem đồ thị.

Lý do tồn tại: khi viết báo cáo hoặc khi giảng viên hỏi "chỗ này code ở đâu, test ở đâu, thuộc yêu cầu nào", câu trả lời nằm sẵn trong đây và được máy kiểm tra, không dựa vào trí nhớ.

## 1. Cấu trúc thư mục

```
docs/graph/
├─ nodes/<loại>/<ID>.md   Nguồn sự thật (sửa tay ở đây)
├─ out/                    Sinh tự động bởi `pnpm graph` (KHÔNG sửa tay, được commit để đọc không cần chạy gì)
│  ├─ index.html           Viewer tương tác (mở bằng trình duyệt, cần mạng để tải Cytoscape)
│  ├─ traceability.md      Bảng Yêu cầu | Use case | Tính năng | Code | Test | Trạng thái
│  ├─ coverage.md          Thống kê, yêu cầu thiếu tính năng/test/code, node có thể đã hoàn thành
│  ├─ chapters/CH1..CH6.md Tư liệu thô theo từng chương báo cáo
│  ├─ graph.json           Toàn bộ node và cạnh (máy đọc)
│  └─ graph.mmd            Sơ đồ Mermaid tổng thể
└─ README.md
docs/diagrams/*.mmd        Sơ đồ Mermaid được node tham chiếu
```

Thư mục theo loại: `requirements`, `usecases`, `features`, `modules`, `apis`, `entities`, `algorithms`, `rules`, `screens`, `tests`, `decisions`, `chapters`.

## 2. Định dạng node

```markdown
---
id: F-AI-ADVISOR
type: feature
title: "AI PC Advisor: chatbot Gemini điều phối Engine qua function calling"
status: planned            # planned | in-progress | done
chapters: ["CH4", "CH5"]   # chương báo cáo sẽ dùng node này
links:
  realizes: ["FR-07", "UC-03"]
  dependsOn: ["M-CHAT", "ALG-CSP"]
  decidedBy: ["ADR-003", "ADR-004"]
  shownIn: ["SCR-ADVISOR"]
code: ["apps/api/src/modules/chat/**", "apps/web/src/features/advisor/**"]
tests: ["apps/api/src/modules/chat/**/*.test.ts"]
diagrams: ["docs/diagrams/seq-ai-advisor.mmd"]
---

Phần thân là văn xuôi tiếng Việt dùng được ngay làm tư liệu báo cáo:
mục đích, mô tả, quyết định chính và lý do, điểm nhấn.
```

Mọi trường đều bắt buộc về mặt định dạng trừ `links`, `chapters`, `code`, `tests`, `diagrams` (mặc định rỗng). Khóa lạ trong frontmatter bị từ chối.

### Mã định danh (ID)

| Loại | Tiền tố | Ví dụ |
| --- | --- | --- |
| requirement | `FR-`, `NFR-` | `FR-07`, `NFR-01` |
| usecase | `UC-` | `UC-03` |
| feature | `F-` | `F-AI-ADVISOR` |
| module | `M-` | `M-CHAT` |
| api | `API-` | `API-CHAT` |
| entity | `E-` | `E-PRODUCT` |
| algorithm | `ALG-` | `ALG-CSP` |
| rule | `R-` | `R-C05` (luật C01..C14) |
| screen | `SCR-` | `SCR-BUILDER` |
| test | `T-` | `T-INT-OVERSELL` |
| decision | `ADR-` | `ADR-007` |
| chapter | `CH1`..`CH6` | `CH5` |

Tên file = `<ID>.md`. ID chỉ gồm chữ HOA, số và dấu `-`.

### Ý nghĩa các loại liên kết

| Liên kết | Đọc là | Dùng cho |
| --- | --- | --- |
| `realizes` | "hiện thực hóa" | use case → yêu cầu; tính năng → yêu cầu/use case; API → tính năng |
| `refines` | "chi tiết hóa" | luật, thuật toán → tính năng; thực thể → `M-DB` |
| `dependsOn` | "dùng/phụ thuộc" | tính năng → module, thuật toán, thực thể; module → module/thực thể |
| `decidedBy` | "theo quyết định" | bất kỳ node → ADR |
| `verifies` | "kiểm chứng" | node test → yêu cầu, tính năng, luật, thuật toán |
| `shownIn` | "hiển thị ở" | tính năng → màn hình |

Cạnh ngầm (không cần khai báo): `implementedBy` (từ `code:`), `verifiedBy` (từ `tests:`), `documentedIn` (từ `chapters:`).

**Cách truy vết yêu cầu** (dùng cho `traceability.md`): Use case = node `realizes` yêu cầu; Tính năng = feature `realizes` yêu cầu hoặc `realizes` một use case của yêu cầu đó; Code/Test = `code:`/`tests:` của các tính năng đó; Test node = node `test` có `verifies` trỏ tới yêu cầu, use case hoặc tính năng đó. Vì vậy: **mỗi yêu cầu cần ít nhất một use case/tính năng `realizes` nó và ít nhất một test node `verifies` hoặc `tests:` trên tính năng.**

### Quy ước `status`

- `planned`: chưa làm (đường dẫn trong `code:`/`tests:` có thể chưa tồn tại).
- `in-progress`: đang làm.
- `done`: **đã có trong repo**. Mọi glob trong `code:` và `tests:` phải khớp ít nhất một file, nếu không `pnpm graph:check` báo lỗi (exit 1).

Chỉ đánh `done` khi code có thật. Glob viết theo gốc repo, ví dụ `apps/api/src/modules/chat/**`, `packages/engine/src/**/*.test.ts`.

## 3. Thêm hoặc sửa node

1. Tạo `docs/graph/nodes/<loại>/<ID>.md` theo mẫu ở trên (copy một node cùng loại làm khuôn).
2. Điền liên kết: node mới phải nối được vào chuỗi truy vết (ví dụ tính năng mới phải `realizes` ít nhất một yêu cầu hoặc use case).
3. Gắn `chapters` để node xuất hiện trong tư liệu chương tương ứng.
4. Viết phần thân bằng tiếng Việt: **mục đích, mô tả hoạt động, quyết định chính và lý do**. Viết sao cho sinh viên chép/chỉnh được thành đoạn báo cáo.
5. Chạy `pnpm graph:check` (kiểm tra) rồi `pnpm graph` (sinh `out/`), commit cả `nodes/` lẫn `out/`.

Đổi tên/di chuyển file code: cập nhật `code:`/`tests:` của node liên quan, nếu không node `done` sẽ báo lỗi.

## 4. Quy tắc cho agent khi hoàn thành một task

Bắt buộc, làm trước khi báo xong:

1. **Tìm node của phần việc mình** (theo module/tính năng/API/thuật toán/màn hình/test). Dùng `docs/graph/out/index.html` hoặc `grep -r "<đường dẫn>" docs/graph/nodes`.
2. **Cập nhật `status`**: `planned` → `done` nếu hoàn tất, hoặc `in-progress` nếu dở.
3. **Cập nhật `code:` và `tests:`** cho khớp file thực tế (đường dẫn cụ thể hoặc glob). Không để glob không khớp file nào ở node `done`.
4. **Thêm node mới** nếu phát sinh thứ chưa có (module, API, thực thể, thuật toán, màn hình, test...) và nối vào chuỗi truy vết.
5. **Cập nhật phần thân** nếu hành vi khác với mô tả (đặc biệt các con số, quy tắc, quyết định đã đổi) — báo cáo sẽ chép từ đây.
6. **Cập nhật sơ đồ** trong `docs/diagrams/` nếu đổi schema (`erd.mmd` phải khớp `apps/api/src/db/schema.ts`), luồng, class hoặc trạng thái.
7. Chạy `pnpm graph:check` (phải exit 0) và `pnpm graph`, rồi commit `docs/graph/nodes`, `docs/graph/out`, `docs/diagrams` cùng với code. `pnpm verify` chạy lại `graph:check`.
8. **Không** ghi mã spec (FR-xx, ADR-x...) vào comment trong code (ADR-011); mapping nằm ở node.

Một node có thể thuộc sở hữu thư mục của agent khác (ví dụ node tính năng của Backend); khi bạn hoàn thành phần việc của mình thì tự sửa node tương ứng, đừng chờ agent docs.

## 5. Lệnh và cách `check` hoạt động

```bash
pnpm graph            # kiểm tra + sinh docs/graph/out/*  (exit 1 nếu có lỗi)
pnpm graph:check      # chỉ kiểm tra
pnpm --filter @pc/graph check --verbose   # liệt kê cả cảnh báo đường dẫn chưa tồn tại
pnpm --filter @pc/graph test              # unit test của chính công cụ
```

| Mã | Mức | Khi nào |
| --- | --- | --- |
| `INVALID_FRONTMATTER` | lỗi | YAML hỏng, sai kiểu, ID không đúng tiền tố của `type`, khóa lạ |
| `DUPLICATE_ID` | lỗi | hai node cùng ID |
| `BROKEN_LINK` | lỗi | liên kết hoặc `chapters` trỏ tới node không tồn tại |
| `MISSING_DIAGRAM` | lỗi | file trong `diagrams:` không tồn tại |
| `MISSING_CODE` | lỗi | node `done` có glob `code:` không khớp file nào, hoặc node `done` thuộc loại feature/module/api/algorithm/rule/screen/entity mà không khai báo `code:` |
| `MISSING_TEST` | lỗi / cảnh báo | node `done` có glob `tests:` không khớp file (lỗi); node `done` thuộc loại feature/module/api/algorithm/rule không khai báo `tests:` (cảnh báo) |
| `PLANNED_PATH_MISSING` | cảnh báo | node chưa `done` trỏ tới đường dẫn chưa tồn tại (bình thường khi chưa làm) |
| `UNREALIZED_REQUIREMENT` | cảnh báo | yêu cầu chưa có use case/tính năng nào `realizes` |
| `UNVERIFIED_REQUIREMENT` | cảnh báo | yêu cầu chưa có test node hay `tests:` nào gắn vào |

Chỉ **lỗi** làm `check` thoát mã 1. Cảnh báo in ra nhưng thoát mã 0.

## 6. Dùng đầu ra để viết báo cáo

Mở `docs/graph/out/index.html` để duyệt (lọc theo loại, chương, trạng thái; bấm node xem mô tả, liên kết, đường dẫn code/test). Với mỗi chương, lấy `docs/graph/out/chapters/CHn.md` làm **tư liệu thô** (gồm dàn ý chương, rồi các node gom theo loại kèm mô tả, đường dẫn code/test và sơ đồ Mermaid đã nhúng sẵn), sau đó viết thành văn xuôi.

| Chương | Lấy gì | Ghi chú khi viết |
| --- | --- | --- |
| **CH1 Giới thiệu** | `chapters/CH1.md` (các tính năng nổi bật), spec §1, phiếu giao nhiệm vụ mục 3.5 | Đặt vấn đề, mục tiêu, phạm vi, đóng góp. Ứng với Nội dung 1 (tuần 1-3). |
| **CH2 Khảo sát và phân tích yêu cầu** | `chapters/CH2.md` (FR, NFR, UC + biểu đồ use case), `traceability.md` | Phần khảo sát hệ thống hiện có phải tự bổ sung. Mỗi FR đã ghi nguồn từ phiếu. Ứng với Nội dung 1. |
| **CH3 Công nghệ sử dụng** | `chapters/CH3.md` (các ADR về công nghệ) | Mỗi ADR đã có bối cảnh - quyết định - lý do - phương án khác. Ứng với Nội dung 2 (tuần 3-5). |
| **CH4 Thiết kế, triển khai và đánh giá** | `chapters/CH4.md` (kiến trúc, ERD, class, sequence, state, deployment, mọi module/API/thực thể/thuật toán/luật/màn hình/test), `coverage.md`, kết quả benchmark/perf/golden set/UAT | Chia mục: kiến trúc → CSDL → API → thuật toán → luồng nghiệp vụ → giao diện → cài đặt → kiểm thử, đánh giá → triển khai. Ứng với Nội dung 3, 4, 5, 6 (tuần 5-17). |
| **CH5 Giải pháp và đóng góp nổi bật** | `chapters/CH5.md` (Engine CSP/MCKP, AI Advisor + dự phòng, chống bán vượt, JSONB động) | Mỗi mục: vấn đề → giải pháp → số liệu đo. Số liệu lấy từ `T-ENGINE-BENCH`, `T-INT-OVERSELL`, `T-AI-GOLDEN`. |
| **CH6 Kết luận** | `coverage.md`, `traceability.md`, kết quả UAT (`T-UAT-SUS`) | Đối chiếu kết quả với mục tiêu phiếu; nêu hạn chế và hướng phát triển. Ứng với Nội dung 6 (tuần 16-17). |

Đối chiếu sáu nội dung của phiếu giao nhiệm vụ: Nội dung 1 → CH1/CH2/CH4 (thiết kế); Nội dung 2 → CH3 và sơ đồ tuần tự trong CH4; Nội dung 3 → CH4/CH5 (mô hình hóa CSP, MCKP, bộ luật); Nội dung 4 → CH4 (cài đặt); Nội dung 5 → CH4 (kiểm thử, đánh giá); Nội dung 6 → CH4/CH6 (triển khai, UAT, hiệu chỉnh).

Mẹo: `traceability.md` trả lời "yêu cầu X được làm ở đâu và test ở đâu"; `coverage.md` trả lời "còn thiếu gì" và "node nào có code rồi mà chưa đánh `done`".

## 7. Sơ đồ

Sơ đồ nằm ở `docs/diagrams/*.mmd` (Mermaid) và được nhúng vào tư liệu chương qua trường `diagrams:` của node. Dán nội dung vào mermaid.live hoặc plugin Mermaid của editor để xuất hình cho báo cáo.

| File | Nội dung | Gắn ở node |
| --- | --- | --- |
| `usecase-overview.mmd` | Use case tổng quan | `CH2` |
| `component-architecture.mmd` | Kiến trúc thành phần | `ADR-001`, `CH4` |
| `erd.mmd` | ERD, khớp `apps/api/src/db/schema.ts` | `M-DB` |
| `class-engine.mmd` | Kiểu dữ liệu và thành phần Engine | `F-ENGINE-CORE` |
| `seq-ai-advisor.mmd` | Tuần tự chat AI + dự phòng | `F-AI-ADVISOR` |
| `seq-checkout-vietqr.mmd` | Tuần tự đặt hàng - thanh toán VietQR | `F-PAYMENT-VIETQR` |
| `seq-customizer-check.mmd` | Tuần tự kiểm tra tương thích realtime | `F-CUSTOMIZER` |
| `state-order.mmd` | Máy trạng thái đơn hàng | `F-ORDER` |
| `deployment.mmd` | Sơ đồ triển khai | `F-DEPLOY` |
