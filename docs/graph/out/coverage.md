# Độ phủ & tiến độ

Sinh tự động bởi `pnpm graph` — không sửa tay.

## Số node theo loại và trạng thái

| Loại | planned | in-progress | done | Tổng |
| --- | ---: | ---: | ---: | ---: |
| Yêu cầu | 1 | 0 | 28 | 29 |
| Use case | 0 | 0 | 16 | 16 |
| Tính năng | 1 | 0 | 22 | 23 |
| Module | 0 | 0 | 21 | 21 |
| API | 0 | 0 | 17 | 17 |
| Thực thể dữ liệu | 0 | 0 | 15 | 15 |
| Thuật toán | 0 | 0 | 8 | 8 |
| Luật ràng buộc | 0 | 0 | 15 | 15 |
| Màn hình | 0 | 0 | 20 | 20 |
| Kiểm thử | 1 | 0 | 24 | 25 |
| Quyết định thiết kế | 0 | 1 | 22 | 23 |
| Chương báo cáo | 6 | 0 | 0 | 6 |

## Yêu cầu chưa có use case / tính năng (0)

Cần thêm node `realizes` trỏ tới yêu cầu.

_Không có._

## Yêu cầu chưa có test (0)

Cần thêm node `test` (`verifies`) hoặc khai báo `tests:` cho tính năng.

_Không có._

## Yêu cầu chưa có code thực tế (1)

Tính năng đã khai báo `code:` nhưng chưa có file nào khớp (hoặc chưa khai báo).

- **NFR-11** — Khả năng sử dụng: đánh giá bằng khảo sát người dùng thật (UAT, điểm SUS)

## Yêu cầu chưa có test thực tế (1)

Chưa có file test nào khớp các glob `tests:` của tính năng / node test liên quan.

- **NFR-11** — Khả năng sử dụng: đánh giá bằng khảo sát người dùng thật (UAT, điểm SUS)

## Node chưa `done` nhưng code đã tồn tại (1)

Rà soát: có thể đã hoàn thành — cập nhật `status`.

- **ADR-023** (in-progress) — Triển khai trên AWS bằng ECS Fargate (web + API), RDS, ElastiCache sau CloudFront; khoá ở Parameter Store, CI dùng OIDC

## Số node theo chương

| Chương | Yêu cầu | Use case | Tính năng | Module | API | Thực thể dữ liệu | Thuật toán | Luật ràng buộc | Màn hình | Kiểm thử | Quyết định thiết kế | Tổng |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CH1 — Chương 1 - Giới thiệu | 0 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| CH2 — Chương 2 - Khảo sát và phân tích yêu cầu | 29 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 45 |
| CH3 — Chương 3 - Công nghệ sử dụng | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 7 |
| CH4 — Chương 4 - Thiết kế, triển khai và đánh giá | 0 | 0 | 23 | 21 | 17 | 15 | 8 | 15 | 20 | 25 | 22 | 166 |
| CH5 — Chương 5 - Giải pháp và đóng góp nổi bật | 0 | 0 | 11 | 0 | 0 | 0 | 8 | 1 | 2 | 2 | 14 | 38 |
| CH6 — Chương 6 - Kết luận | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 6 |
