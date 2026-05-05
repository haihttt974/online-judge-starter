const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { judgeSubmission, getLanguageLimits } = require("./judge");

const app = express();

// Giới hạn upload: 200MB mỗi file, tối đa 500 file
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const MAX_FILE_COUNT = 500;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: MAX_FILE_COUNT,
    fileSize: MAX_FILE_SIZE
  }
});

const PORT = Number(process.env.PORT || 3000);

// Cho phép frontend gọi API backend
app.use(cors());

// Cho phép gửi JSON nếu sau này cần dùng API JSON
app.use(express.json({ limit: "2mb" }));

// Phục vụ giao diện frontend đã build
const clientDistPath = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// API kiểm tra server còn sống hay không
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Judge server is running"
  });
});

// API chấm bài
app.post("/api/judge", upload.array("files"), async (req, res) => {
  try {
    const language = req.body.language;
    const code = req.body.code;

    if (!language) {
      return res.status(400).json({
        status: "SE",
        message: "Bạn chưa chọn ngôn ngữ lập trình."
      });
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        status: "SE",
        message: "Bạn chưa nhập code."
      });
    }

    const result = await judgeSubmission({
      language,
      code,
      files: req.files || [],
      maxOutputBytes: Number(req.body.maxOutputBytes || process.env.MAX_OUTPUT_BYTES || 1024 * 1024)
    });

    res.json(result);
  } catch (error) {
    console.error("Lỗi trong /api/judge:", error);
    res.status(500).json({
      status: "SE",
      message: "Lỗi hệ thống khi chấm bài.",
      error: String(error.message || error)
    });
  }
});

app.get("/api/language-limits/:language", (req, res) => {
  res.json(getLanguageLimits(req.params.language));
});

// Handler cho các route /api không tồn tại
app.all("/api/*", (req, res) => {
  res.status(404).json({
    status: "SE",
    message: `API endpoint không tồn tại: ${req.method} ${req.url}`
  });
});

// Khi reload trang React, vẫn trả về index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDistPath, "index.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  const status = err.status || 500;
  
  let message = "Lỗi hệ thống server.";
  if (err.code === "LIMIT_FILE_SIZE") {
    message = `File upload quá lớn (vượt quá ${MAX_FILE_SIZE / (1024 * 1024)}MB).`;
  } else if (err.code === "LIMIT_FILE_COUNT") {
    message = `Quá nhiều file upload (vượt quá ${MAX_FILE_COUNT} file).`;
  } else if (status === 413) {
    message = "Dữ liệu upload vượt quá giới hạn cho phép.";
  }

  res.status(status).json({
    status: "SE",
    message,
    error: err.message || String(err)
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Judge app is running at http://localhost:${PORT}`);
});
