---
id: F-RECOMMEND
type: feature
title: "Gợi ý cấu hình theo form (ngân sách, mục đích, tùy chọn)"
status: done
chapters: ["CH1", "CH4", "CH5"]
links:
  realizes: ["FR-08", "UC-04", "NFR-01"]
  dependsOn: ["M-RECOMMENDATION", "F-ENGINE-CORE", "E-PURPOSE-WEIGHT", "E-BUILD"]
  decidedBy: ["ADR-004", "ADR-013", "ADR-015", "ADR-020"]
  shownIn: ["SCR-HOME", "SCR-ADVISOR", "SCR-ADVISOR-FORM"]
code: ["apps/api/src/modules/recommendation/**", "apps/web/src/features/advisor/**"]
tests: ["apps/api/src/modules/recommendation/**/*.test.ts"]
diagrams: []
---

**Mục đích:** cho người dùng không muốn chat vẫn nhận 2-3 cấu hình tối ưu chỉ với một form ngắn.

**Mô tả:** `POST /recommendations` nhận `{budget, purpose, preferences}`, nạp ứng viên còn hàng (cache Redis 5 phút theo phiên bản catalog `cache:candidates:v{n}`), nạp ma trận trọng số từ bảng `purpose_weights` (thiếu thì dùng mặc định của Engine), gọi Engine và lưu các cấu hình thành `builds` (nguồn FORM; chatbot gọi cùng service với nguồn CHAT). Kết quả cache 10 phút theo băm của request đã chuẩn hóa tại `cache:reco:v{n}:{sha1}`, header `X-Cache` cho biết trúng hay trượt; lần gọi lặp lại trả đúng các build đã lưu. Khi admin đổi giá, tồn kho hay trọng số, phiên bản catalog tăng nên mọi cache cũ tự vô hiệu. Nếu không khả thi, trả HTTP 200 với lý do (ngân sách quá thấp, không có tổ hợp tương thích, linh kiện cố định xung đột) kèm ngân sách tối thiểu khả thi.

**Khóa cache và giới hạn tần suất:** khóa kết quả gồm yêu cầu đã chuẩn hóa, nguồn tạo build (FORM hoặc CHAT) và chủ sở hữu, để một lần trúng cache không đưa build của người này sang người khác (ADR-015). Kết quả `SEARCH_LIMIT` không được cache. Endpoint giới hạn 20 lần/phút theo người dùng, theo cookie khách hoặc theo IP (Redis `MULTI INCR/EXPIRE`, trả `429 RATE_LIMITED` kèm `Retry-After`).

**Điểm nhấn cho báo cáo:** các cấu hình trả về mang nhãn Hiệu năng / Cân bằng / Tiết kiệm theo hợp đồng nhãn của Engine (ADR-020); với mục đích AI hoặc đồ họa, GPU NVIDIA được ưu tiên bằng hệ số CUDA trừ khi người dùng chọn hãng khác (ADR-013).

**Trạng thái:** API xong và có test tích hợp. Giao diện: biểu mẫu gợi ý (ngân sách, mục đích, tùy chọn) trên trang `/advisor` (`apps/web/src/features/advisor`) gọi `POST /recommendations` và hiển thị 2-3 thẻ cấu hình, mở được trong Customizer. Biểu mẫu này được bổ sung ở đợt sửa cuối (2026-11-08); trước đó chatbot gọi cùng service qua tool `recommend_builds` nhưng chưa có giao diện nào gọi trực tiếp endpoint.
