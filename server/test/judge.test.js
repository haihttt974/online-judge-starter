const assert = require("node:assert/strict");
const http = require("node:http");
const { after, before, test } = require("node:test");

process.env.JUDGE0_URL = "http://127.0.0.1:24681";
process.env.JUDGE0_REQUEST_TIMEOUT_MS = "1000";
process.env.JUDGE0_MAX_TESTCASES = "2";

let submissionCount = 0;
let flakyCompilationCount = 0;
let tokenCount = 0;
const batchResults = new Map();

function resultForPayload(payload) {
  const response = {
    stdout: payload.expected_output,
    stderr: null,
    compile_output: null,
    time: "0.01",
    memory: 1024,
    status: { id: 3, description: "Accepted" }
  };
  if (payload.source_code === "WA") Object.assign(response, { stdout: "wrong\n", status: { id: 4, description: "Wrong Answer" } });
  if (payload.source_code === "CE") Object.assign(response, { stdout: null, compile_output: "compile failed", status: { id: 6, description: "Compilation Error" } });
  if (payload.source_code === "FLAKY_CE" && payload.stdin === "1\n" && flakyCompilationCount++ === 0) {
    Object.assign(response, { stdout: null, compile_output: "transient compile failure", status: { id: 6, description: "Compilation Error" } });
  }
  if (payload.source_code === "RE") Object.assign(response, { stdout: null, stderr: "runtime failed", status: { id: 11, description: "Runtime Error (NZEC)" } });
  if (payload.source_code === "TLE") Object.assign(response, { stdout: null, status: { id: 5, description: "Time Limit Exceeded" } });
  return response;
}

const mockJudge0 = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/languages") {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify([{ id: 54, name: "C++" }, { id: 71, name: "Python" }]));
  }
  if (req.method === "GET" && req.url.startsWith("/submissions/batch?")) {
    const tokens = new URL(req.url, "http://localhost").searchParams.get("tokens").split(",");
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify({ submissions: tokens.map((token) => batchResults.get(token)) }));
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    const payload = JSON.parse(body);
    if (req.url.startsWith("/submissions/batch?")) {
      const created = payload.submissions.map((submission) => {
        submissionCount += 1;
        const token = `token-${++tokenCount}`;
        batchResults.set(token, resultForPayload(submission));
        return { token };
      });
      res.setHeader("content-type", "application/json");
      return res.end(JSON.stringify(created));
    }

    submissionCount += 1;
    if (payload.source_code === "UNAVAILABLE") return req.socket.destroy();

    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(resultForPayload(payload)));
  });
});

before(() => new Promise((resolve) => mockJudge0.listen(24681, "127.0.0.1", resolve)));
after(() => new Promise((resolve) => mockJudge0.close(resolve)));

const { Judge0Error, JudgeRequestError, judgeSubmission, validateJudgeRequest } = require("../src/judge");
const { compareOutput, normalizeOutput } = require("../src/services/outputCompare");

function testcases(count = 1) {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    input: `${index}\n`,
    expectedOutput: `${index + 1}\n`
  }));
}

test("output comparison preserves legacy CRLF and trailing-whitespace behavior", () => {
  assert.equal(normalizeOutput("a  \r\nb\t\r\n"), "a\nb");
  assert.equal(compareOutput("a  \r\nb\t\r\n", "a\nb\n"), true);
});

test("C++ accepted and wrong answer are normalized to legacy response fields", async () => {
  const accepted = await judgeSubmission({ language: "cpp", sourceCode: "OK", testcases: testcases() });
  assert.equal(accepted.status, "AC");
  assert.equal(accepted.normalizedStatus, "accepted");
  assert.equal(accepted.results[0].passed, true);

  const wrong = await judgeSubmission({ language: "cpp", sourceCode: "WA", testcases: testcases() });
  assert.equal(wrong.status, "WA");
  assert.equal(wrong.results[0].normalizedStatus, "wrong_answer");
});

test("compilation error stops remaining testcases", async () => {
  const beforeCount = submissionCount;
  const result = await judgeSubmission({ language: "cpp", sourceCode: "CE", testcases: testcases(2) });
  assert.equal(result.status, "CE");
  assert.equal(result.executedTests, 1);
  assert.equal(result.compileOutput, "compile failed");
  assert.equal(submissionCount - beforeCount, 1);
});

test("concurrent testcase execution preserves result order", async () => {
  const result = await judgeSubmission({ language: "cpp", sourceCode: "OK", testcases: testcases(2) });
  assert.deepEqual(result.results.map((item) => item.index), [1, 2]);
});

test("later transient compilation error is retried after successful preflight", async () => {
  flakyCompilationCount = 0;
  const result = await judgeSubmission({ language: "cpp", sourceCode: "FLAKY_CE", testcases: testcases(2) });
  assert.equal(result.status, "AC");
  assert.deepEqual(result.results.map((item) => item.status), ["AC", "AC"]);
});

test("Python runtime error and time limit exceeded are normalized", async () => {
  const runtime = await judgeSubmission({ language: "python", sourceCode: "RE", testcases: testcases() });
  assert.equal(runtime.status, "ER");
  assert.equal(runtime.results[0].normalizedStatus, "runtime_error");

  const timeout = await judgeSubmission({ language: "python", sourceCode: "TLE", testcases: testcases() });
  assert.equal(timeout.status, "TLE");
  assert.equal(timeout.results[0].normalizedStatus, "time_limit_exceeded");
});

test("request validation rejects unsupported language, empty code and too many testcases", () => {
  assert.throws(() => validateJudgeRequest({ language: "ruby", code: "x", testcases: testcases() }), JudgeRequestError);
  assert.throws(() => validateJudgeRequest({ language: "cpp", code: " ", testcases: testcases() }), JudgeRequestError);
  assert.throws(() => validateJudgeRequest({ language: "cpp", code: "x", testcases: testcases(3) }), JudgeRequestError);
});

test("testcase files allow exactly 2 MB and reject anything larger", () => {
  const exactLimit = "x".repeat(2 * 1024 * 1024);
  assert.doesNotThrow(() => validateJudgeRequest({
    language: "cpp",
    code: "x",
    testcases: [{ index: 1, input: exactLimit, expected: exactLimit }]
  }));
  assert.throws(() => validateJudgeRequest({
    language: "cpp",
    code: "x",
    testcases: [{ index: 1, input: `${exactLimit}x`, expected: "" }]
  }), JudgeRequestError);
});

test("Judge0 unavailable is returned as a service error", async () => {
  await assert.rejects(
    judgeSubmission({ language: "cpp", sourceCode: "UNAVAILABLE", testcases: testcases() }),
    (error) => error instanceof Judge0Error && error.statusCode === 503
  );
});
