const path = require("path");
const judgeConfig = require("./config/judgeConfig");
const { LANGUAGE_MAP, getJudge0LanguageId } = require("./config/judge0Languages");
const { Judge0Error, getJudge0Languages, runCodeBatch, runCodeWithTestcase, runMultiFileProject } = require("./services/judge0Client");
const { createProjectArchive, parseProjectResults } = require("./services/multiFileRunner");
const { compareOutput, normalizeTokens } = require("./services/outputCompare");

const LANGUAGE_LIMITS = {
  c: { timeLimitMs: 2000, memoryLimitMb: 256 },
  cpp: { timeLimitMs: 1000, memoryLimitMb: 256 },
  pascal: { timeLimitMs: 2000, memoryLimitMb: 256 },
  java: { timeLimitMs: 3000, memoryLimitMb: 512 },
  csharp: { timeLimitMs: 3000, memoryLimitMb: 512 },
  python: { timeLimitMs: 5000, memoryLimitMb: 512 }
};

class JudgeRequestError extends Error {
  constructor(message, statusCode = 400, code = "INVALID_JUDGE_REQUEST") {
    super(message);
    this.name = "JudgeRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function byteLength(value) {
  return Buffer.byteLength(String(value ?? ""), "utf8");
}

function parseTestcases(files) {
  const map = new Map();

  for (const file of files || []) {
    const originalName = path.basename(file.originalname || "");
    const match = originalName.match(/^(\d+)\.(in|out)$/i);
    if (!match) continue;

    const index = Number(match[1]);
    const testcase = map.get(index) || { index };
    const content = file.buffer.toString("utf8");

    if (match[2].toLowerCase() === "in") {
      testcase.input = content;
      testcase.inputName = originalName;
    } else {
      testcase.expected = content;
      testcase.outputName = originalName;
    }
    map.set(index, testcase);
  }

  return [...map.values()]
    .filter((item) => typeof item.input === "string" && typeof item.expected === "string")
    .sort((a, b) => a.index - b.index);
}

function normalizeProvidedTestcases(testcases) {
  if (!Array.isArray(testcases)) return null;
  return testcases.map((testcase, offset) => ({
    index: Number(testcase.index) || offset + 1,
    input: testcase.input ?? "",
    expected: testcase.expectedOutput ?? testcase.output ?? testcase.expected ?? "",
    inputName: testcase.inputFile,
    outputName: testcase.outputFile
  }));
}

function getLanguageLimits(language) {
  const defaults = LANGUAGE_LIMITS[language] || {};
  return {
    timeLimitMs: process.env.JUDGE0_CPU_TIME_LIMIT
      ? judgeConfig.cpuTimeLimit * 1000
      : defaults.timeLimitMs || judgeConfig.cpuTimeLimit * 1000,
    memoryLimitMb: process.env.JUDGE0_MEMORY_LIMIT
      ? judgeConfig.memoryLimitKb / 1024
      : defaults.memoryLimitMb || judgeConfig.memoryLimitKb / 1024
  };
}

function validateJudgeRequest({ language, code, testcases }) {
  if (!getJudge0LanguageId(language)) {
    throw new JudgeRequestError(`Unsupported language: ${language || "(empty)"}.`);
  }
  if (!String(code || "").trim()) {
    throw new JudgeRequestError("Source code must not be empty.");
  }
  if (byteLength(code) > judgeConfig.maxSourceCodeBytes) {
    throw new JudgeRequestError("Source code is too large.", 413, "SOURCE_CODE_TOO_LARGE");
  }
  if (!Array.isArray(testcases) || testcases.length === 0) {
    throw new JudgeRequestError("No valid testcase pairs found.");
  }
  if (testcases.length > judgeConfig.maxTestcases) {
    throw new JudgeRequestError("Too many testcases.", 413, "TOO_MANY_TESTCASES");
  }

  for (const testcase of testcases) {
    if (typeof testcase.input !== "string" || typeof testcase.expected !== "string") {
      throw new JudgeRequestError(`Invalid testcase #${testcase.index}.`);
    }
    if (byteLength(testcase.input) > judgeConfig.maxStdinBytes) {
      throw new JudgeRequestError(`Input for testcase #${testcase.index} is too large.`, 413);
    }
    if (byteLength(testcase.expected) > judgeConfig.maxExpectedOutputBytes) {
      throw new JudgeRequestError(`Expected output for testcase #${testcase.index} is too large.`, 413);
    }
  }
}

function legacyStatusFromJudge0(raw, actualOutput, expectedOutput) {
  const id = Number(raw?.status?.id);
  const description = String(raw?.status?.description || "");

  if (id === 6 || /compilation error/i.test(description)) return "CE";
  if (id === 5 || /time limit/i.test(description)) return "TLE";
  if (/output limit/i.test(description)) return "OLE";
  if (/memory limit/i.test(description)) return "MLE";
  if (id >= 7 && id <= 12) return "ER";
  if (id === 13 || id === 14 || id === 1 || id === 2) return "SE";

  if (compareOutput(actualOutput, expectedOutput)) return "AC";
  if (normalizeTokens(actualOutput) === normalizeTokens(expectedOutput)) return "PE";
  return "WA";
}

function normalizedStatus(legacyStatus) {
  return {
    AC: "accepted",
    WA: "wrong_answer",
    PE: "wrong_answer",
    TLE: "time_limit_exceeded",
    MLE: "memory_limit_exceeded",
    OLE: "output_limit_exceeded",
    CE: "compilation_error",
    ER: "runtime_error",
    SE: "internal_error"
  }[legacyStatus] || "internal_error";
}

function resultMessage(status) {
  return {
    AC: "Correct.",
    WA: "Wrong answer.",
    PE: "Output differs only in whitespace.",
    TLE: "Time limit exceeded.",
    MLE: "Memory limit exceeded.",
    OLE: "Output limit exceeded.",
    CE: "Compilation error.",
    ER: "Runtime error.",
    SE: "Judge service error."
  }[status];
}

function normalizeJudge0Result(raw, testcase, maxOutputBytes) {
  const fullActualOutput = String(raw?.stdout ?? "");
  const expectedOutput = testcase.expected;
  const status = legacyStatusFromJudge0(raw, fullActualOutput, expectedOutput);
  const responseLimit = Math.min(maxOutputBytes, judgeConfig.maxResponseFieldBytes);
  const previewLimit = Math.min(responseLimit, 2000);
  const actualOutput = fullActualOutput.slice(0, responseLimit);
  const stderr = String(raw?.stderr ?? "").slice(0, responseLimit);
  const compileOutput = String(raw?.compile_output ?? "").slice(0, responseLimit);
  const timeSeconds = Number.parseFloat(raw?.time);
  const memoryKb = Number.parseFloat(raw?.memory);

  return {
    index: testcase.index,
    status,
    normalizedStatus: normalizedStatus(status),
    passed: status === "AC",
    inputFile: testcase.inputName,
    outputFile: testcase.outputName,
    input: testcase.input.slice(0, responseLimit),
    expectedOutput: expectedOutput.slice(0, responseLimit),
    actualOutput,
    stdout: actualOutput,
    stderr,
    compileOutput,
    time: Number.isFinite(timeSeconds) ? timeSeconds : null,
    timeMs: Number.isFinite(timeSeconds) ? Math.round(timeSeconds * 1000) : 0,
    memory: Number.isFinite(memoryKb) ? memoryKb : null,
    memoryMb: Number.isFinite(memoryKb) ? memoryKb / 1024 : 0,
    judge0Status: raw?.status || null,
    message: resultMessage(status),
    inputPreview: testcase.input.slice(0, previewLimit),
    stdoutPreview: actualOutput.slice(0, previewLimit),
    expectedPreview: expectedOutput.slice(0, previewLimit),
    stderrPreview: (compileOutput || stderr).slice(0, previewLimit)
  };
}

function finalLegacyStatus(results) {
  if (results.every((result) => result.status === "AC")) return "AC";
  return ["CE", "SE", "TLE", "MLE", "OLE", "ER", "WA", "PE"]
    .find((status) => results.some((result) => result.status === status)) || "WA";
}

async function ensureLanguageIsAvailable(language, languageId) {
  const languages = await getJudge0Languages();
  if (!Array.isArray(languages) || !languages.some((item) => Number(item.id) === languageId)) {
    throw new JudgeRequestError(
      `Language ${language} is not available in the configured Judge0 instance.`,
      400,
      "UNSUPPORTED_JUDGE0_LANGUAGE"
    );
  }
}

async function judgeCompileOnce({ language, code, testcases, limits, maxOutputBytes }) {
  await ensureLanguageIsAvailable("Multi-file program", judgeConfig.multiFileLanguageId);
  const perTestWallSeconds = Math.max(judgeConfig.wallTimeLimit, limits.timeLimitMs / 1000 + 1);
  const additionalFiles = createProjectArchive({
    language,
    sourceCode: code,
    testcases,
    perTestWallSeconds,
    previewBytes: Math.min(maxOutputBytes, judgeConfig.maxResponseFieldBytes)
  });
  const raw = await runMultiFileProject({
    additionalFiles,
    languageId: judgeConfig.multiFileLanguageId,
    timeLimit: Math.min(judgeConfig.compileOnceMaxCpuSeconds, Math.max(1, (limits.timeLimitMs / 1000) * testcases.length)),
    wallTimeLimit: Math.min(judgeConfig.compileOnceMaxWallSeconds, Math.max(1, perTestWallSeconds * testcases.length)),
    memoryLimit: limits.memoryLimitMb * 1024
  });

  if (Number(raw?.status?.id) === 6) {
    return [normalizeJudge0Result(raw, testcases[0], maxOutputBytes)];
  }

  const parsedByIndex = new Map(parseProjectResults(raw?.stdout).map((result) => [result.index, result]));
  return testcases.map((testcase) => {
    const parsed = parsedByIndex.get(testcase.index);
    const timedOut = parsed?.exitCode === 124 || parsed?.exitCode === 137;
    const resultRaw = parsed ? {
      stdout: parsed.stdout,
      stderr: parsed.stderr,
      status: timedOut
        ? { id: 5, description: "Time Limit Exceeded" }
        : parsed.exitCode === 0
          ? { id: 3, description: "Accepted" }
          : { id: 11, description: "Runtime Error (NZEC)" }
    } : {
      stdout: "",
      stderr: String(raw?.stderr || ""),
      status: raw?.status || { id: 13, description: "Internal Error" }
    };
    return normalizeJudge0Result(resultRaw, testcase, maxOutputBytes);
  });
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function judgeSubmission({ language, code, sourceCode, files, testcases, maxOutputBytes }) {
  const effectiveCode = sourceCode ?? code;
  const effectiveTestcases = normalizeProvidedTestcases(testcases) || parseTestcases(files);
  validateJudgeRequest({ language, code: effectiveCode, testcases: effectiveTestcases });

  const languageId = getJudge0LanguageId(language);
  const limits = getLanguageLimits(language);
  const effectiveMaxOutputBytes = Math.min(
    Number(maxOutputBytes) || judgeConfig.maxOutputBytes,
    judgeConfig.maxOutputBytes
  );

  await ensureLanguageIsAvailable(language, languageId);

  if (judgeConfig.compileOnce && judgeConfig.compileOnceLanguages.includes(language)) {
    const results = await judgeCompileOnce({
      language,
      code: effectiveCode,
      testcases: effectiveTestcases,
      limits,
      maxOutputBytes: effectiveMaxOutputBytes
    });
    const passedTests = results.filter((result) => result.passed).length;
    const status = finalLegacyStatus(results);
    return {
      status,
      normalizedStatus: normalizedStatus(status),
      message: status === "AC" ? "All testcases passed." : resultMessage(status),
      totalTests: effectiveTestcases.length,
      executedTests: results.length,
      passedTests,
      score: Number(((passedTests / effectiveTestcases.length) * 100).toFixed(2)),
      timeLimitMs: limits.timeLimitMs,
      memoryLimitMb: limits.memoryLimitMb,
      compileOutput: results.find((result) => result.status === "CE")?.compileOutput || "",
      results
    };
  }

  async function runTestcase(testcase) {
    const raw = await runCodeWithTestcase({
      sourceCode: effectiveCode,
      languageId,
      stdin: testcase.input,
      expectedOutput: testcase.expected,
      timeLimit: limits.timeLimitMs / 1000,
      wallTimeLimit: Math.max(judgeConfig.wallTimeLimit, limits.timeLimitMs / 1000 + 1),
      memoryLimit: limits.memoryLimitMb * 1024
    });
    return normalizeJudge0Result(raw, testcase, effectiveMaxOutputBytes);
  }

  // Run the first testcase alone so compilation errors stop immediately.
  const firstResult = await runTestcase(effectiveTestcases[0]);
  const results = [firstResult];

  if (firstResult.status !== "CE" && effectiveTestcases.length > 1) {
    const remainingTestcases = effectiveTestcases.slice(1);
    let remainingResults;

    if (judgeConfig.useBatch) {
      const batches = chunk(remainingTestcases, judgeConfig.batchSize);
      const batchResults = await Promise.all(batches.map(async (testcaseBatch) => {
        const rawResults = await runCodeBatch(testcaseBatch.map((testcase) => ({
          sourceCode: effectiveCode,
          languageId,
          stdin: testcase.input,
          expectedOutput: testcase.expected,
          timeLimit: limits.timeLimitMs / 1000,
          wallTimeLimit: Math.max(judgeConfig.wallTimeLimit, limits.timeLimitMs / 1000 + 1),
          memoryLimit: limits.memoryLimitMb * 1024
        })));
        return rawResults.map((raw, index) =>
          normalizeJudge0Result(raw, testcaseBatch[index], effectiveMaxOutputBytes)
        );
      }));
      remainingResults = batchResults.flat();
    } else {
      remainingResults = await mapWithConcurrency(
        remainingTestcases,
        judgeConfig.testcaseConcurrency,
        runTestcase
      );
    }

    // The same source already compiled successfully for the first testcase.
    // A later CE is therefore a transient Judge0/isolate failure, not a user-code CE.
    for (let index = 0; index < remainingResults.length; index += 1) {
      if (remainingResults[index].status !== "CE") continue;

      let recovered = remainingResults[index];
      for (let attempt = 0; attempt < judgeConfig.compilationRetryCount && recovered.status === "CE"; attempt += 1) {
        recovered = await runTestcase(remainingTestcases[index]);
      }

      if (recovered.status === "CE") {
        recovered = {
          ...recovered,
          status: "SE",
          normalizedStatus: "internal_error",
          message: "Judge service failed to compile code that previously compiled successfully."
        };
      }
      remainingResults[index] = recovered;
    }
    results.push(...remainingResults);
  }

  const passedTests = results.filter((result) => result.passed).length;
  const status = finalLegacyStatus(results);

  return {
    status,
    normalizedStatus: normalizedStatus(status),
    message: status === "AC" ? "All testcases passed." : resultMessage(status),
    totalTests: effectiveTestcases.length,
    executedTests: results.length,
    passedTests,
    score: Number(((passedTests / effectiveTestcases.length) * 100).toFixed(2)),
    timeLimitMs: limits.timeLimitMs,
    memoryLimitMb: limits.memoryLimitMb,
    compileOutput: results.find((result) => result.status === "CE")?.compileOutput || "",
    results
  };
}

module.exports = {
  Judge0Error,
  JudgeRequestError,
  judgeSubmission,
  getLanguageLimits,
  mapWithConcurrency,
  normalizeProvidedTestcases,
  parseTestcases,
  validateJudgeRequest,
  LANGUAGE_MAP
};
