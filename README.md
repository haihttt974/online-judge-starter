# Online Judge Starter

Stateless online judge: frontend gui code va testcase den Express backend, backend goi Judge0 CE self-hosted va tra ket qua ngay. App khong luu submission va khong co database rieng.

## Kien truc

```text
Frontend -> POST /api/judge -> Node.js backend -> Judge0 CE internal API
                                              -> Judge0 worker/isolate
```

- Frontend khong goi Judge0 truc tiep.
- Backend khong compile/run code va khong dung `child_process`.
- PostgreSQL va Redis trong Compose chi phuc vu Judge0.
- Judge0 khong publish port ra host.

## Chay local

Development co password local mac dinh, nen co the chay ngay:

```bash
docker compose up --build
```

Mo `http://localhost:8080`. Lan dau Judge0 can tai image va khoi tao database nen co the mat vai phut.

Khong chay rieng `cd client && npm run dev` neu can cham bai: lenh do chi khoi dong frontend, khong khoi dong backend/Judge0. Production van bat buoc dat password manh theo `.env.example`.

Production:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## API

Frontend hien tai gui `multipart/form-data`:

- `language`: `c`, `cpp`, `python`, `java`, `csharp`, `pascal`
- `code`: source code
- `files`: cac cap `1.IN` + `1.OUT`, `2.IN` + `2.OUT`, ...

Frontend cho phep chon nhieu file hoac chon ca folder testcase. Khi chon folder, trinh duyet quet de quy, ghep cac file `N.IN`/`N.OUT` trong cung thu muc con, va thong bao so testcase hop le. File chi duoc gui den backend khi bam cham bai.

Backend cung ho tro JSON voi `sourceCode` va mang `testcases`. Response van giu cac status cu `AC`, `WA`, `PE`, `TLE`, `MLE`, `OLE`, `ER`, `CE`, `SE` de tuong thich frontend, dong thoi bo sung `normalizedStatus`, `judge0Status`, `stdout`, `stderr`, `compileOutput`, `time`, va `memory`.

## Cau hinh

Bat buoc trong `.env`:

- `JUDGE0_POSTGRES_PASSWORD`
- `JUDGE0_REDIS_PASSWORD`

Backend mac dinh goi `JUDGE0_URL=http://judge0-server:2358`. Co the override:

- `JUDGE0_CPU_TIME_LIMIT`, `JUDGE0_WALL_TIME_LIMIT`, `JUDGE0_MEMORY_LIMIT` (KB)
- `JUDGE0_MAX_MEMORY_LIMIT`: tran bo nho Judge0, mac dinh `524288` KB de khop voi limit 512 MiB cua Java/C#/Python
- `JUDGE0_MAX_SOURCE_CODE_SIZE`, `JUDGE0_MAX_TESTCASES`
- `JUDGE0_MAX_STDIN_SIZE`, `JUDGE0_MAX_EXPECTED_OUTPUT_SIZE`
- `JUDGE0_REQUEST_TIMEOUT_MS`, `MAX_OUTPUT_BYTES`
- `JUDGE0_TESTCASE_CONCURRENCY`: so testcase chay dong thoi sau testcase dau, mac dinh `4`; CE bat thuong duoc retry tuan tu
- `JUDGE0_COMPILATION_RETRY_COUNT`: retry CE bat thuong sau khi testcase dau da compile thanh cong, mac dinh `2`
- `JUDGE0_USE_BATCH`, `JUDGE0_BATCH_SIZE`: giao testcase con lai cho worker pool theo batch, mac dinh `true` va `20`
- `JUDGE0_WORKER_COUNT`: so worker Judge0, mac dinh `8` de can bang throughput va tai nguyen tren Docker Desktop
- `JUDGE_MAX_RESPONSE_FIELD_BYTES`: gioi han moi truong du lieu tra ve frontend, mac dinh `16384`
- `JUDGE0_PER_PROCESS_LIMITS`: dat `true` tren Docker Desktop/cgroup v2; production cgroup v1 nen giu `false`
- `JUDGE0_LANGUAGE_ID_C`, `JUDGE0_LANGUAGE_ID_CPP`, `JUDGE0_LANGUAGE_ID_PYTHON`, `JUDGE0_LANGUAGE_ID_JAVA`, `JUDGE0_LANGUAGE_ID_CSHARP`, `JUDGE0_LANGUAGE_ID_PASCAL`

Language IDs phu thuoc version Judge0. Kiem tra `/languages` cua Judge0 trong internal network va pin `JUDGE0_IMAGE` trong production.

Moi file testcase `.IN` hoac `.OUT` duoc gioi han toi da `2 MB` (`2097152` byte). Cac bien `JUDGE0_MAX_STDIN_SIZE` va `JUDGE0_MAX_EXPECTED_OUTPUT_SIZE` co the dat thap hon, nhung khong the nang tran vuot qua 2 MB.

## Test

```bash
cd server
npm test
```

Test nhanh API bang JSON:

```bash
curl -X POST http://localhost:3000/api/judge \
  -H "Content-Type: application/json" \
  -d '{"language":"cpp","sourceCode":"#include <iostream>\nint main(){int a,b;std::cin>>a>>b;std::cout<<a+b;}","testcases":[{"input":"1 2\n","expectedOutput":"3\n"}]}'
```

Trong dev Compose, thay port `3000` bang `8080`.

## Gioi han

Testcase dau duoc chay rieng de compilation error dung som. Cac testcase con lai chay dong thoi co gioi han de giam latency. Backend khong co queue va khong luu submission. Neu mo public, can bo sung rate limit/auth o lop API va pin/cau hinh Judge0 theo ha tang thuc te.
