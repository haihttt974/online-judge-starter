# Agent Guide

Tài liệu này mô tả trạng thái hiện tại của project `online-judge-starter` để agent hoặc developer mới có thể đọc, sửa và kiểm tra project nhanh hơn. Mỗi khi thay đổi cấu trúc, lệnh chạy, API, ngôn ngữ hỗ trợ, luồng chấm bài, Docker hoặc UI, phải cập nhật file này cho đúng với code hiện tại.

## Mục tiêu project

Project là một starter Online Judge chạy nội bộ bằng Docker. Người dùng nhập code, chọn ngôn ngữ, upload các cặp testcase `1.IN` + `1.OUT`, `2.IN` + `2.OUT`, rồi backend biên dịch/chạy chương trình và trả kết quả chấm.

Project hiện hỗ trợ:

- C
- C++
- Python
- Java
- C#
- Pascal

Các trạng thái chính đang dùng: `AC`, `WA`, `PE`, `TLE`, `MLE`, `OLE`, `ER`, `CE`, `NTD`, `SE`. Frontend còn có trạng thái hiển thị trung gian như `P`, `PR`, `C`, `RJ`.

## Cấu trúc thư mục

```text
online-judge-starter/
├── Agent.md
├── Dockerfile
├── docker-compose.yml
├── README.md
├── agent-images/
│   └── README.md
├── server/
│   ├── package.json
│   └── src/
│       ├── judge.js
│       └── server.js
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── profileData.js
        └── style.css
```

Hiện thư mục này không phải git repository theo `git status`.

## Cách chạy

### Chạy bằng Docker với hot reload

Đây là cách chạy chính được README mô tả:

```bash
docker compose up --build
```

Ứng dụng chạy tại:

```text
http://localhost:8080
```

Sau lần build/chạy đầu tiên, các thay đổi code thông thường sẽ tự cập nhật:

- Sửa frontend trong `client/src/*`: Vite HMR tự cập nhật trình duyệt.
- Sửa backend trong `server/src/*`: `nodemon --legacy-watch` tự restart backend.
- Không cần build lại image hoặc chạy lại container khi chỉ sửa code frontend/backend.

Cần build/chạy lại khi sửa `Dockerfile`, `docker-compose.yml`, thêm/xóa dependency trong `package.json`, hoặc container đã bị dừng.

`docker-compose.yml` build image từ `Dockerfile`, expose port `8080`, mount source code vào container và đặt các biến môi trường:

- `NODE_ENV=development`
- `PORT=3000`
- `MAX_OUTPUT_BYTES=1048576`
- `CHOKIDAR_USEPOLLING=true`

Trong chế độ Docker dev hiện tại:

- Vite dev server chạy ở port `8080`.
- Express backend chạy ở port `3000`.
- Vite proxy các request `/api/*` sang `http://127.0.0.1:3000`.
- Source `server/` và `client/` được bind mount vào container.
- `node_modules` của từng phần dùng Docker named volume để không bị bind mount từ host ghi đè.

### Chạy từng phần khi phát triển

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

Vite dev server hiện dùng port `8080` và proxy `/api` sang backend port `3000`.

## Ảnh ngữ cảnh cho agent

Thư mục `agent-images/` dùng để lưu ảnh chụp màn hình, ảnh lỗi, ảnh trạng thái UI hoặc ảnh minh họa chức năng khi cần agent xem hiện trạng trước khi sửa project.

Khi thêm ảnh, nên đặt tên rõ theo mẫu:

```text
YYYY-MM-DD-ten-chuc-nang-mo-ta-ngan.png
```

Ví dụ:

```text
2026-05-01-judge-result-wa-filter.png
2026-05-01-upload-testcase-error.png
2026-05-01-mobile-layout.png
```

Khi hỏi agent về một chức năng dựa trên ảnh, hãy nói rõ tên file trong `agent-images/` và mô tả ngắn điều cần kiểm tra hoặc sửa. Nếu đổi vị trí thư mục ảnh hoặc quy ước đặt tên, phải cập nhật `agent-images/README.md` và `Agent.md`.

## Backend

Backend dùng Node.js CommonJS, Express, CORS và Multer.

File chính:

- `server/src/server.js`: cấu hình HTTP server, static frontend build, health check, API chấm bài.
- `server/src/judge.js`: parse testcase, biên dịch, chạy chương trình, so sánh output, tính điểm.

Script backend:

- `npm start`: chạy `node src/server.js`.
- `npm run dev`: chạy `nodemon --legacy-watch src/server.js` để tự restart khi sửa code backend.
- Backend tự ép `timeLimitMs` và `memoryLimitMb` theo ngôn ngữ trong `LANGUAGE_LIMITS`; không nhận hai giá trị này từ form hoặc request.

### API hiện có

`GET /api/health`

Trả JSON xác nhận server đang chạy.

`GET /api/language-limits/:language`

Trả giới hạn cố định theo ngôn ngữ, ví dụ `{ "timeLimitMs": 2000, "memoryLimitMb": 256 }`.

`POST /api/judge`

Nhận `multipart/form-data`:

- `language`: một trong `c`, `cpp`, `python`, `java`, `csharp`, `pascal`
- `code`: source code
- `maxOutputBytes`: optional, mặc định lấy từ env hoặc `1048576`
- `files`: nhiều file testcase

`POST /api/judge` không cho client tự chọn `timeLimitMs` hoặc `memoryLimitMb`; backend lấy limit từ bảng cố định theo `language`.

Multer đang dùng memory storage, giới hạn tối đa `200` file và `10MB` mỗi file.

### Quy tắc testcase

Backend chỉ nhận file có tên khớp regex:

```text
^(\d+)\.(in|out)$
```

Không phân biệt hoa thường, ví dụ `1.IN`, `1.out` đều hợp lệ. Một testcase chỉ được dùng khi có đủ cả input và expected output. Các testcase được sort theo index tăng dần.

### Luồng chấm bài

1. Kiểm tra ngôn ngữ có trong `SUPPORTED_LANGUAGES`.
2. Parse các cặp testcase upload.
3. Tạo thư mục tạm `judge-<uuid>` trong OS temp directory.
4. Ghi source code vào file đúng theo ngôn ngữ.
5. Biên dịch trước. Nếu biên dịch lỗi hoặc timeout thì trả `CE` cho toàn bộ testcase.
6. Với từng testcase, chạy chương trình với input qua stdin.
7. Áp dụng timeout, giới hạn output và giới hạn bộ nhớ bằng `ulimit -v`.
8. So sánh output:
   - Chuẩn hóa CRLF/LF, bỏ khoảng trắng cuối dòng, trim cuối file.
   - Nếu khớp hoàn toàn sau chuẩn hóa: `AC`.
   - Nếu chỉ khớp theo token/khoảng trắng: `PE`.
   - Còn lại: `WA`.
9. Xóa thư mục tạm trong `finally`.

### Cấu hình ngôn ngữ

`server/src/judge.js` đang cấu hình:

- C: `main.c`, compile `gcc main.c -O2 -std=c11 -lm -o main`, run `./main`
- C++: `main.cpp`, compile `g++ main.cpp -O2 -std=c++17 -lm -o main`, run `./main`
- Python: `main.py`, compile check `python3 -m py_compile main.py`, run `python3 main.py`
- Java: `Main.java`, compile `javac Main.java`, run `java Main`
- C#: `Program.cs`, compile `mcs Program.cs`, run `mono Program.exe`
- Pascal: `main.pas`, compile `fpc main.pas >/tmp/fpc_compile.log 2>&1`, run `./main`

### Giới hạn theo ngôn ngữ

Giới hạn hiện tại được chọn theo hướng thực dụng cho môi trường học code: C/C++/Pascal dùng baseline nhanh, Java/C# có thêm bộ nhớ cho runtime, Python có thêm thời gian vì interpreter chậm hơn.

| Ngôn ngữ | Thời gian/testcase | Bộ nhớ |
| --- | ---: | ---: |
| C | 2000 ms | 256 MB |
| C++ | 2000 ms | 256 MB |
| Pascal | 2000 ms | 256 MB |
| Java | 3000 ms | 512 MB |
| C# | 3000 ms | 512 MB |
| Python | 5000 ms | 512 MB |

Nếu thêm hoặc sửa ngôn ngữ, phải cập nhật đồng thời:

- `SUPPORTED_LANGUAGES` trong `server/src/judge.js`
- `getLanguageConfig()` trong `server/src/judge.js`
- `LANGUAGE_LIMITS` trong `server/src/judge.js`
- `LANGUAGE_OPTIONS` trong `client/src/App.jsx`
- `DEFAULT_CODE` trong `client/src/App.jsx`
- `LANGUAGE_LIMITS` trong `client/src/App.jsx`
- `Dockerfile` nếu cần compiler/runtime mới
- `README.md` và `Agent.md`

## Frontend

Frontend dùng React 18 + Vite.

File chính:

- `client/src/main.jsx`: mount React app vào `#root`.
- `client/src/App.jsx`: toàn bộ state và UI chính.
- `client/src/profileData.js`: cấu hình tên tác giả và contact links.
- `client/src/style.css`: toàn bộ CSS.

Vite dev server hiện được cấu hình trong `client/vite.config.js`:

- Host `0.0.0.0`
- Port `8080`
- Proxy `/api` sang `http://127.0.0.1:3000`

UI hiện có:

- Chọn ngôn ngữ.
- Textarea nhập code với template mặc định theo ngôn ngữ.
- Hiển thị time limit và memory limit cố định theo ngôn ngữ, dạng read-only.
- Upload nhiều file `.IN` và `.OUT`.
- Có thể thêm testcase trực tiếp trên web bằng modal nhập input/output đúng; frontend tạo file ảo `<index>.IN` và `<index>.OUT`, tự chọn số thứ tự tiếp theo theo testcase hợp lệ đang có.
- Sau khi upload, frontend đọc nội dung các cặp testcase hợp lệ ngay trên client và hiển thị chúng ở phần "3. Kết quả chấm bài" với trạng thái `P`/chưa chạy.
- Gọi `POST /api/judge` bằng `fetch`.
- Khi bấm chạy, bảng preview được thay bằng kết quả thật backend trả về.
- Bảng kết quả có các cột input, output thực tế, output đúng, trạng thái, thời gian và ghi chú.
- Với testcase `AC`, các cột input/output thực tế/output đúng hiển thị `-` để bảng gọn hơn; các trạng thái khác hiển thị nội dung preview để đối chiếu lỗi.
- Góc phải phần kết quả hiển thị toàn bộ trạng thái đang có trong danh sách testcase, gồm mã trạng thái, tên đầy đủ và số lượng.
- Hiển thị điểm, số testcase AC, bảng kết quả và chi tiết testcase lỗi.
- Lọc kết quả theo trạng thái.
- Có Mini Toast Notification System trong `client/src/App.jsx` và `client/src/style.css`; dùng cho upload testcase, thêm testcase, bắt đầu chấm, kết quả chấm, validation và lỗi hệ thống. Tránh dùng `alert` cho các thông báo UI mới.
- Header hiển thị tác giả `Lê Duy Hải` và nút mở modal thông tin liên hệ.
- Modal thông tin liên hệ hiển thị Facebook, Zalo, TikTok, Discord, Instagram, LinkedIn, Kaggle và Email.
- Khi cần sửa URL Facebook, Zalo, TikTok, Discord, Instagram, LinkedIn, Kaggle hoặc Email, sửa trong `client/src/profileData.js`.

## Docker

`Dockerfile` dùng `node:20-bookworm-slim`, cài:

- `build-essential`
- `python3`
- `openjdk-17-jdk-headless`
- `mono-devel`
- `fp-compiler`
- `coreutils`

Build flow:

1. Install backend dependencies trong `/app/server`.
2. Install frontend dependencies trong `/app/client`.
3. Copy source.
4. Build frontend bằng `npm run build`.
5. Chạy backend từ `/app/server` bằng `node src/server.js`.

`Dockerfile` vẫn build được frontend production và backend có thể serve `client/dist`. Tuy nhiên `docker-compose.yml` hiện đang override command để chạy chế độ dev hot reload:

- Backend: `cd /app/server && npm install && npm run dev`
- Frontend: `cd /app/client && npm install && npm run dev`

Trong chế độ này, người dùng truy cập Vite ở `http://localhost:8080`; Vite proxy API sang Express backend ở port `3000`.

## Kiểm tra sau khi sửa

Tối thiểu nên chạy:

```bash
docker compose up --build
```

Sau đó kiểm tra hot reload:

- Mở `http://localhost:8080`.
- Sửa một đoạn text hoặc CSS trong `client/src/*` và xác nhận trình duyệt tự cập nhật.
- Sửa một file backend trong `server/src/*` và xác nhận log container báo backend restart.
- Upload một bộ testcase tự tạo theo cặp `1.IN` + `1.OUT`, `2.IN` + `2.OUT`.
- Chạy code mẫu C++ mặc định hoặc code phù hợp với bộ testcase đang upload.
- Kết quả mong đợi: các testcase đúng trả `AC`, điểm được tính theo số testcase pass.

Nếu chỉ sửa frontend:

```bash
cd client
npm run build
```

Nếu chạy backend ngoài Docker khi phát triển:

```bash
cd server
npm run dev
```

Hiện project chưa có test tự động trong `package.json`.

## Lưu ý bảo mật và giới hạn

Project này phù hợp chạy nội bộ, demo, học tập hoặc phòng máy tin cậy. Backend hiện chạy code người dùng bằng process trên cùng container và chỉ giới hạn tương đối bằng timeout, output limit và `ulimit`.

Không coi đây là sandbox an toàn cho Internet công khai. Nếu mở cho người lạ nộp bài, cần nâng cấp kiến trúc:

- Chạy mỗi submission trong container hoặc sandbox riêng.
- Tắt network cho chương trình nộp.
- Giới hạn CPU, RAM, file system và process.
- Có cleanup cứng cho job bị treo.
- Không dùng chung quyền ghi rộng trong container chính.

## Quy ước khi agent sửa project

- Đọc file liên quan trước khi sửa, ưu tiên `rg` để tìm nhanh.
- Không đổi encoding hoặc format tiếng Việt nếu không cần thiết.
- Giữ thay đổi nhỏ, đúng phạm vi yêu cầu.
- Khi đổi API response, trạng thái chấm, ngôn ngữ hỗ trợ hoặc cấu trúc testcase, phải sửa cả frontend, backend, README nếu liên quan và `Agent.md`.
- Khi đổi Docker/runtime/compiler, phải cập nhật `Dockerfile`, `docker-compose.yml` nếu cần, README và `Agent.md`.
- Khi thêm command mới hoặc test mới, cập nhật phần "Cách chạy" hoặc "Kiểm tra sau khi sửa".
- Khi thêm ảnh để mô tả lỗi/trạng thái UI, đặt trong `agent-images/` và đặt tên đủ rõ để liên kết được với chức năng cần sửa.
- Vì project hiện không có git, cần cẩn thận khi chỉnh file: không có lịch sử commit để dễ rollback.

## Checklist cập nhật Agent.md

Mỗi lần sửa project, kiểm tra nhanh:

- Cấu trúc thư mục trong file này còn đúng không?
- Lệnh chạy/build/test còn đúng không?
- API, payload và response có đổi không?
- Ngôn ngữ hỗ trợ và compiler/runtime có đổi không?
- Frontend flow có đổi không?
- Docker/env/port có đổi không?
- Thư mục ảnh ngữ cảnh `agent-images/` hoặc quy ước đặt tên ảnh có đổi không?
- Có thêm rủi ro bảo mật hoặc giới hạn vận hành mới không?
