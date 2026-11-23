# Triển khai lên AWS bằng ECS (web và API), khoá được bảo vệ

Toàn bộ hệ thống chạy trên **tài khoản AWS cá nhân** (không phải tài khoản công ty), dựng bằng Terraform:

- **Web (Next.js) và API (Express)**: hai container trong cùng một task **ECS Fargate** (ARM64).
- **Cơ sở dữ liệu**: **RDS PostgreSQL 16**.
- **Redis**: **ElastiCache Valkey**.
- **Đường vào duy nhất từ Internet**: **CloudFront**. Nó chuyển request tới một load balancer **nội bộ** qua VPC origin.

Web và API dùng chung một tên miền, nên cookie đăng nhập (`SameSite=Lax`) hoạt động như cũ. Không có khoá dài hạn nào nằm trong git, GitHub, Terraform state, task definition hay log.

```
Trình duyệt ──HTTPS──► CloudFront (TLS, HTTP/2-3, cache file tĩnh, header bảo mật)
                          │ VPC origin (mạng riêng của AWS)
                ┌─────────▼─────────────────────────────────────── VPC 10.20.0.0/16 ─┐
                │  ALB nội bộ (không có IP công khai)                                 │
                │    ├─ /api/* ─► container api :4000 ─┐  cùng một task Fargate        │
                │    └─ còn lại ─► container web :3000 ─┘  (web gọi API qua 127.0.0.1)  │
                │                   │ chỉ nhận kết nối từ ALB                          │
                │      RDS PostgreSQL (TLS) ◄─┤      subnet riêng, không có đường ra   │
                │      ElastiCache Valkey (TLS) ◄─┘                                    │
                └──────────────────────────────────────────────────────────────────────┘
  Parameter Store (SecureString) ──ECS tự nạp khi task khởi động──► biến môi trường của api
  GitHub Actions ──OIDC, phiên 1 giờ──► đẩy image lên ECR, cập nhật service ECS
  Anh (laptop) ──SSO + MFA──► Terraform, secrets.sh, seed.sh, ECS Exec (thay SSH)
```

| Thành phần | Tệp |
| --- | --- |
| Hạ tầng | `infra/aws/terraform/*.tf`: mạng (`network.tf`), CloudFront, ALB, ECS, RDS + Valkey (`data.tf`), ECR, OIDC cho GitHub, cảnh báo |
| Script trên laptop | `infra/aws/scripts/secrets.sh` (khoá), `ecs-deploy.sh` (deploy/rollback), `seed.sh` (dữ liệu mẫu), `aws-env.sh` (khoá chặt profile) |
| CI/CD | `.github/workflows/deploy-aws.yml` |

**Chi phí ước tính.** Giá on-demand ở Singapore, lấy từ bảng giá AWS ngày 20/11/2026:

| Khoản | Đơn giá | USD/tháng |
| --- | --- | --- |
| Fargate ARM, 0,5 vCPU + 1 GB (web + api) | 0,04045/vCPU-giờ, 0,00442/GB-giờ | ≈ 18 |
| IPv4 công khai của task | 0,005/giờ | ≈ 3,7 |
| Application Load Balancer | 0,0252/giờ + LCU | ≈ 19–22 |
| RDS `db.t4g.micro` + 20 GB gp3 | 0,025/giờ, 0,138/GB | ≈ 21 |
| ElastiCache Valkey `cache.t4g.micro` | 0,0192/giờ | ≈ 14 |
| CloudFront | gói miễn phí vĩnh viễn: 1 TB và 10 triệu request mỗi tháng | ≈ 0 |
| ECR, CloudWatch Logs, alarm | | ≈ 1–2 |
| **Tổng** | | **≈ 77–82** |

- Tài khoản mới được tặng **tối đa 200 USD credit** (100 USD khi đăng ký, thêm tối đa 100 USD khi làm các bài khởi động), đủ chạy khoảng 2,5 tháng, tức qua buổi bảo vệ (14/01/2027).
- Ngân sách mặc định là 100 USD/tháng; vượt 80% thì có email.
- Phương án rẻ hơn (một máy EC2 chạy Docker Compose, khoảng 22 USD/tháng) vẫn nằm trong commit `18795c2`, nếu sau này cần.

---

## 0. Thêm tài khoản AWS cá nhân bên cạnh tài khoản công ty

Máy anh đang có profile `aircloset`, và dòng 20 của `~/.zshrc` đặt `export AWS_PROFILE=aircloset`. Mục tiêu: **giữ nguyên tài khoản công ty cho việc công ty**, thêm một profile riêng `pcbuilder`, và làm cho mọi lệnh gõ trong thư mục đồ án tự dùng profile cá nhân.

1. **Tạo tài khoản** tại https://aws.amazon.com bằng **email cá nhân** (không dùng email công ty), thẻ thanh toán cá nhân.
   - Khi được hỏi gói, chọn **Paid plan**. Gói này vẫn nhận 200 USD credit và dùng được mọi dịch vụ.
   - Gói Free tự hết hạn sau 6 tháng và có thể chặn một số dịch vụ.
   - **Không** gắn tài khoản này vào AWS Organization hay SSO của công ty.
2. **Khoá root:**
   - đặt mật khẩu dài, lưu trong trình quản lý mật khẩu;
   - bật **MFA** (passkey hoặc app OTP);
   - **không tạo access key cho root**.

   Từ đây root chỉ dùng cho thanh toán.
3. **Tạo user đăng nhập hằng ngày** bằng IAM Identity Center (console, region **Singapore ap-southeast-1**, chọn *Enable*):
   - *Users → Add user*: user của anh. Trong *Settings → Authentication*, bật *MFA required: Every time they sign in*.
   - *Permission sets → Create*: chọn *AdministratorAccess*, *Session duration* 4 giờ.
   - *AWS accounts → chọn tài khoản → Assign users*: gán user và permission set vừa tạo.
   - Ghi lại **AWS access portal URL** (dạng `https://d-xxxxxxxxxx.awsapps.com/start`).
4. **Thêm profile trên laptop.** Lệnh này chỉ thêm `[profile pcbuilder]`, không đụng tới `aircloset`:
   ```bash
   aws configure sso --profile pcbuilder
   # SSO session name: pcbuilder | SSO start URL: <access portal URL> | SSO region: ap-southeast-1
   # chọn tài khoản cá nhân, role AdministratorAccess | default region: ap-southeast-1 | output: json
   aws sso login --profile pcbuilder
   aws sts get-caller-identity --profile pcbuilder     # phải ra số tài khoản CÁ NHÂN
   ```
5. **Tự đổi profile theo thư mục** bằng direnv:
   ```bash
   brew install direnv
   echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc       # đặt SAU dòng export AWS_PROFILE=aircloset
   exec zsh
   cd ~/panda-project/pc-builder
   echo 'export AWS_PROFILE=pcbuilder' > .envrc       # .envrc đã được gitignore
   direnv allow
   aws sts get-caller-identity                        # trong repo: tài khoản cá nhân
   cd ~ && aws sts get-caller-identity                # ngoài repo: lại là aircloset
   ```
   Không có direnv thì luôn thêm `--profile pcbuilder` khi gõ lệnh `aws` cho đồ án.

**Lớp chặn thứ hai, có sẵn trong code:**
- Terraform khai báo `allowed_account_ids`, nên dừng ngay nếu đang trỏ vào tài khoản khác.
- Các script trong `infra/aws/scripts` bỏ qua `AWS_PROFILE` của shell, luôn dùng profile ghi trong `terraform.tfvars`, và kiểm tra số tài khoản trước khi làm gì. Đã thử với `AWS_PROFILE=aircloset`.

## 1. Các khoá: cất ở đâu, ai đọc được, lộ thì sao

| Khoá | Cất ở đâu | Ai đọc được | Nếu lộ | Cách thay (mục 5) |
| --- | --- | --- | --- | --- |
| Root tài khoản AWS | Trình quản lý mật khẩu + MFA | Anh | Mất tài khoản | Đổi mật khẩu, kiểm tra MFA |
| Quyền admin của anh | Không có khoá dài hạn: SSO cấp phiên 4 giờ sau MFA | Laptop (`~/.aws/sso/cache`) | Phiên tự hết hạn | Thu hồi phiên, đặt lại MFA |
| Quyền deploy của GitHub | Không có khoá: OIDC đổi lấy phiên 1 giờ | Job trong environment `production` của repo này | Đẩy image, cập nhật đúng một service | Chặn role (mục 5) |
| `POSTGRES_PASSWORD` | Parameter Store + RDS | ECS (nạp vào `PGPASSWORD`), admin | DB chỉ nằm trong subnet riêng, chỉ task kết nối được | `rotate` (đổi cả RDS) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Parameter Store | ECS, admin | Giả được token admin | `rotate` |
| `SEPAY_API_KEY` | Parameter Store + trang SePay | ECS, admin, SePay | Đánh dấu đơn đã thanh toán giả | `rotate` rồi dán sang SePay |
| `GEMINI_API_KEY` | Parameter Store (`disabled` nếu chưa có) | ECS, admin | Người khác dùng hết hạn mức | Tạo khoá mới, xoá khoá cũ |
| `VIETQR_ACCOUNT_NO` | Parameter Store | ECS, admin | Không bí mật (in trên QR) | `set` |
| Mật khẩu `admin@pcbuilder.vn` | Hash bcrypt trong DB | Không ai | Vào trang quản trị | Trang Tài khoản |
| Tài khoản GitHub | 2FA | Anh | Deploy code tuỳ ý (qua bước duyệt) | Thu hồi phiên, đổi 2FA |

Những chỗ **không bao giờ** chứa khoá:
- git: đã quét toàn bộ lịch sử;
- biến/secret của GitHub: không có secret nào;
- `terraform.tfstate`: chỉ chứa mật khẩu khởi tạo của RDS, bị thay ngay ở giai đoạn 3;
- task definition: chỉ chứa ARN của tham số, không chứa giá trị;
- tham số của lệnh `run-task`;
- log: pino đã che header `authorization` và `cookie`.

## 2. Rủi ro và cách đã chặn

| # | Rủi ro | Đã chặn bằng |
| --- | --- | --- |
| R1 | Chạy nhầm vào tài khoản công ty | Profile riêng + direnv (mục 0); Terraform có `allowed_account_ids`; script khoá chặt profile và số tài khoản (`aws-env.sh`). |
| R2 | Commit nhầm khoá lên git | `.gitignore` chặn `terraform.tfvars`, state, `.envrc`; job `secret-scan` (gitleaks) quét toàn bộ lịch sử mỗi lần push và chặn deploy nếu có. |
| R3 | Lộ access key AWS | Không tạo access key nào. SSO + MFA, phiên tạm. |
| R4 | Workflow hoặc tài khoản GitHub bị chiếm | Role chỉ tin `repo:yamadaOliva/pc-builder:environment:production`; environment chỉ cho nhánh `main` và cần anh duyệt. Role chỉ đẩy được image vào 2 repo ECR, cập nhật đúng service `pcbuilder-app`, và chỉ chuyển (`iam:PassRole`) được 2 role của task. Action bên thứ ba ghim theo commit SHA. |
| R5 | Tấn công thẳng vào máy chủ, DB, cache | Không có máy chủ để SSH. ALB là load balancer nội bộ, không có IP công khai. Task chỉ nhận kết nối từ ALB. RDS và Valkey nằm ở subnet không có đường ra Internet và chỉ nhận kết nối từ task. Cả hai mã hoá khi lưu và khi truyền (TLS). |
| R6 | Lỗ hổng trong app bị khai thác | Container chạy uid 1000, bỏ mọi capability. Role của task chỉ có quyền ECS Exec, nên lấy được credential của task cũng không làm gì được với AWS. Giới hạn tần suất tính theo IP thật của khách (`TRUST_PROXY_HOPS=2`, đã thử: giả mạo `X-Forwarded-For` không qua mặt được). |
| R7 | Hoá đơn tăng vọt (lộ khoá, bị lạm dụng) | Budget báo qua email; số task cố định là 1. CloudFront có gói miễn phí lớn. |
| R8 | Mất dữ liệu | RDS sao lưu hằng ngày, khôi phục được về bất kỳ thời điểm nào trong 7 ngày. Bật chống xoá; khi xoá vẫn giữ snapshot cuối. Valkey snapshot mỗi ngày. |
| R9 | Khoá lọt ra màn hình, lịch sử shell, `ps`, CloudTrail | `secrets.sh` sinh khoá tại chỗ hoặc nhập ẩn, gửi qua tệp tạm 0600 (`file://`). `seed.sh` cất mật khẩu admin trong Parameter Store chỉ trong lúc chạy; CloudTrail không ghi giá trị SecureString. Đã thử: không giá trị nào lọt vào tham số dòng lệnh. |
| R10 | Deploy hỏng làm sập site | ECS chỉ tắt task cũ khi task mới đã khoẻ. Circuit breaker tự quay về bản trước nếu bản mới không khoẻ. Rollback bằng một lệnh. |
| R11 | Chuỗi cung ứng | Image có tag bất biến theo commit, ECR quét lỗ hổng khi đẩy, action ghim theo SHA, gitleaks tải về có kiểm SHA-256. |

Trivy quét Terraform không còn cảnh báo. Các điểm em chấp nhận có chủ ý đều có ghi chú `trivy:ignore` kèm lý do trong code:

- HTTP giữa CloudFront và ALB, đi qua mạng riêng của AWS;
- không dùng WAF (tối thiểu 5 USD/tháng);
- không dùng KMS do mình quản lý;
- không bật access log và VPC flow log;
- không dùng đăng nhập DB bằng IAM.

## 3. Kế hoạch setup (làm theo thứ tự)

### Giai đoạn 1: Công cụ (5 phút)

- [ ] Làm xong **mục 0**.
- [ ] `terraform` ≥ 1.5 (máy có 1.5.7), AWS CLI v2 và `gh` đã có sẵn.
- [ ] Plugin Session Manager, cần cho ECS Exec: `brew install --cask session-manager-plugin`.

### Giai đoạn 2: Dựng hạ tầng (khoảng 20 phút, phần lớn là chờ RDS, ElastiCache, CloudFront)

```bash
cd infra/aws/terraform
cp terraform.tfvars.example terraform.tfvars    # điền aws_account_id (CÁ NHÂN), alert_email
terraform init
terraform plan -out=tfplan                     # đọc kỹ: chỉ "create", khoảng 60 tài nguyên
terraform apply tfplan
terraform output
```

- [ ] Bấm **Confirm subscription** trong email của AWS SNS.
- [ ] Hai cảnh báo `pcbuilder-web-down` và `pcbuilder-api-down` sẽ báo động cho tới lần deploy đầu tiên. Đây là bình thường.

### Giai đoạn 3: Nạp khoá (3 phút)

```bash
infra/aws/scripts/secrets.sh init
infra/aws/scripts/secrets.sh list               # chỉ hiện tên và ngày, không hiện giá trị
```

- `init` tự sinh 4 khoá ngẫu nhiên. Mật khẩu DB được đặt vào RDS trước, thay mật khẩu khởi tạo, rồi mới ghi vào Parameter Store.
- Script hỏi số tài khoản nhận tiền và khoá Gemini (nhập ẩn; để trống thì chatbot chạy chế độ rule-based).
- Khoá Gemini tạo ở https://aistudio.google.com/apikey. Nên giới hạn khoá chỉ cho *Generative Language API* trong Google Cloud Console.

### Giai đoạn 4: GitHub (5 phút)

- [ ] Bật 2FA cho tài khoản GitHub.
- [ ] *Settings → Environments → New environment* tên `production`:
  - *Required reviewers*: anh;
  - *Deployment branches*: chỉ `main`.
- [ ] Thêm 4 **repository variable**. Không biến nào bí mật, và **không** tạo GitHub secret nào:
  ```bash
  terraform -chdir=infra/aws/terraform output -json github_variables |
    python3 -c 'import json,sys; [print(k, v) for k, v in json.load(sys.stdin).items()]' |
    while read -r name value; do gh variable set "$name" --body "$value"; done
  gh variable list
  ```

### Giai đoạn 5: Deploy lần đầu (khoảng 15 phút)

- [ ] Push `main` (hoặc chạy `gh workflow run deploy-aws.yml`), rồi bấm **Approve** ở tab Actions.
- [ ] Job sẽ:
  - quét khoá;
  - build image arm64 (lần đầu khoảng 10 phút);
  - đẩy lên ECR;
  - đăng ký task definition mới, bật service lên 1 task;
  - chờ task khoẻ, rồi gọi `https://<domain>/api/health`.
- [ ] Mở `terraform output -raw site_url`.

### Giai đoạn 6: Dữ liệu mẫu và tài khoản admin

```bash
infra/aws/scripts/seed.sh      # gõ SEED, rồi mật khẩu admin (≥ 12 ký tự, nhập ẩn)
```

Script chạy một task ECS một lần bằng đúng image đang chạy. Mật khẩu admin chỉ nằm trong Parameter Store trong lúc task chạy và bị xoá ngay sau đó.

### Giai đoạn 7: Webhook SePay

- [ ] `infra/aws/scripts/secrets.sh copy SEPAY_API_KEY`: khoá vào clipboard, không hiện ra màn hình.
- [ ] Trong SePay, tạo webhook:
  - URL: `https://<domain>/api/payments/webhook/sepay`;
  - xác thực: *API Key*, dán giá trị vừa chép.
- [ ] Chép một đoạn chữ khác để xoá khoá khỏi clipboard.

### Giai đoạn 8: Kiểm tra sau triển khai

- [ ] Header: `curl -sI https://<domain>` phải có `strict-transport-security`, `x-frame-options`, `x-content-type-options`.
- [ ] Không có gì lộ ra Internet ngoài CloudFront:
  - `dig +short $(aws elbv2 describe-load-balancers --names pcbuilder --query 'LoadBalancers[0].DNSName' --output text)` chỉ ra địa chỉ `10.20.x.x`;
  - `aws rds describe-db-instances --db-instance-identifier pcbuilder --query 'DBInstances[0].PubliclyAccessible'` trả `false`.
- [ ] Smoke test: `E2E_BASE_URL=https://<domain> E2E_API_URL=https://<domain>/api pnpm e2e --project=smoke`
- [ ] Chat chạy dạng stream: hỏi trợ lý một câu và xem chữ hiện dần.
- [ ] Ghi số liệu thật vào các chỗ `\canbosung` ở mục 4.5 của quyển.

### Tuỳ chọn: tên miền riêng

1. Trong ACM, region **us-east-1** (bắt buộc với CloudFront), yêu cầu chứng chỉ cho `shop.example.com`, chọn kiểu xác thực DNS, rồi thêm bản ghi CNAME xác thực ở nhà cung cấp tên miền.
2. Trong `terraform.tfvars`, đặt `custom_domain` và `custom_domain_certificate_arn`, rồi chạy `terraform apply`.
3. Trỏ `shop.example.com` về `terraform output -raw cloudfront_domain` (bản ghi CNAME, hoặc ALIAS nếu là tên miền gốc).
4. Cập nhật biến `DOMAIN` trên GitHub (chạy lại lệnh ở giai đoạn 4). Đẩy một commit mới để build lại web, vì địa chỉ API được nhúng vào web lúc build: `git commit --allow-empty -m "chore: rebuild for new domain"`.

## 4. Vận hành

| Việc | Lệnh |
| --- | --- |
| Deploy | Push `main` → Approve |
| Quay lại bản cũ | *Actions → Deploy (AWS) → Run workflow*, nhập `image_tag` là SHA cũ; hoặc `infra/aws/scripts/ecs-deploy.sh <sha>`. Migration chỉ chạy tiến, nên chỉ quay lại khi schema không đổi giữa hai bản. |
| Áp dụng khoá vừa đổi | `infra/aws/scripts/ecs-deploy.sh current` |
| Đổi cấu hình không bí mật hoặc kích thước task | Sửa `terraform.tfvars` → `terraform apply` → `ecs-deploy.sh current` |
| Xem log | `aws logs tail /ecs/pcbuilder --follow --since 30m` (dòng `api/…` là API, `web/…` là web) |
| Vào shell container (thay SSH) | `aws ecs execute-command --cluster pcbuilder --container api --interactive --command sh --task $(aws ecs list-tasks --cluster pcbuilder --service-name pcbuilder-app --query 'taskArns[0]' --output text)` |

**Khôi phục cơ sở dữ liệu** về một thời điểm trong 7 ngày gần nhất:

1. Khôi phục ra một instance mới (lấy ID security group DB bằng `terraform state show aws_security_group.db`):
   ```bash
   aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier pcbuilder \
     --target-db-instance-identifier pcbuilder-restored --restore-time 2026-12-01T03:00:00Z \
     --db-subnet-group-name pcbuilder --vpc-security-group-ids <sg-id> --no-publicly-accessible
   ```
2. Khi bản mới sẵn sàng:
   - đổi tên bản cũ thành `pcbuilder-old`, rồi bản mới thành `pcbuilder` (*RDS → Modify → DB instance identifier*), nhờ vậy địa chỉ kết nối giữ nguyên;
   - chạy `secrets.sh rotate POSTGRES_PASSWORD` rồi `ecs-deploy.sh current`.
3. Chạy `terraform plan` để kiểm tra Terraform đã nhận bản mới; khi ổn thì xoá `pcbuilder-old`.

## 5. Thay khoá và xử lý sự cố

| Việc | Lệnh | Ảnh hưởng |
| --- | --- | --- |
| Đổi JWT access | `secrets.sh rotate JWT_ACCESS_SECRET` rồi `ecs-deploy.sh current` | Trình duyệt tự xin lại token |
| Đổi JWT refresh | `secrets.sh rotate JWT_REFRESH_SECRET` rồi `ecs-deploy.sh current` | Mọi người đăng nhập lại |
| Đổi khoá SePay | `rotate SEPAY_API_KEY`, `ecs-deploy.sh current`, `copy SEPAY_API_KEY`, rồi dán ngay sang SePay | Webhook đến trong khoảng giữa bị từ chối; đối chiếu giao dịch trên SePay |
| Đổi mật khẩu DB | `secrets.sh rotate POSTGRES_PASSWORD` rồi `ecs-deploy.sh current` (chạy liền nhau) | Script đổi RDS trước; kết nối cũ vẫn chạy cho tới khi task mới thay thế |
| Đổi khoá Gemini | Tạo khoá mới, `secrets.sh set GEMINI_API_KEY`, `ecs-deploy.sh current`, rồi xoá khoá cũ | Không |
| Đổi mật khẩu admin web | Trang Tài khoản → Đổi mật khẩu | Các phiên khác bị đăng xuất |

Nên thay JWT và khoá SePay mỗi 6 tháng. Thay ngay khi nghi lộ.

**Khi nghi bị xâm nhập**, làm theo thứ tự:

1. **Chặn deploy:**
   ```bash
   aws iam put-role-policy --role-name pcbuilder-github-deploy --policy-name emergency-deny \
     --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Deny","Action":"*","Resource":"*"}]}'
   ```
   Sau đó, trong IAM console, mở role này và chọn *Revoke active sessions*.
2. **Quay lại bản sạch:** `ecs-deploy.sh <sha-tin-cậy>`.
3. **Thay toàn bộ khoá** theo bảng trên.
4. **Điều tra:**
   - CloudTrail *Event history* (miễn phí, giữ 90 ngày);
   - các image được đẩy lên ECR;
   - các revision task definition mới;
   - hoá đơn AWS.
5. Khi đã sạch, xoá policy `emergency-deny`.

## 6. Gỡ bỏ

```bash
cd infra/aws/terraform
terraform apply -var deletion_protection=false
terraform destroy
```

Những thứ cố ý **không** tự xoá:
- snapshot cuối của RDS (`pcbuilder-final`): xoá tay khi chắc chắn không cần;
- repo ECR còn image: xoá image trước;
- các khoá trong Parameter Store do script tạo: `aws ssm delete-parameters --names /pcbuilder/prod/{POSTGRES_PASSWORD,JWT_ACCESS_SECRET,JWT_REFRESH_SECRET,SEPAY_API_KEY,GEMINI_API_KEY,VIETQR_ACCOUNT_NO}`.

CloudFront mất khoảng 15 phút để tắt hẳn.

## 7. Cố ý chưa làm

| Hạng mục | Vì sao chưa | Khi nào nên làm |
| --- | --- | --- |
| RDS Multi-AZ, nhiều task, autoscaling | Gấp đôi chi phí; migrator chỉ nên chạy 1 task | Khi có người dùng thật |
| NAT gateway, VPC endpoint | NAT khoảng 45 USD/tháng; task dùng IP công khai chỉ để đi ra | Khi chuyển task vào subnet riêng |
| AWS WAF | Tối thiểu 5 USD/tháng | Khi bị dò quét, spam |
| GuardDuty | Có phí sau 30 ngày dùng thử | Bật thử trong đợt bảo vệ |
| State Terraform trên S3 | Một người làm, state không chứa khoá đang dùng | Khi nhiều người cùng chạy Terraform |
