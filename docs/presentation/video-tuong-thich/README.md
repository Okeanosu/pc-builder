# Video: tương thích linh kiện và cơ sở dữ liệu

Nguồn dựng video `pc-builder-tuong-thich.mp4` (1920×1080, giọng neural nam NamMinh của Microsoft qua `edge-tts`, phụ đề tiếng Việt, âm lượng chuẩn hóa −16 LUFS). Video đi kèm tài liệu `docs/reports/tuong-thich-linh-kien.pdf`.
File MP4 không đưa vào git vì dung lượng; dựng lại bằng các bước dưới.

| File | Vai trò |
| --- | --- |
| `script.py` | 14 cảnh: hình, chuyển động camera, lời thoại kiêm phụ đề, cách đọc riêng cho tên sản phẩm và đơn vị (`SPEECH_FIXES`) |
| `slides.src.html`, `graph.svg` | 10 slide (bài toán, JSONB, 15 luật, đồ thị ràng buộc, công suất nguồn, ba nơi dùng luật, Engine, CSDL); `assemble_slides.py` ghép đồ thị vào thành `slides.html` |
| `shots.cjs` | Chụp Customizer có 6 xung đột, hộp chọn mainboard làm mờ món sai socket, trang lược đồ thông số và trang sửa sản phẩm (cần web :3000 và API :4000) |
| `loi-thoai.md` | Lời thoại theo mốc thời gian |

Công cụ dùng chung với video giới thiệu nằm ở `../video/`: `slides.cjs`, `captions.py`, `captions.cjs`, `build.py`.
Ảnh ERD lấy từ `docs/reports/erd-co-so-du-lieu.png`, đệm trắng thành khung 16:9 và lưu là `shots/erd.png`.

```bash
# trong một thư mục làm việc có script.py, slides.html, shots/, slides/ và các công cụ ở ../video/
python3 assemble_slides.py
node shots.cjs shots && node slides.cjs slides.html slides
python3 captions.py . && node captions.cjs .
python3 build.py . pc-builder-tuong-thich.mp4
```
