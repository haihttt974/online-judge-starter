# Agent Guide

## Current architecture

This project is a stateless online judge. The React frontend sends source code and testcases to `POST /api/judge`. The Express backend validates the request, calls a private Judge0 CE API, normalizes results, compares output, and returns immediately.

The app has no submission database, ORM, migration, or required app queue. PostgreSQL and Redis in Docker Compose belong only to Judge0 CE.

## Important files

- `server/src/server.js`: HTTP routes and error handling.
- `server/src/judge.js`: request validation, testcase parsing, bounded-concurrency judging, response compatibility.
- `server/src/services/judge0Client.js`: Judge0 HTTP client and cached `/languages`.
- `server/src/services/outputCompare.js`: legacy-compatible output comparison.
- `server/src/config/judgeConfig.js`: resource and request limits.
- `server/src/config/judge0Languages.js`: app language to Judge0 ID mapping.
- `Dockerfile`: Node.js app image; it intentionally contains no compilers/runtimes.
- `docker-compose.yml`: dev app plus internal Judge0 server/worker/Postgres/Redis.
- `docker-compose.prod.yml`: production app plus internal Judge0 stack.

## API compatibility

Existing frontend request:

- multipart fields: `language`, `code`, and files named `N.IN`/`N.OUT`.
- The frontend can select a directory with `webkitdirectory`; it pairs `N.IN`/`N.OUT` within the same subdirectory and only sends them when judging starts.

Also supported:

- JSON fields: `language`, `sourceCode`, `testcases`.
- testcase expected output aliases: `expectedOutput`, `output`, or `expected`.

The response keeps legacy statuses `AC`, `WA`, `PE`, `TLE`, `MLE`, `OLE`, `ER`, `CE`, `SE` and preview fields used by `client/src/App.jsx`. New detailed fields include `normalizedStatus`, `passed`, `judge0Status`, `stdout`, `stderr`, `compileOutput`, `time`, and `memory`.

The first testcase runs alone so compilation errors stop immediately. Remaining testcases use Judge0's Batch API and worker pool while preserving response order. Runtime error and TLE do not stop subsequent testcases.
If the first testcase compiles but a later testcase reports CE, the backend retries it sequentially because Judge0 recompiles every testcase and concurrent isolate pressure can produce transient failures.

## Security boundaries

- Never add local compiler execution, `child_process`, shell commands, or temp source files back to the backend.
- Never expose Judge0 port `2358` publicly.
- Judge0 has network disabled for submissions.
- Do not log full source code or testcase data.
- Keep request/output limits enforced.
- Each uploaded `.IN` or `.OUT` testcase file is capped at 2 MB.
- The backend is the only Judge0 client.

## Environment

Required Compose secrets:

- `JUDGE0_POSTGRES_PASSWORD`
- `JUDGE0_REDIS_PASSWORD`

Primary backend config:

- `JUDGE0_URL=http://judge0-server:2358`
- `JUDGE0_CPU_TIME_LIMIT`
- `JUDGE0_WALL_TIME_LIMIT`
- `JUDGE0_MEMORY_LIMIT` in KB
- `JUDGE0_MAX_SOURCE_CODE_SIZE`
- `JUDGE0_MAX_TESTCASES`
- `JUDGE0_MAX_STDIN_SIZE`
- `JUDGE0_MAX_EXPECTED_OUTPUT_SIZE`
- `JUDGE0_REQUEST_TIMEOUT_MS`
- `JUDGE0_TESTCASE_CONCURRENCY`
- `JUDGE0_PER_PROCESS_LIMITS` enables a cgroup-v2-compatible Judge0 mode; dev Compose sets it to `true`.
- `MAX_OUTPUT_BYTES`

Language IDs can be overridden with `JUDGE0_LANGUAGE_ID_<LANGUAGE>`. Verify mappings against Judge0 `GET /languages` whenever the Judge0 image changes.

## Commands

```bash
# Create .env from .env.example and set strong passwords first
docker compose up --build

cd server
npm test

cd client
npm run build
```

Dev UI is `http://localhost:8080`. Production Compose publishes only the app on port `80`; Judge0, PostgreSQL, and Redis remain on the internal Docker network.
