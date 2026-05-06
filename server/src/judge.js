const fs = require("fs/promises");
const fssync = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");

const SUPPORTED_LANGUAGES = new Set(["c", "cpp", "python", "java", "csharp", "pascal"]);

const LANGUAGE_LIMITS = {
  c: { timeLimitMs: 2000, memoryLimitMb: 256 },
  cpp: { timeLimitMs: 1000, memoryLimitMb: 256 },
  pascal: { timeLimitMs: 2000, memoryLimitMb: 256 },
  java: { timeLimitMs: 3000, memoryLimitMb: 4096 },
  csharp: { timeLimitMs: 3000, memoryLimitMb: 512 },
  python: { timeLimitMs: 5000, memoryLimitMb: 512 }
};

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

// Lấy danh sách testcase từ các file upload.
// File hợp lệ: 1.IN, 1.OUT, 2.IN, 2.OUT...
function parseTestcases(files) {
  const map = new Map();

  for (const file of files) {
    const originalName = path.basename(file.originalname || "");
    const match = originalName.match(/^(\d+)\.(in|out)$/i);
    if (!match) continue;

    const index = Number(match[1]);
    const type = match[2].toLowerCase();

    if (!map.has(index)) {
      map.set(index, { index });
    }

    const testcase = map.get(index);

    if (type === "in") {
      testcase.input = file.buffer.toString("utf8");
      testcase.inputName = originalName;
    }

    if (type === "out") {
      testcase.expected = file.buffer.toString("utf8");
      testcase.outputName = originalName;
    }
  }

  return [...map.values()]
    .filter((item) => typeof item.input === "string" && typeof item.expected === "string")
    .sort((a, b) => a.index - b.index);
}

// Chuẩn hóa output để so sánh kiểu Online Judge thường dùng:
// - Đổi CRLF của Windows thành LF
// - Xóa khoảng trắng cuối từng dòng
// - Xóa dòng trống cuối file
function normalizeOutput(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

// Chuẩn hóa mạnh hơn để phát hiện PE:
// Nếu chỉ sai khoảng trắng/xuống dòng thì xem là PE.
function normalizeTokens(value) {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).join(" ");
}

function getLanguageConfig(language) {
  const configs = {
    c: {
      fileName: "main.c",
      compile: "gcc main.c -O2 -std=c11 -lm -o main",
      run: "./main"
    },
    cpp: {
      fileName: "main.cpp",
      compile: "g++ main.cpp -O2 -std=c++17 -o main",
      run: "./main"
    },
    python: {
      fileName: "main.py",
      // Python không cần biên dịch, nhưng vẫn kiểm tra lỗi cú pháp trước.
      compile: "python3 -m py_compile main.py",
      run: "python3 main.py"
    },
    java: {
      // Với Java, code nên có class Main.
      fileName: "Main.java",
      compile: "javac Main.java",
      run: "java -Xms128m -Xmx512m -Xss1m -XX:CompressedClassSpaceSize=128m -XX:MaxMetaspaceSize=128m Main"
    },
    csharp: {
      // Với C#, dùng Mono để biên dịch/chạy.
      fileName: "Program.cs",
      compile: "mcs Program.cs",
      run: "mono Program.exe"
    },
    pascal: {
      fileName: "main.pas",
      compile: "fpc main.pas >/tmp/fpc_compile.log 2>&1",
      run: "./main"
    }
  };

  return configs[language];
}

function getLanguageLimits(language) {
  return LANGUAGE_LIMITS[language] || { timeLimitMs: 2000, memoryLimitMb: 256 };
}

// Chạy lệnh shell có timeout.
// inputText sẽ được truyền vào stdin của chương trình.
function runCommand(command, options = {}) {
  const {
    cwd,
    inputText = "",
    timeoutMs = 2000,
    maxOutputBytes = 1024 * 1024,
    env = {}
  } = options;

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let finished = false;
    let killedByTimeout = false;
    let outputLimitExceeded = false;

    const child = spawn("bash", ["-c", command], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"]
    });

    const timer = setTimeout(() => {
      killedByTimeout = true;
      try {
        child.kill("SIGKILL");
      } catch (_) {}
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > maxOutputBytes) {
        outputLimitExceeded = true;
        try {
          child.kill("SIGKILL");
        } catch (_) {}
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
      if (Buffer.byteLength(stderr, "utf8") > maxOutputBytes) {
        outputLimitExceeded = true;
        try {
          child.kill("SIGKILL");
        } catch (_) {}
      }
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        code: -1,
        signal: null,
        stdout,
        stderr: String(error.message || error),
        timedOut: killedByTimeout,
        outputLimitExceeded
      });
    });

    child.on("close", (code, signal) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        code,
        signal,
        stdout,
        stderr,
        timedOut: killedByTimeout,
        outputLimitExceeded
      });
    });

    child.stdin.write(inputText);
    child.stdin.end();
  });
}

async function judgeSubmission({ language, code, files, maxOutputBytes }) {
  if (!SUPPORTED_LANGUAGES.has(language)) {
    return {
      status: "SE",
      message: `Ngôn ngữ ${language} chưa được hỗ trợ.`
    };
  }

  const testcases = parseTestcases(files);
  const limits = getLanguageLimits(language);
  const effectiveTimeLimitMs = limits.timeLimitMs;
  const effectiveMemoryLimitMb = limits.memoryLimitMb;

  if (!testcases.length) {
    return {
      status: "NTD",
      message: "Không tìm thấy cặp testcase hợp lệ. Hãy upload dạng 1.IN + 1.OUT, 2.IN + 2.OUT...",
      totalTests: 0,
      passedTests: 0,
      score: 0,
      results: []
    };
  }

  const jobId = makeId();
  const jobDir = path.join(os.tmpdir(), `judge-${jobId}`);

  await fs.mkdir(jobDir, { recursive: true });

  try {
    const config = getLanguageConfig(language);
    const sourcePath = path.join(jobDir, config.fileName);

    await fs.writeFile(sourcePath, code, "utf8");

    // Biên dịch trước. Nếu lỗi biên dịch thì không chạy testcase nữa.
    const compileResult = await runCommand(config.compile, {
      cwd: jobDir,
      timeoutMs: Math.max(30000, effectiveTimeLimitMs),
      maxOutputBytes
    });

    if (compileResult.timedOut) {
      return {
        status: "CE",
        message: "Biên dịch quá lâu hoặc bị treo.",
        compileOutput: compileResult.stderr || compileResult.stdout,
        totalTests: testcases.length,
        passedTests: 0,
        score: 0,
        results: testcases.map((tc) => ({
          index: tc.index,
          status: "CE",
          inputFile: tc.inputName,
          outputFile: tc.outputName,
          inputPreview: String(tc.input || "").slice(0, 1000),
          stdoutPreview: "",
          expectedPreview: String(tc.expected || "").slice(0, 1000),
          stderrPreview: compileResult.stderr || compileResult.stdout,
          message: "Không chạy vì lỗi biên dịch."
        }))
      };
    }

    if (compileResult.code !== 0) {
      return {
        status: "CE",
        message: "Lỗi biên dịch.",
        compileOutput: compileResult.stderr || compileResult.stdout,
        totalTests: testcases.length,
        passedTests: 0,
        score: 0,
        results: testcases.map((tc) => ({
          index: tc.index,
          status: "CE",
          inputFile: tc.inputName,
          outputFile: tc.outputName,
          inputPreview: String(tc.input || "").slice(0, 1000),
          stdoutPreview: "",
          expectedPreview: String(tc.expected || "").slice(0, 1000),
          stderrPreview: compileResult.stderr || compileResult.stdout,
          message: "Không chạy vì lỗi biên dịch."
        }))
      };
    }

    const results = [];
    let passedTests = 0;

    for (const testcase of testcases) {
      const startedAt = Date.now();

      // ulimit giới hạn bộ nhớ tương đối.
      // Đây là bản starter nội bộ, chưa phải sandbox hoàn chỉnh cho Internet công khai.
      const memoryKb = Math.max(16, effectiveMemoryLimitMb) * 1024;
      const command = `ulimit -v ${memoryKb}; ${config.run}`;

      const runResult = await runCommand(command, {
        cwd: jobDir,
        inputText: testcase.input,
        timeoutMs: effectiveTimeLimitMs,
        maxOutputBytes
      });

      const timeMs = Date.now() - startedAt;

      let status = "AC";
      let message = "Chính xác.";

      if (runResult.outputLimitExceeded) {
        status = "OLE";
        message = "Chương trình in ra quá nhiều dữ liệu.";
      } else if (runResult.timedOut) {
        status = "TLE";
        message = "Chương trình chạy quá thời gian cho phép.";
      } else if (runResult.code === 137 || runResult.signal === "SIGKILL") {
        status = "MLE";
        message = "Chương trình có thể đã vượt quá giới hạn bộ nhớ.";
      } else if (runResult.code !== 0) {
        status = "ER";
        message = "Lỗi khi chạy chương trình.";
      } else {
        const actual = normalizeOutput(runResult.stdout);
        const expected = normalizeOutput(testcase.expected);

        if (actual === expected) {
          status = "AC";
          message = "Chính xác.";
          passedTests += 1;
        } else if (normalizeTokens(runResult.stdout) === normalizeTokens(testcase.expected)) {
          status = "PE";
          message = "Sai định dạng đầu ra: kết quả gần đúng nhưng khác khoảng trắng/xuống dòng.";
        } else {
          status = "WA";
          message = "Kết quả sai.";
        }
      }

      results.push({
        index: testcase.index,
        status,
        inputFile: testcase.inputName,
        outputFile: testcase.outputName,
        timeMs,
        message,
        inputPreview: String(testcase.input || "").slice(0, 1000),
        stdoutPreview: String(runResult.stdout || "").slice(0, 1000),
        stderrPreview: String(runResult.stderr || "").slice(0, 1000),
        expectedPreview: String(testcase.expected || "").slice(0, 1000)
      });
    }

    const score = testcases.length ? Number(((passedTests / testcases.length) * 100).toFixed(2)) : 0;
    const finalStatus = passedTests === testcases.length ? "AC" : "WA";

    return {
      status: finalStatus,
      message: finalStatus === "AC" ? "Tất cả testcase đều chính xác." : "Có testcase chưa chính xác.",
      totalTests: testcases.length,
      passedTests,
      score,
      timeLimitMs: effectiveTimeLimitMs,
      memoryLimitMb: effectiveMemoryLimitMb,
      results
    };
  } finally {
    // Xóa thư mục tạm sau khi chấm xong để không đầy ổ cứng.
    try {
      if (fssync.existsSync(jobDir)) {
        await fs.rm(jobDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

module.exports = {
  judgeSubmission,
  getLanguageLimits
};
