---
id: T-PERF-ENGINE
type: test
title: "Hiệu năng API gợi ý (autocannon) và độ trễ một lượt chat SSE"
status: done
chapters: ["CH4"]
links:
  verifies: ["NFR-01", "NFR-02", "F-RECOMMEND", "F-AI-ADVISOR"]
code: []
tests: ["apps/api/test/perf/**", "packages/engine/bench/**"]
diagrams: []
---

**Lệnh:** `pnpm perf` (API đã chạy ở cổng 4104 trên CSDL `pcbuilder_e2e`). `recommendations.autocannon.ts` bắn `POST /api/recommendations` 30 giây mỗi kịch bản; mỗi yêu cầu mang một cookie `gid` ngẫu nhiên nên giới hạn 20 yêu cầu/phút/khách không áp dụng. `chat-sse.latency.ts` đo 20 lượt chat ở chế độ dự phòng: byte đầu, sự kiện `builds` đầu tiên và `done`.

**Kết quả (2026-11-08, Apple M3, Node v22.20.0, catalog seed 240 sản phẩm):**
- Không cache (mỗi yêu cầu khác nhau), 1 kết nối: 126,6 yêu cầu/s, p50 7,3 ms, p95 10,9 ms, p99 14,7 ms, 0 lỗi.
- Không cache, 10 kết nối: 228,3 yêu cầu/s, p50 43,4 ms, p95 52,2 ms, p99 57,4 ms, 0 lỗi (độ trễ chủ yếu là xếp hàng trên một tiến trình Node).
- Có cache, 10 kết nối: 1.219,9 yêu cầu/s, p50 7,9 ms, p95 10,6 ms, p99 13,5 ms.
- Chat SSE (20 lượt): sự kiện `builds` p50 14,4 ms, p95 19,5 ms; cả lượt p95 23,2 ms; 20/20 lượt có cấu hình.

Ảnh hưởng của kích thước catalog được đo ở `T-ENGINE-BENCH` (bench Engine), không ở mức API. Số liệu cho chương 4; bảng đầy đủ ở `apps/api/test/perf/results.md`, `apps/api/test/perf/chat-sse-results.md` và `docs/testing/test-report.md`.
