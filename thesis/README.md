# Báo cáo đồ án tốt nghiệp (LaTeX)

Quyển báo cáo ĐATN kỹ sư 2026.1 của Phan Hải Dương (20194533), GVHD Trần Nhật Hóa, theo bố cục mẫu
LaTeX của Trường CNTT&TT: bìa, lời cảm ơn, tóm tắt, mục lục, danh mục hình, bảng, thuật ngữ, 6 chương và tài liệu tham khảo.

| Thư mục / tệp | Nội dung |
| --- | --- |
| `main.tex`, `preamble.tex` | Tệp chính và định dạng (Times New Roman 13pt, giãn dòng 1,2, lề trái 3,5 cm, đầu trang ghi tên chương) |
| `frontmatter/` | Bìa, lời cảm ơn, tóm tắt, danh mục thuật ngữ |
| `chapters/ch1..ch6` | Giới thiệu; Khảo sát và phân tích yêu cầu; Công nghệ; Thiết kế, triển khai và đánh giá; Giải pháp nổi bật; Kết luận |
| `backmatter/tai-lieu.tex` | Tài liệu tham khảo (kiểu IEEE) |
| `diagrams/` | Bộ sinh hình: `usecase.py` (use case UML), `sequence.py` (tuần tự), `layers.py` (biểu đồ gói), các tệp Mermaid trong `src/`, `render.cjs` in tất cả ra PDF vector |
| `figures/` | Hình đã dựng sẵn (PDF vector, ảnh chụp giao diện JPEG, ERD) |

## Dựng lại

```bash
brew install tectonic          # một lần; Tectonic tự tải các gói LaTeX khi cần
./build.sh                     # sinh lại hình rồi biên dịch ra main.pdf
# hoặc chỉ biên dịch:  tectonic -X compile main.tex
```

`build.sh` cần Python 3 (dùng `PYTHON=/opt/homebrew/bin/python3.13` nếu `python3` mặc định không phải bản này)
và Node có `@playwright/test` ở thư mục gốc repo.

## Chỗ cần bổ sung số liệu thật

Các chỗ in chữ đỏ `[Cần bổ sung: ...]` (macro `\canbosung`) là số liệu chưa có, không được bịa:

1. Bìa: tên khoa.
2. Mục 4.4.4: độ trễ một lượt chat ở chế độ Gemini thật (`apps/api/eval/smoke-gemini.ts`).
3. Mục 4.4.6: kết quả bộ 30 kịch bản ở chế độ Gemini thật (`pnpm --filter @pc/api eval:ai`).
4. Mục 4.5.3: tên miền, cấu hình VPS, ảnh chụp hệ thống thật, kết quả `E2E_BASE_URL=https://<domain> pnpm e2e:smoke`, webhook SePay thật.
5. Mục 4.5.4: khảo sát người dùng (số người, điểm SUS, góp ý, thay đổi trọng số).
6. Bảng 6.1: dòng "Triển khai thực tế, khảo sát người dùng".

Sau khi điền, tìm lại bằng `grep -rn canbosung chapters frontmatter` để chắc không sót.

## Font

Báo cáo dùng font Times New Roman và Menlo có sẵn trên macOS (Tectonic cảnh báo "build may not be reproducible" vì
đọc font hệ thống, đây là bình thường). Trên Linux hoặc Windows không có các font này, đổi trong `preamble.tex`
`\setmainfont{Times New Roman}` thành `\setmainfont{texgyretermes-regular.otf}` (TeX Gyre Termes, cùng dáng chữ Times).

## Ảnh giao diện

Ảnh trong `figures/ui/` chụp từ ứng dụng đang chạy (web :3000, API :4000, dữ liệu seed). Các trang có ảnh sản phẩm
chụp lại bằng `NODE_PATH=$PWD/node_modules node docs/design/screenshots/capture.cjs <thư-mục>` (chạy ở gốc repo), rồi
đổi sang JPEG rộng tối đa 1800 px. Ảnh sản phẩm nằm ở `apps/web/public/images/products/`, nguồn từng ảnh ở
`docs/data/product-image-sources.csv`.
