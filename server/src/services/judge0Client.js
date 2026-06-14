const judgeConfig = require("../config/judgeConfig");

class Judge0Error extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "Judge0Error";
    this.code = options.code || "JUDGE0_ERROR";
    this.statusCode = options.statusCode || 502;
  }
}

let languagesCache = null;

async function judge0Request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), judgeConfig.requestTimeoutMs);

  try {
    const response = await fetch(`${judgeConfig.judge0Url}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Judge0Error("Judge service returned an error.", {
        code: "JUDGE0_API_ERROR",
        statusCode: response.status === 429 ? 503 : 502
      });
    }

    return body;
  } catch (error) {
    if (error instanceof Judge0Error) throw error;

    throw new Judge0Error(
      error.name === "AbortError" ? "Judge service request timed out." : "Judge service unavailable.",
      {
        code: error.name === "AbortError" ? "JUDGE0_TIMEOUT" : "JUDGE0_UNAVAILABLE",
        statusCode: 503
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function getJudge0Languages() {
  if (!languagesCache) {
    languagesCache = judge0Request("/languages")
      .then((languages) => {
        if (!Array.isArray(languages)) {
          throw new Judge0Error("Judge service returned an invalid languages response.");
        }
        return languages;
      })
      .catch((error) => {
        languagesCache = null;
        throw error;
      });
  }

  return languagesCache;
}

async function createSubmission(payload) {
  const result = await judge0Request("/submissions?base64_encoded=false&wait=true", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!result?.status?.id && !result?.token) {
    throw new Judge0Error("Judge service returned an incomplete submission result.");
  }
  return result?.status?.id ? result : waitForSubmission(result.token);
}

async function waitForSubmission(token) {
  const deadline = Date.now() + judgeConfig.requestTimeoutMs;

  while (Date.now() < deadline) {
    const result = await judge0Request(
      `/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=${encodeURIComponent("*")}`
    );
    if (Number(result?.status?.id) > 2) return result;
    await new Promise((resolve) => setTimeout(resolve, judgeConfig.pollIntervalMs));
  }

  throw new Judge0Error("Judge service request timed out.", {
    code: "JUDGE0_TIMEOUT",
    statusCode: 503
  });
}

function submissionPayload({
  sourceCode,
  languageId,
  stdin,
  expectedOutput,
  timeLimit,
  wallTimeLimit,
  memoryLimit
}) {
  return {
    source_code: sourceCode,
    language_id: languageId,
    stdin,
    expected_output: expectedOutput,
    cpu_time_limit: timeLimit,
    wall_time_limit: wallTimeLimit,
    memory_limit: memoryLimit,
    max_file_size: Math.ceil(judgeConfig.maxOutputBytes / 1024),
    enable_per_process_and_thread_time_limit: judgeConfig.perProcessLimits,
    enable_per_process_and_thread_memory_limit: judgeConfig.perProcessLimits,
    enable_network: false
  };
}

async function runCodeWithTestcase({
  sourceCode,
  languageId,
  stdin,
  expectedOutput,
  timeLimit,
  wallTimeLimit,
  memoryLimit
}) {
  return createSubmission(submissionPayload({
    sourceCode, languageId, stdin, expectedOutput, timeLimit, wallTimeLimit, memoryLimit
  }));
}

async function waitForBatch(tokens) {
  const deadline = Date.now() + judgeConfig.requestTimeoutMs;
  const tokenList = tokens.map(encodeURIComponent).join(",");

  while (Date.now() < deadline) {
    const result = await judge0Request(
      `/submissions/batch?tokens=${tokenList}&base64_encoded=false&fields=${encodeURIComponent("*")}`
    );
    if (!Array.isArray(result?.submissions)) {
      throw new Judge0Error("Judge service returned an invalid batch result.");
    }
    if (result.submissions.every((submission) => Number(submission?.status?.id) > 2)) {
      return result.submissions;
    }
    await new Promise((resolve) => setTimeout(resolve, judgeConfig.pollIntervalMs));
  }

  throw new Judge0Error("Judge service request timed out.", {
    code: "JUDGE0_TIMEOUT",
    statusCode: 503
  });
}

async function runCodeBatch(submissions) {
  const payloads = submissions.map(submissionPayload);
  const created = await judge0Request("/submissions/batch?base64_encoded=false", {
    method: "POST",
    body: JSON.stringify({ submissions: payloads })
  });
  if (!Array.isArray(created) || created.some((item) => !item?.token)) {
    throw new Judge0Error("Judge service returned an incomplete batch response.");
  }
  return waitForBatch(created.map((item) => item.token));
}

module.exports = {
  Judge0Error,
  createSubmission,
  getJudge0Languages,
  runCodeBatch,
  runCodeWithTestcase,
  waitForSubmission
};
