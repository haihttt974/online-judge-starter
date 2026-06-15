const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { Judge0Error, JudgeRequestError, judgeSubmission, getLanguageLimits } = require("./judge");
const { getJudge0Languages } = require("./services/judge0Client");
const judgeConfig = require("./config/judgeConfig");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MAX_FILE_SIZE = Math.max(judgeConfig.maxStdinBytes, judgeConfig.maxExpectedOutputBytes);
const MAX_FILE_COUNT = judgeConfig.maxTestcases * 2;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILE_COUNT,
    fileSize: MAX_FILE_SIZE
  }
});

app.use(cors());
app.use(express.json({ limit: judgeConfig.maxSourceCodeBytes + judgeConfig.maxTestcases * MAX_FILE_SIZE }));

const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

app.get("/api/health", async (req, res) => {
  try {
    await getJudge0Languages();
    res.json({ ok: true, judgeReady: true, message: "Judge server is running" });
  } catch (_) {
    res.status(503).json({
      ok: false,
      judgeReady: false,
      message: "Judge server is running, but Judge0 is unavailable."
    });
  }
});

// TODO: Add deployment-level authentication/rate limiting before exposing this API publicly.
app.post("/api/judge", upload.array("files"), async (req, res) => {
  try {
    let testcases = req.body.testcases;
    if (typeof testcases === "string") {
      try {
        testcases = JSON.parse(testcases);
      } catch (_) {
        throw new JudgeRequestError("Invalid testcases JSON.");
      }
    }

    const result = await judgeSubmission({
      language: req.body.language,
      code: req.body.sourceCode ?? req.body.code,
      files: req.files || [],
      testcases,
      maxOutputBytes: req.body.maxOutputBytes
    });

    res.json(result);
  } catch (error) {
    const expectedError = error instanceof JudgeRequestError || error instanceof Judge0Error;
    if (!expectedError) console.error("Unexpected error in /api/judge:", error);

    res.status(error.statusCode || 500).json({
      status: "SE",
      normalizedStatus: error instanceof JudgeRequestError ? "invalid_request" : "internal_error",
      message: expectedError ? error.message : "System error while judging submission.",
      results: []
    });
  }
});

app.get("/api/language-limits/:language", (req, res) => {
  res.json(getLanguageLimits(req.params.language));
});

app.all("/api/*", (req, res) => {
  res.status(404).json({
    status: "SE",
    message: `API endpoint does not exist: ${req.method} ${req.url}`
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((err, req, res, next) => {
  const isSizeError = err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_FILE_COUNT" || err.type === "entity.too.large";
  if (!isSizeError) console.error("Unhandled request error:", err);

  res.status(isSizeError ? 413 : 500).json({
    status: "SE",
    normalizedStatus: isSizeError ? "invalid_request" : "internal_error",
    message: isSizeError ? "Each testcase file must be 2 MB or smaller." : "System error."
  });
});

async function waitForJudge0BeforeStart() {
  if (String(process.env.JUDGE0_WAIT_ON_START || "true").toLowerCase() === "false") {
    return;
  }

  const attempts = Math.max(1, judgeConfig.connectRetryCount + 1);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await getJudge0Languages();
      return;
    } catch (error) {
      if (attempt === attempts) {
        console.warn("Judge0 is not ready yet. The API will still start, but judging may fail until Judge0 becomes available.");
        return;
      }

      const delayMs = judgeConfig.connectRetryDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

(async () => {
  try {
    await waitForJudge0BeforeStart();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Judge app is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start judge app:", error);
    process.exit(1);
  }
})();
