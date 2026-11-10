# Video giới thiệu PC Builder

Nguồn dựng video `pc-builder-gioi-thieu.mp4` (1920×1080, giọng neural tiếng Việt của Microsoft qua `edge-tts`, phụ đề tiếng Việt, âm lượng chuẩn hóa −16 LUFS).
File MP4 không đưa vào git vì dung lượng; dựng lại bằng các bước dưới.

| File | Vai trò |
| --- | --- |
| `script.py` | 18 cảnh: hình, chuyển động camera, lời đọc (`say`) và phụ đề (`cap`) |
| `slides.html` | 9 slide kỹ thuật (kiến trúc, function calling, engine, dự phòng…) |
| `shots.cjs` | Chụp các trang web ở 1920×1080 @2x (cần web :3000 và API :4000 đang chạy) |
| `slides.cjs` | Xuất từng slide thành PNG |
| `captions.py`, `captions.cjs` | Vẽ phụ đề thành ảnh trong suốt |
| `build.py` | Đọc lời thoại (mặc định giọng neural nam NamMinh, có cache và tự thử lại), zoom chậm từng cảnh, ghép phụ đề, chuẩn hóa âm lượng, nối thành MP4 và xuất `.srt` |
| `loi-thoai.md` | Lời thoại theo mốc thời gian, dùng khi muốn tự thu giọng |

Dựng lại (cần ffmpeg, Playwright, Pillow, `pip install edge-tts`; chạy từ thư mục làm việc chứa các file này).
Đổi giọng: `TTS_VOICE=vi-VN-HoaiMyNeural` (nữ) hoặc `vi-VN-NamMinhNeural` (nam, mặc định); giọng macOS offline: `TTS=say`; giọng F5-TTS sinh sẵn trong thư mục `f5/`: `TTS=f5`.

```bash
node shots.cjs shots && node slides.cjs slides.html slides
python3 captions.py . && node captions.cjs .
python3 build.py . pc-builder-gioi-thieu.mp4
```
