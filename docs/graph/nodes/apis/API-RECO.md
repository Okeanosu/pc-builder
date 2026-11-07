---
id: API-RECO
type: api
title: "API gợi ý cấu hình"
status: done
chapters: ["CH4"]
links:
  realizes: ["F-RECOMMEND"]
  dependsOn: ["M-RECOMMENDATION"]
code: ["apps/api/src/modules/recommendation/**"]
tests: ["apps/api/src/modules/recommendation/**/*.int.test.ts"]
diagrams: []
---

**Endpoint:**
- `POST /api/recommendations`

Nhận `{budget (5-200 triệu), purpose, preferences?, fixed?, exclude?}`, trả `RecommendationResultDTO` gồm 1-3 build đã được lưu (có `id`, nguồn FORM, thuộc người dùng nếu đã đăng nhập) và `stats` (số nút duyệt, số nhánh bị cắt, thời gian). Header `X-Cache: HIT|MISS` cho biết kết quả lấy từ cache Redis (10 phút) hay vừa giải; lần gọi giống hệt trả lại đúng các id build cũ. Khi không khả thi vẫn trả HTTP 200 với `builds: []`, `infeasibleReason` và `minFeasibleBudget`. Giới hạn tần suất hai lớp (`apps/api/src/lib/rate-limit.ts`): mỗi tài khoản/khách (cookie `gid`) tối đa 20 lần/phút (`rl:reco:{who}`) và mỗi IP tối đa 60 lần/phút (`rl:reco-ip:ip:{ip}`), cả hai đếm trong một giao dịch Redis MULTI (INCR + EXPIRE NX); vượt ngưỡng nào cũng → 429 `RATE_LIMITED` kèm `Retry-After`. Lớp theo IP chặn việc đổi cookie `gid` để lách giới hạn (BUG-02 trong báo cáo kiểm thử, đã sửa). Redis lỗi thì bộ giới hạn cho qua và ghi cảnh báo (fail-open). Kết quả bị cắt do giới hạn số nút tìm kiếm (`SEARCH_LIMIT`) không được cache. Request sai → 422 `VALIDATION_ERROR`.
