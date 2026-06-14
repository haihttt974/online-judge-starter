function readPositiveNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readBoolean(name, fallback = false) {
  if (process.env[name] === undefined) return fallback;
  return String(process.env[name]).toLowerCase() === "true";
}

const MAX_TESTCASE_FILE_BYTES = 2 * 1024 * 1024;

const judgeConfig = {
  judge0Url: String(process.env.JUDGE0_URL || "http://judge0-server:2358").replace(/\/+$/, ""),
  cpuTimeLimit: readPositiveNumber("JUDGE0_CPU_TIME_LIMIT", 2),
  wallTimeLimit: readPositiveNumber("JUDGE0_WALL_TIME_LIMIT", 5),
  memoryLimitKb: readPositiveNumber("JUDGE0_MEMORY_LIMIT", 128000),
  maxOutputBytes: readPositiveNumber("MAX_OUTPUT_BYTES", 1024 * 1024),
  maxSourceCodeBytes: readPositiveNumber("JUDGE0_MAX_SOURCE_CODE_SIZE", 64 * 1024),
  maxTestcases: readPositiveNumber("JUDGE0_MAX_TESTCASES", 50),
  maxStdinBytes: Math.min(readPositiveNumber("JUDGE0_MAX_STDIN_SIZE", MAX_TESTCASE_FILE_BYTES), MAX_TESTCASE_FILE_BYTES),
  maxExpectedOutputBytes: Math.min(
    readPositiveNumber("JUDGE0_MAX_EXPECTED_OUTPUT_SIZE", MAX_TESTCASE_FILE_BYTES),
    MAX_TESTCASE_FILE_BYTES
  ),
  testcaseConcurrency: Math.max(1, Math.floor(readPositiveNumber("JUDGE0_TESTCASE_CONCURRENCY", 4))),
  batchSize: Math.min(20, Math.max(1, Math.floor(readPositiveNumber("JUDGE0_BATCH_SIZE", 20)))),
  useBatch: readBoolean("JUDGE0_USE_BATCH", true),
  compilationRetryCount: Math.max(0, Math.floor(readPositiveNumber("JUDGE0_COMPILATION_RETRY_COUNT", 2))),
  maxResponseFieldBytes: readPositiveNumber("JUDGE_MAX_RESPONSE_FIELD_BYTES", 16 * 1024),
  pollIntervalMs: Math.max(50, Math.floor(readPositiveNumber("JUDGE0_POLL_INTERVAL_MS", 100))),
  perProcessLimits: readBoolean("JUDGE0_PER_PROCESS_LIMITS"),
  requestTimeoutMs: readPositiveNumber("JUDGE0_REQUEST_TIMEOUT_MS", 60000)
};

module.exports = judgeConfig;
