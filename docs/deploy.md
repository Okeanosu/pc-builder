# Hướng dẫn triển khai (Docker Compose trên VPS)

Toàn bộ hệ thống (web, api, postgres, redis, caddy) được đóng gói bằng Docker và chạy bằng một file Docker Compose duy nhất: `infra/docker-compose.prod.yml`.

> Triển khai lên **AWS** (một EC2 dựng bằng Terraform, CI/CD qua GitHub Actions, khoá trong Parameter Store): xem [`docs/deploy-aws.md`](deploy-aws.md). Tài liệu này dành cho một VPS bất kỳ.

```
Internet ──► Caddy (80/443, HTTPS tự động)
               ├─ /api/*  ──► api:4000   (Express, tự chạy migration khi khởi động)
               └─ còn lại ──► web:3000   (Next.js standalone)
             api ──► postgres:16, redis:7   (chỉ nằm trong mạng nội bộ, không mở cổng ra ngoài)
```

Web và API dùng chung một tên miền qua Caddy nên cookie (Secure, SameSite=Lax) hoạt động như cùng site.

## 1. Yêu cầu

- VPS Ubuntu 22.04 hoặc 24.04, tối thiểu 2 vCPU / 2 GB RAM (khi build nên có thêm swap 2 GB nếu RAM thấp), 20 GB ổ đĩa.
- Docker Engine và Docker Compose plugin (`docker compose version` phải chạy được):
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER   # đăng xuất/đăng nhập lại
  ```
- Một tên miền có bản ghi **A** trỏ về IP của VPS (ví dụ `shop.example.com`).
- Mở cổng 80 và 443 trên firewall (`sudo ufw allow 80,443/tcp`). Cổng 80 cần cho Caddy xin chứng chỉ Let's Encrypt.

## 2. Lấy mã nguồn và cấu hình

```bash
git clone <repo-url> pc-builder && cd pc-builder
cp infra/.env.prod.example infra/.env.prod
```

Sinh các secret ngẫu nhiên (mỗi biến một giá trị riêng):

```bash
openssl rand -hex 32   # dùng cho JWT_ACCESS_SECRET
openssl rand -hex 32   # dùng cho JWT_REFRESH_SECRET (khác giá trị trên)
openssl rand -hex 32   # dùng cho SEPAY_API_KEY
openssl rand -hex 16   # dùng cho POSTGRES_PASSWORD
```

Sửa `infra/.env.prod` (thay mọi giá trị dạng `<...>`):

| Biến | Ý nghĩa |
| --- | --- |
| `DOMAIN` | Tên miền công khai, ví dụ `shop.example.com` |
| `POSTGRES_PASSWORD` | Mật khẩu Postgres (bắt buộc) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secret ký JWT (hai giá trị khác nhau) |
| `SEPAY_API_KEY` | Khoá xác thực webhook SePay; ai biết khoá này có thể đánh dấu đơn đã thanh toán |
| `GEMINI_API_KEY` | Khoá Gemini (xem mục 5); để trống thì chatbot chạy chế độ rule-based |
| `VIETQR_*` | Thông tin tài khoản ngân hàng nhận tiền; `VIETQR_ACCOUNT_NO` bắt buộc là số tài khoản thật |

**API từ chối khởi động ở production** (fail-closed) khi `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` hoặc `SEPAY_API_KEY` ngắn hơn 32 ký tự hoặc bắt đầu bằng `dev-`/`change-me`, hoặc khi `VIETQR_ACCOUNT_NO` vẫn là `0000000000`. Mục đích: không bao giờ chạy công khai với secret mặc định (secret JWT bị lộ cho phép giả token admin).

Để trống `PUBLIC_PORT_SUFFIX`, giữ `HTTP_PORT=80`, `HTTPS_PORT=443` trên VPS thật.

`NEXT_PUBLIC_API_URL` được nhúng vào web lúc build (compose tự đặt thành `https://<DOMAIN>/api`), nên **đổi `DOMAIN` thì phải build lại web** (`--build`).

## 3. Khởi chạy

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
```

(hoặc `pnpm docker:prod` nếu đã cài pnpm). Lần đầu build mất vài phút. Khi khởi động, container `api` tự chạy migration (`node --import tsx src/db/migrate.ts`) rồi mới mở server; migration idempotent nên chạy lại nhiều lần vẫn an toàn.

> **Lưu ý:** migrator của drizzle không dùng advisory lock, nên service `api` phải giữ đúng **1 replica** (không dùng `--scale api=N`). Nếu cần nhiều replica, hãy tách migration thành service chạy một lần (one-off) trước khi khởi động các api.

Kiểm tra:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod ps
curl https://<DOMAIN>/api/health        # {"status":"ok","db":"up","redis":"up",...}
```

Caddy tự xin và gia hạn chứng chỉ HTTPS ngay lần truy cập đầu tiên (cần DNS đã trỏ đúng).

## 4. Nạp dữ liệu mẫu (thủ công, một lần)

Seed **không** chạy tự động. Lệnh này **xoá toàn bộ** sản phẩm, đơn hàng, người dùng hiện có rồi nạp lại, vì vậy chỉ chạy ở lần triển khai đầu tiên.

Ở production, seed **bắt buộc** có `SEED_ADMIN_PASSWORD` (tối thiểu 12 ký tự): đây là mật khẩu của tài khoản quản trị `admin@pcbuilder.vn`. Thiếu biến này (hoặc quá ngắn) thì seed dừng **trước khi** xoá dữ liệu. Nên truyền biến ngay trong lệnh bằng `-e` thay vì lưu trong `.env.prod`:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod \
  exec -e SEED_ADMIN_PASSWORD='<mật-khẩu-mạnh-tối-thiểu-12-ký-tự>' api node --import tsx src/db/seed/index.ts
```

- Production chỉ tạo **một** tài khoản: `admin@pcbuilder.vn` với mật khẩu vừa đặt. Hai tài khoản demo (nhân viên `staff@pcbuilder.vn`, khách `khach@pcbuilder.vn`) có mật khẩu công khai trong mã nguồn nên **không** được tạo, trừ khi thêm `-e SEED_DEMO_USERS=1` (chỉ dùng cho máy demo không mở công khai).
- Môi trường phát triển (`NODE_ENV` khác `production`) vẫn tạo đủ ba tài khoản demo như trước.
- Đổi mật khẩu bất cứ lúc nào: đăng nhập → trang **Tài khoản** (`/account`) → **Đổi mật khẩu** (API `POST /api/auth/password`, cần mật khẩu hiện tại). Sau khi đổi, mọi phiên đăng nhập khác của tài khoản bị thu hồi refresh token, nên các thiết bị khác phải đăng nhập lại khi access token (tối đa 15 phút) hết hạn.

Kiểm tra: `curl "https://<DOMAIN>/api/products?category=cpu"` trả về danh sách sản phẩm.

## 5. Khoá Gemini miễn phí

1. Vào https://aistudio.google.com/apikey, đăng nhập tài khoản Google, chọn "Create API key".
2. Dán vào `GEMINI_API_KEY=` trong `infra/.env.prod`.
3. Áp dụng: `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d api`.

Log khởi động của API ghi `AI mode: <model>` (hoặc `fallback` nếu chưa có khoá).

## 6. Webhook SePay

Trong trang quản trị SePay, tạo webhook với:

- URL: `https://<DOMAIN>/api/payments/webhook/sepay`
- Kiểu xác thực: API Key, header `Authorization: Apikey <SEPAY_API_KEY>` (giá trị trùng với `SEPAY_API_KEY` trong `.env.prod`).

## 7. Sao lưu

Sao lưu thủ công:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod \
  exec -T postgres pg_dump -U pc pcbuilder | gzip > backup-$(date +%F).sql.gz
```

Cron hằng ngày lúc 02:00 (giữ 14 bản), chạy `crontab -e`:

```cron
0 2 * * * cd /home/ubuntu/pc-builder && docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T postgres pg_dump -U pc pcbuilder | gzip > /home/ubuntu/backups/pcbuilder-$(date +\%F).sql.gz && find /home/ubuntu/backups -name 'pcbuilder-*.sql.gz' -mtime +14 -delete
```

(Tạo thư mục `~/backups` trước; sửa đường dẫn/người dùng cho phù hợp, và đổi `-U pc` nếu đã đổi `POSTGRES_USER`.)

Khôi phục: `gunzip -c backup.sql.gz | docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod exec -T postgres psql -U pc pcbuilder`.

## 8. Cập nhật / triển khai lại

```bash
git pull
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
```

Dữ liệu nằm trong volume `pgdata`, `redisdata` nên không mất khi build lại. Migration mới tự chạy khi `api` khởi động. Tuyệt đối không dùng `down -v` trên máy chủ thật vì lệnh này xoá volume dữ liệu.

## 9. Log và vận hành

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod logs -f api     # hoặc web, caddy, postgres
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod restart api
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod down            # dừng, giữ dữ liệu
```

Mọi service có `restart: unless-stopped` nên tự khởi động lại khi VPS reboot. API ghi log JSON cả request healthcheck (mỗi 15 giây); đây là hành vi bình thường.

## 10. Chạy thử "giống production" trên máy cá nhân (demo bảo vệ)

Dùng `DOMAIN=localhost`: Caddy tự ký chứng chỉ nội bộ nên chạy được HTTPS không cần tên miền. Dùng cổng 8081/8443 để không đụng cổng đang dùng:

```bash
cp infra/.env.prod.example infra/.env.prod
# sửa trong infra/.env.prod:
#   DOMAIN=localhost
#   PUBLIC_PORT_SUFFIX=:8443
#   HTTP_PORT=8081
#   HTTPS_PORT=8443
#   và điền POSTGRES_PASSWORD, JWT_*_SECRET, SEPAY_API_KEY (openssl rand -hex 32),
#   VIETQR_ACCOUNT_NO (số tài khoản nhận tiền; khác 0000000000)
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod up -d --build
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod \
  exec -e SEED_ADMIN_PASSWORD='<mật-khẩu-tối-thiểu-12-ký-tự>' -e SEED_DEMO_USERS=1 \
  api node --import tsx src/db/seed/index.ts
```

Mở https://localhost:8443 (trình duyệt cảnh báo chứng chỉ tự ký: chọn tiếp tục; hoặc `curl -k`). Kiểm tra nhanh: `curl -k https://localhost:8443/api/health`. Dọn dẹp hoàn toàn (xoá cả dữ liệu): `docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.prod down -v`.

## 11. Xử lý sự cố

| Triệu chứng | Nguyên nhân / cách xử lý |
| --- | --- |
| `api` thoát ngay với "JWT_ACCESS_SECRET must be set in production…" (hoặc `JWT_REFRESH_SECRET`, `SEPAY_API_KEY`) | Biến còn rỗng, ngắn hơn 32 ký tự hoặc bắt đầu bằng `dev-`/`change-me`. Đặt giá trị `openssl rand -hex 32`. |
| `api` thoát ngay với "VIETQR_ACCOUNT_NO must be set in production…" | Còn số tài khoản giữ chỗ `0000000000`. Điền số tài khoản nhận tiền thật. |
| Seed báo "SEED_ADMIN_PASSWORD … is required to seed in production" | Thêm `-e SEED_ADMIN_PASSWORD='…'` (tối thiểu 12 ký tự) vào lệnh seed. Dữ liệu cũ chưa bị xoá. |
| Compose báo `set POSTGRES_PASSWORD` / `set DOMAIN` | Thiếu `--env-file infra/.env.prod` hoặc chưa điền biến. |
| Caddy không lấy được chứng chỉ | DNS chưa trỏ về VPS, hoặc cổng 80/443 bị chặn. Xem `logs caddy`. |
| Web gọi API sai địa chỉ / lỗi CORS | `DOMAIN` thay đổi sau khi build. Chạy lại `up -d --build web`. |
| Không đăng nhập được (cookie không lưu) | Phải truy cập bằng HTTPS; cookie đặt Secure khi `NODE_ENV=production`. |
| Chatbot trả lời kiểu rule-based | `GEMINI_API_KEY` trống hoặc sai. Kiểm tra log khởi động của API. |
| Chat bị ngắt/đứng giữa chừng | Có proxy khác đứng trước Caddy đang buffer SSE (ví dụ Cloudflare proxy). Tắt buffering hoặc đặt DNS-only. |
| Build hết bộ nhớ | Thêm swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`. |
| `bind: address already in use` | Cổng trên máy đã bị chiếm; đổi `HTTP_PORT`/`HTTPS_PORT`. |
