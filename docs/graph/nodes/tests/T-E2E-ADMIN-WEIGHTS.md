---
id: T-E2E-ADMIN-WEIGHTS
type: test
title: "E2E: admin sửa trọng số làm đổi kết quả gợi ý"
status: done
chapters: ["CH4"]
links:
  verifies: ["FR-03", "FR-14", "UC-14", "F-ADMIN-WEIGHTS"]
code: []
tests: ["e2e/admin-weights.spec.ts", "e2e/auth.setup.ts"]
diagrams: []
---

Quản trị viên đăng nhập một lần qua giao diện `/login` (dự án `setup`, tôn trọng giới hạn 5 lần/phút/IP; cookie đã xoay vòng được lưu lại cho lần sau). Trên `/admin/weights`: ghi nhận gợi ý gaming 25 triệu trước khi sửa → đặt trọng số GPU của "Chơi game" 0,60 và chia lại 7 danh mục còn lại theo tỷ lệ (×0,69) để tổng bằng 1,00 → Lưu (PUT 200, toast) → gợi ý mới có `X-Cache: MISS` (cache đã bị xóa) và tỷ trọng GPU của cấu hình "Tối ưu hiệu năng" lớn hơn trước → "Khôi phục mặc định" + Lưu, rồi so khớp với bản ghi ban đầu (có bước PUT dự phòng nếu khác).

**Số đo trên dữ liệu seed:** tỷ trọng GPU trước/sau — hiệu năng 0,5694 → 0,6561; cân bằng 0,3194 → 0,6246; tiết kiệm 0,4139 → 0,4880.
