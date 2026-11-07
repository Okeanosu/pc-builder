# PC Builder — TMĐT linh kiện máy tính + AI tư vấn cấu hình

Đồ án tốt nghiệp Kỹ sư 2026.1 — ĐH Bách khoa Hà Nội, Trường CNTT&TT.

- **AI PC Advisor**: chatbot tiếng Việt (Google Gemini free tier, function calling) + Optimization Engine (CSP + MCKP) → cấu hình tương thích, đúng ngân sách, từ hàng thật trong kho. Không có API key ⇒ chế độ dự phòng rule-based.
- **PC Customizer**: tự lắp ráp, kiểm tra tương thích realtime.
- **TMĐT D2C**: lọc thông số động (PostgreSQL JSONB + GIN), giỏ hàng, VietQR, báo giá PDF, Admin Portal.

## Chạy local

```bash
pnpm install
cp .env.example .env          # điền GEMINI_API_KEY (https://aistudio.google.com/apikey) nếu có
pnpm infra:up                 # Postgres :5433, Redis :6380
pnpm db:migrate && pnpm db:seed
pnpm dev                      # web http://localhost:3000, api http://localhost:4000/api
```

## Tài liệu

- Thiết kế: `docs/superpowers/specs/2026-11-07-pc-builder-design.md`
- Kế hoạch: `docs/superpowers/plans/2026-11-07-pc-builder-master-plan.md`
- Spec-Code Graph (phục vụ viết báo cáo): `docs/graph/` — `pnpm graph` sinh `docs/graph/out/` (bảng truy vết, tư liệu từng chương, viewer HTML).

## Kiểm tra

```bash
pnpm verify   # typecheck + lint + test + graph:check
```
