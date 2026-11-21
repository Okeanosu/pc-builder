# Triển khai lên AWS: một máy chủ, khoá được bảo vệ

Bản này đưa đúng stack của `docs/deploy.md` (Caddy, web, api, Postgres, Redis trong Docker Compose) lên **một máy EC2 Graviton `t4g.small`** ở Singapore, mọi thứ dựng bằng Terraform. Mục tiêu đặt trước chi phí: **không có khoá dài hạn nào nằm trong git, GitHub, Terraform state, user data hay log**, và mỗi thành phần chỉ có quyền tối thiểu.

```
                     Internet
                        │ 80/443 (không có cổng 22)
              ┌─────────▼──────────────────────────────── EC2 t4g.small, Amazon Linux 2023 ─┐
              │  Caddy (HTTPS Let's Encrypt, header bảo mật)                                │
              │    ├─ /api/* ─► api  (Node, uid 1000, không capability)                     │
              │    └─ còn lại ► web  (Next.js, uid 1000, không capability)                  │
              │  postgres, redis: chỉ trong mạng nội bộ Docker                              │
              │  /opt/pcbuilder/.env (root, 0600) ◄── render-env.sh ◄── Parameter Store     │
              └─────▲───────────────────────▲────────────────────────────────┬─────────────┘
                    │ SSM Run Command        │ kéo image (role máy chủ)        │ pg_dump 2 lần/ngày
                    │ (chỉ tài liệu deploy)  │                                 ▼
GitHub Actions ─OIDC─► role deploy ──push──► ECR (tag = commit SHA, bất biến)   S3 (chỉ ghi, có version)
                                                                                 + snapshot EBS hằng ngày
Anh (laptop) ─SSO + MFA─► Terraform, secrets.sh, Session Manager (thay SSH)
```

| Thành phần | Tệp |
| --- | --- |
| Hạ tầng (VPC, EC2, IAM, ECR, S3, cảnh báo) | `infra/aws/terraform/*.tf` |
| Stack chạy trên máy chủ | `infra/aws/compose.yml`, `infra/aws/Caddyfile` |
| Script trên máy chủ (`/opt/pcbuilder/bin`) | `infra/aws/host/{deploy,render-env,backup,seed}.sh` |
| Script trên laptop | `infra/aws/scripts/secrets.sh`, `ssm-deploy.sh`, `aws-env.sh` |
| CI/CD | `.github/workflows/deploy-aws.yml` |

**Chi phí ước tính** (giá on-demand Singapore, tra ngày 20/11/2026):

| Khoản | USD/tháng |
| --- | --- |
| EC2 `t4g.small` (0,0212 USD/giờ) | ≈ 15,5 |
| IPv4 công khai (Elastic IP, 0,005 USD/giờ) | ≈ 3,7 |
| Ổ gp3 20 GB, snapshot, S3, ECR, CloudWatch | ≈ 3–4 |
| **Tổng** | **≈ 22–23** |

Ngân sách mặc định là 25 USD/tháng: vượt 80% thì có email. Nếu tài khoản mới được tặng credit thì chi phí trừ vào credit (xem trang Billing). Giữ khoảng 2 tháng cho đợt bảo vệ thì hết khoảng 45 USD.

---

## 1. Các khoá: cất ở đâu, ai đọc được, lộ thì sao

| Khoá | Cất ở đâu | Ai đọc được | Nếu lộ | Cách thay (mục 4) |
| --- | --- | --- | --- | --- |
| Đăng nhập **root** tài khoản AWS | Trình quản lý mật khẩu + MFA | Chỉ anh | Mất toàn bộ tài khoản | Đổi mật khẩu, kiểm tra MFA |
| Quyền admin của anh | **Không có khoá dài hạn**: IAM Identity Center cấp phiên tạm 4 giờ sau MFA | Laptop của anh (`~/.aws/sso/cache`) | Phiên tự hết hạn | Thu hồi phiên, đặt lại MFA |
| Quyền deploy của GitHub | **Không có khoá**: OIDC đổi token GitHub lấy phiên 1 giờ | Job trong environment `production` của repo này | Chỉ đẩy được image và chạy tài liệu deploy | Chặn role (mục 5) |
| Quyền của máy chủ | Instance role, lấy qua IMDSv2 | Tiến trình trên máy chủ, **không phải container** | Đọc được secrets của chính dự án, ghi thêm backup; không xoá được backup | Thay máy (mục 5) |
| `POSTGRES_PASSWORD` | Parameter Store, SecureString | Máy chủ, admin | DB chỉ nằm trong mạng nội bộ nên phải vào được máy mới dùng được | `rotate` (tự đồng bộ vào DB) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Parameter Store | Máy chủ, admin | Giả được token admin | `rotate` (mọi người đăng nhập lại) |
| `SEPAY_API_KEY` | Parameter Store + trang SePay | Máy chủ, admin, SePay | Đánh dấu đơn "đã thanh toán" giả | `rotate` rồi dán sang SePay |
| `GEMINI_API_KEY` | Parameter Store | Máy chủ, admin | Người khác dùng hết hạn mức | Tạo khoá mới, xoá khoá cũ |
| `VIETQR_ACCOUNT_NO` | Parameter Store | Máy chủ, admin | Không bí mật (in trên QR) | `set` |
| Mật khẩu `admin@pcbuilder.vn` | Hash bcrypt trong DB | Không ai | Vào trang quản trị | Trang Tài khoản |
| Khoá riêng chứng chỉ HTTPS | Volume `caddy_data` trên ổ mã hoá | Root trên máy chủ | Giả mạo site (nếu chiếm được cả DNS) | Xoá volume, Caddy tự xin lại |
| Tài khoản GitHub | 2FA | Anh | Deploy được code tuỳ ý (qua bước duyệt) | Thu hồi phiên, đổi 2FA |

Những thứ **không bao giờ** chứa khoá: git (đã quét toàn bộ lịch sử ngày 20/11/2026, chỉ có 2 tệp mẫu `.example`), biến/secret của GitHub (không có secret nào), `terraform.tfstate` (Terraform chỉ tạo tham số không bí mật; `app_settings` có kiểm tra chặn tên khoá bí mật), user data của EC2, tham số của lệnh SSM (chỉ nhận đúng một commit SHA).

## 2. Rủi ro và cách đã chặn

| # | Rủi ro | Đã chặn bằng |
| --- | --- | --- |
| R1 | **Chạy nhầm vào tài khoản công ty** (máy anh đang có profile `aircloset`, và shell đang `export AWS_PROFILE=aircloset`) | Provider có `allowed_account_ids`: Terraform dừng nếu không đúng số tài khoản. Script laptop bỏ qua `AWS_PROFILE` của shell, luôn dùng profile trong `terraform.tfvars`, và dừng nếu số tài khoản khác (`aws-env.sh`). Đã thử với `AWS_PROFILE=aircloset`: script dùng `pcbuilder`. |
| R2 | Commit nhầm khoá lên git | `.gitignore` chặn `terraform.tfvars`, state, `.env.prod`. Job `secret-scan` (gitleaks, có kiểm SHA-256) quét toàn bộ lịch sử ở mỗi lần push, chặn deploy nếu thấy khoá. AWS không có access key nào để lộ. |
| R3 | Lộ access key AWS của anh | Không tạo access key. Đăng nhập SSO + MFA, phiên tạm. Root không có access key. |
| R4 | Tài khoản GitHub hoặc workflow bị chiếm | Role chỉ tin job thuộc `repo:yamadaOliva/pc-builder:environment:production`; environment chỉ cho nhánh `main` và cần anh duyệt. Role chỉ đẩy được image vào 2 repo ECR và chạy **đúng tài liệu `pcbuilder-deploy`** trên **đúng máy này**; không được chạy `AWS-RunShellScript`, nên không có shell root từ CI. Action bên thứ ba ghim theo commit SHA. |
| R5 | Lỗi SSRF trong app bị dùng để lấy credential của máy | IMDSv2 bắt buộc, hop limit = 1: container ở cách một bước mạng nên không chạm được metadata. |
| R6 | Máy chủ bị chiếm | Không có SSH, không có key pair; chỉ mở 80/443; chiều ra chỉ 80/443. Container chạy không phải root, `cap_drop: ALL`, `no-new-privileges` (Caddy chỉ giữ `NET_BIND_SERVICE`; đã kiểm bằng `/proc/1/status`). `.env` thuộc root, quyền 0600. Role máy chủ bị chặn đọc mọi tham số ngoài `/pcbuilder/prod`, không đọc, liệt kê hay xoá được backup. |
| R7 | Bị đào coin, hoá đơn tăng vọt | Budget báo qua email. CPU credit `standard`: máy không vượt mức nền nên không phát sinh phí CPU. |
| R8 | Mất dữ liệu | `pg_dump` lên S3 lúc 07:30 và 19:30 (có version, giữ 30 ngày), snapshot cả ổ lúc 01:00 (giữ 7 bản). Quá 24 giờ không có backup thành công thì có cảnh báo. Có bảo vệ chống terminate máy. |
| R9 | Khoá lọt ra màn hình, lịch sử shell, `ps` | `secrets.sh` sinh khoá tại chỗ hoặc nhập ẩn (`read -s`), gửi qua tệp tạm 0600 (`--value file://…`), `copy` đưa thẳng vào clipboard. `seed.sh` nhập ẩn, truyền vào container bằng `-e NAME` không kèm giá trị. Mật khẩu DB đồng bộ qua stdin. Đã kiểm: không giá trị nào xuất hiện trong tham số dòng lệnh. |
| R10 | Tấn công thẳng vào Postgres/Redis | Không mở cổng, chỉ nằm trong mạng Docker nội bộ. |
| R11 | Chuỗi cung ứng (image, binary bị tráo) | Image Postgres/Redis/Caddy lấy từ ECR Public (mirror chính thức). Docker Compose ghim phiên bản và kiểm SHA-256. Image app có tag bất biến và được ECR quét lỗ hổng khi đẩy. |
| R12 | Webhook SePay giả | API kiểm header `Authorization: Apikey`. API từ chối khởi động nếu khoá ngắn hoặc là khoá mặc định. |
| R13 | Khoá Gemini bị lạm dụng | Khoá chỉ nằm trên máy chủ. Nên giới hạn khoá chỉ cho "Generative Language API" trong Google Cloud Console. Tài khoản free không gắn thẻ thì không phát sinh phí. |

Trivy quét Terraform không còn cảnh báo mức MEDIUM trở lên. 4 điểm em chấp nhận có chủ ý (ghi `trivy:ignore` kèm lý do trong code):

- KMS do mình quản lý (thêm 1 USD/tháng cho mỗi khoá);
- mã hoá SNS (CloudWatch không gửi được vào topic dùng khoá AWS quản lý);
- VPC flow logs (tính phí theo GB);
- chiều ra 0.0.0.0/0 trên 80/443 (ECR, Gemini, Let's Encrypt không có dải IP cố định).

## 3. Kế hoạch setup (làm theo thứ tự)

Tổng thời gian khoảng 1,5–2 giờ, phần lớn là chờ. Đánh dấu từng ô khi xong.

### Giai đoạn 0: Tài khoản AWS riêng (30 phút)

- [ ] Tạo **tài khoản AWS cá nhân mới** bằng email cá nhân. **Không dùng tài khoản `aircloset`.** Đồ án cần tách hẳn khỏi hạ tầng công ty.
- [ ] Root: đặt mật khẩu dài, lưu trong trình quản lý mật khẩu, **bật MFA** (passkey hoặc app OTP). **Không tạo access key cho root.** Sau bước này root chỉ dùng cho việc thanh toán.
- [ ] Trong **IAM Identity Center** (bật ở region `ap-southeast-1`):
  - tạo user cho anh, bắt buộc MFA;
  - tạo permission set `AdministratorAccess`, thời lượng phiên 4 giờ;
  - gán user và permission set vào tài khoản.
- [ ] Trên laptop:
  ```bash
  aws configure sso --profile pcbuilder      # nhập SSO start URL, region ap-southeast-1, chọn tài khoản mới
  aws sso login --profile pcbuilder
  aws sts get-caller-identity --profile pcbuilder   # phải ra số tài khoản MỚI, không phải tài khoản công ty
  ```

### Giai đoạn 1: Công cụ trên laptop

- [ ] `terraform` ≥ 1.5 (máy đang có 1.5.7), AWS CLI v2 (có sẵn), `gh` (có sẵn).
- [ ] Plugin Session Manager: `brew install --cask session-manager-plugin`

### Giai đoạn 2: Dựng hạ tầng (15 phút)

```bash
cd infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars    # điền aws_account_id, domain, alert_email
terraform init
terraform plan -out=tfplan                     # đọc kỹ: chỉ thấy "create", không có "destroy"
terraform apply tfplan
terraform output
```

- [ ] Mở email, bấm **Confirm subscription** của AWS SNS. Chưa bấm thì không nhận được cảnh báo.
- [ ] Đợi khoảng 5 phút cho máy cài xong Docker. Kiểm tra máy đã kết nối SSM:
  ```bash
  aws ssm describe-instance-information --profile pcbuilder --query 'InstanceInformationList[].[InstanceId,PingStatus]'
  ```
- [ ] **Chưa có tên miền?** Lấy `public_ip` từ output, đặt `domain = "<ip-viết-bằng-gạch-ngang>.sslip.io"` (ví dụ IP `13.250.1.2` thành `13-250-1-2.sslip.io`), rồi `terraform apply` lại. Lần apply này chỉ đổi một tham số. Let's Encrypt cấp chứng chỉ được cho tên sslip.io.

### Giai đoạn 3: Nạp khoá (5 phút)

```bash
infra/aws/scripts/secrets.sh init     # tự sinh 4 khoá ngẫu nhiên, hỏi số tài khoản nhận tiền và khoá Gemini (nhập ẩn)
infra/aws/scripts/secrets.sh list     # chỉ hiện tên và ngày, không hiện giá trị
```

- [ ] Khoá Gemini: tạo ở https://aistudio.google.com/apikey. Trong Google Cloud Console, mục *API restrictions*, giới hạn khoá chỉ cho *Generative Language API*. Để trống nếu chưa có; chatbot sẽ chạy chế độ rule-based.

### Giai đoạn 4: Tên miền

- [ ] Tạo bản ghi **A**: `domain` trỏ về `public_ip`. Nếu dùng Cloudflare, để chế độ **DNS only** (mây xám), vì proxy của Cloudflare đệm luồng SSE của chatbot.
- [ ] Kiểm tra: `dig +short <domain>` phải ra đúng IP.

### Giai đoạn 5: GitHub (10 phút)

- [ ] Bật 2FA cho tài khoản GitHub (nếu chưa).
- [ ] *Settings → Environments → New environment* tên `production`:
  - *Required reviewers*: chọn anh;
  - *Deployment branches and tags*: *Selected branches*, thêm `main`.
- [ ] Thêm 5 **repository variable** (không phải secret: không giá trị nào là bí mật):
  ```bash
  terraform -chdir=infra/aws/terraform output -json github_variables |
    python3 -c 'import json,sys; [print(k, v) for k, v in json.load(sys.stdin).items()]' |
    while read -r name value; do gh variable set "$name" --body "$value"; done
  gh variable list
  ```
- [ ] **Không** tạo GitHub secret nào cho AWS.

### Giai đoạn 6: Deploy lần đầu (15 phút)

- [ ] Push `main` (hoặc `gh workflow run deploy-aws.yml`). Job `secret-scan` chạy trước, rồi job `deploy` chờ anh bấm **Approve** ở tab Actions.
- [ ] Lần đầu build mất khoảng 10 phút trên runner arm64; các lần sau dùng cache. Job tự gọi `https://<domain>/api/health` để kiểm tra.
- [ ] Mở `https://<domain>`. Caddy xin chứng chỉ ở lần truy cập đầu tiên.

### Giai đoạn 7: Nạp dữ liệu mẫu và tài khoản admin

```bash
aws ssm start-session --profile pcbuilder --region ap-southeast-1 \
  --target "$(terraform -chdir=infra/aws/terraform output -raw instance_id)"
sudo /opt/pcbuilder/bin/seed.sh       # gõ SEED, rồi mật khẩu admin (≥ 12 ký tự, nhập ẩn, không được lưu ở đâu)
exit
```

### Giai đoạn 8: Webhook SePay

- [ ] Chép khoá: `infra/aws/scripts/secrets.sh copy SEPAY_API_KEY`. Khoá vào clipboard, không hiện lên màn hình.
- [ ] Trong SePay, tạo webhook:
  - URL: `https://<domain>/api/payments/webhook/sepay`;
  - xác thực: *API Key*, dán giá trị vừa chép.
- [ ] Chép một đoạn chữ bất kỳ để xoá khoá khỏi clipboard.

### Giai đoạn 9: Kiểm tra sau triển khai

- [ ] Header bảo mật: `curl -sI https://<domain>` phải có `strict-transport-security`, `x-frame-options: DENY`, và không có `server:`.
- [ ] Cổng đóng: `nc -zv -w 3 <ip> 22`, `5432`, `6379`, `3000`, `4000` đều phải timeout.
- [ ] Smoke test: `E2E_BASE_URL=https://<domain> E2E_API_URL=https://<domain>/api pnpm e2e --project=smoke`
- [ ] Container không chạm được metadata. Trong Session Manager:
  ```bash
  sudo docker exec pcbuilder-api-1 node -e "fetch('http://169.254.169.254/latest/api/token',{method:'PUT',headers:{'X-aws-ec2-metadata-token-ttl-seconds':'60'},signal:AbortSignal.timeout(3000)}).then(r=>console.log('REACHABLE',r.status),e=>console.log('blocked',e.name))"
  ```
  Kết quả đúng: `blocked TimeoutError`.
- [ ] Backup:
  - chạy thử `sudo systemctl start pcbuilder-backup.service`;
  - trên laptop: `aws s3 ls s3://$(terraform -chdir=infra/aws/terraform output -raw backup_bucket)/postgres/ --profile pcbuilder`;
  - cảnh báo `pcbuilder-backup-missing` chuyển về OK (nó báo động từ lúc tạo đến bản backup đầu tiên).
- [ ] Ghi số liệu thật (IP, thời gian phản hồi, kết quả smoke) vào các chỗ `\canbosung` ở mục 4.5.3 của quyển.

## 4. Vận hành

**Deploy:** push `main`, rồi Approve.

**Quay lại bản cũ:** chạy workflow bằng tay với `image_tag` là SHA cũ (*Actions → Deploy (AWS) → Run workflow*), hoặc từ laptop:
```bash
infra/aws/scripts/ssm-deploy.sh "$(terraform -chdir=infra/aws/terraform output -raw instance_id)" <commit-sha>
```
Migration chỉ chạy tiến, nên chỉ quay lại bản cũ khi schema không đổi giữa hai bản.

**Đổi cấu hình không bí mật** (phí lắp ráp, model Gemini, tên tài khoản VietQR…): sửa `app_settings` trong `terraform.tfvars`, chạy `terraform apply`, rồi `ssm-deploy.sh <instance-id> current`.

**Đổi `compose.yml`, `Caddyfile` hoặc script trên máy chủ:** chạy `terraform apply` để cập nhật tài liệu deploy. Lần deploy kế tiếp sẽ ghi các tệp mới lên máy.

**Xem log** (trong Session Manager):
```bash
sudo bash -c '. /opt/pcbuilder/bin/lib.sh && compose ps && compose logs --tail 100 -f api'
```

**Cập nhật hệ điều hành:** `dnf-automatic` tự cài bản vá bảo mật mỗi ngày. Bản vá kernel cần khởi động lại; mỗi tháng chạy `sudo dnf needs-restarting -r || sudo reboot` một lần. Các container tự chạy lại sau khi máy khởi động.

**Khôi phục cơ sở dữ liệu từ S3:**

Máy chủ không có quyền đọc backup, nên anh tạo một link tải tạm thời từ laptop:
```bash
B=$(terraform -chdir=infra/aws/terraform output -raw backup_bucket)
aws s3 ls "s3://$B/postgres/" --profile pcbuilder                    # chọn bản cần khôi phục
aws s3 presign "s3://$B/postgres/<tệp>.dump" --expires-in 600 --profile pcbuilder
```

Sau đó vào Session Manager và chạy:
```bash
sudo bash -c '. /opt/pcbuilder/bin/lib.sh && compose stop api'
curl -fsS '<link-presign>' | sudo bash -c '. /opt/pcbuilder/bin/lib.sh && compose exec -T postgres sh -c "pg_restore --clean --if-exists --no-owner -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\""'
sudo bash -c '. /opt/pcbuilder/bin/lib.sh && compose start api'
```

**Khôi phục cả máy:**
- tạo volume từ snapshot DLM gần nhất (*EC2 → Snapshots*, tag `Backup=pcbuilder-daily`);
- gắn volume vào một máy mới, hoặc chạy `terraform apply -replace=aws_instance.app` rồi khôi phục DB từ S3 như trên.

## 5. Thay khoá

| Việc | Lệnh | Ảnh hưởng |
| --- | --- | --- |
| Đổi JWT access | `secrets.sh rotate JWT_ACCESS_SECRET` rồi `ssm-deploy.sh <id> current` | Access token cũ hết hiệu lực, trình duyệt tự xin lại bằng refresh token |
| Đổi JWT refresh | `secrets.sh rotate JWT_REFRESH_SECRET` rồi `ssm-deploy.sh <id> current` | Mọi người phải đăng nhập lại |
| Đổi khoá SePay | `secrets.sh rotate SEPAY_API_KEY`, `ssm-deploy.sh <id> current`, `secrets.sh copy SEPAY_API_KEY`, rồi dán ngay sang SePay | Webhook đến trong khoảng giữa bị từ chối; đối chiếu giao dịch trên SePay và xác nhận tay nếu có |
| Đổi mật khẩu DB | `secrets.sh rotate POSTGRES_PASSWORD` rồi `ssm-deploy.sh <id> current` | `deploy.sh` tự đặt mật khẩu mới cho role trước khi khởi động lại API (đã thử: dữ liệu giữ nguyên) |
| Đổi khoá Gemini | Tạo khoá mới, `secrets.sh set GEMINI_API_KEY`, `ssm-deploy.sh <id> current`, rồi xoá khoá cũ ở AI Studio | Không |
| Đổi mật khẩu admin web | Trang Tài khoản → Đổi mật khẩu | Các phiên khác bị đăng xuất |

Nên thay JWT và khoá SePay mỗi 6 tháng. Thay ngay khi nghi lộ.

**Khi nghi bị xâm nhập**, làm theo thứ tự:

1. **Chặn deploy:**
   ```bash
   aws iam put-role-policy --role-name pcbuilder-github-deploy --policy-name emergency-deny \
     --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]}' --profile pcbuilder
   ```
   Sau đó, trong IAM console, mở role này và chọn *Revoke active sessions*. Làm tương tự với role `pcbuilder-server` nếu nghi máy chủ.
2. **Thay toàn bộ khoá ở mục 5.** Nếu nghi máy chủ, dựng máy mới (`terraform apply -replace=aws_instance.app`, cần tắt `termination_protection` trước), rồi khôi phục DB từ bản backup trước thời điểm nghi ngờ.
3. **Điều tra:**
   - CloudTrail *Event history* (miễn phí, giữ 90 ngày): ai gọi API gì;
   - lịch sử *Run Command* của SSM;
   - các image được đẩy lên ECR;
   - hoá đơn AWS.
4. Khi đã sạch, xoá policy `emergency-deny`.

## 6. Gỡ bỏ

```bash
cd infra/aws/terraform
terraform apply -var termination_protection=false
terraform destroy
```

Ba thứ cố ý **không** tự xoá, để tránh mất dữ liệu nhầm:
- **bucket backup còn dữ liệu:** xoá mọi phiên bản trong S3 console trước;
- **repo ECR còn image:** xoá image trước;
- **snapshot đã tạo:** xoá tay.

Khoá trong Parameter Store do `secrets.sh` tạo nên Terraform không quản lý. Xoá bằng:
```bash
aws ssm delete-parameters --names /pcbuilder/prod/{POSTGRES_PASSWORD,JWT_ACCESS_SECRET,JWT_REFRESH_SECRET,SEPAY_API_KEY,GEMINI_API_KEY,VIETQR_ACCOUNT_NO} --profile pcbuilder
```

## 7. Cố ý chưa làm

| Hạng mục | Vì sao chưa | Khi nào nên làm |
| --- | --- | --- |
| RDS, ElastiCache | Mỗi dịch vụ ≥ 15 USD/tháng, nhiều hơn cả máy chủ | Khi có người dùng thật và cần backup theo thời điểm |
| Load balancer, nhiều máy, nhiều AZ | ALB khoảng 20 USD/tháng; migrator chỉ chạy 1 replica | Khi cần chịu tải hoặc không được phép ngừng chạy |
| GuardDuty | Có phí sau 30 ngày dùng thử | Bật thử 30 ngày trong đợt bảo vệ |
| Trail CloudTrail riêng lưu S3 | *Event history* 90 ngày miễn phí đã đủ | Khi cần giữ log lâu hơn 90 ngày |
| State Terraform trên S3 | Một người làm, state không chứa khoá | Khi nhiều người cùng chạy Terraform |
| Ghi log phiên Session Manager | Cần thêm bucket và cấu hình | Khi có nhiều người được vào máy |
