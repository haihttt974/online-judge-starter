const { createStoredZip } = require("./zipArchive");

const RESULT_PREFIX = "__OJ_RESULT__";
const LANGUAGE_PROJECTS = {
  c: { sourceFile: "main.c", compile: "/usr/local/gcc-9.2.0/bin/gcc main.c -o program", run: "./program" },
  cpp: { sourceFile: "main.cpp", compile: "/usr/local/gcc-9.2.0/bin/g++ main.cpp -o program", run: "env LD_LIBRARY_PATH=/usr/local/gcc-9.2.0/lib64 ./program" },
  csharp: { sourceFile: "Main.cs", compile: "/usr/local/mono-6.6.0.161/bin/mcs Main.cs -out:program.exe", run: "/usr/local/mono-6.6.0.161/bin/mono program.exe" },
  java: { sourceFile: "Main.java", compile: "/usr/local/openjdk13/bin/javac -J-Xmx64m Main.java", run: "/usr/local/openjdk13/bin/java -Xmx64m Main" },
  pascal: { sourceFile: "main.pas", compile: "/usr/local/fpc-3.0.4/bin/fpc main.pas -oprogram", run: "./program" },
  python: { sourceFile: "script.py", run: "/usr/local/python-3.8.1/bin/python3 script.py" }
};

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function createRunScript(command, testcases, perTestWallSeconds, previewBytes) {
  const cases = testcases.map((testcase) => shellQuote(testcase.index)).join(" ");
  return [
    "#!/bin/bash",
    "set +e",
    `for case_id in ${cases}; do`,
    '  stdout_file="case-${case_id}.stdout"',
    '  stderr_file="case-${case_id}.stderr"',
    `  timeout --signal=KILL ${Math.max(1, Math.ceil(perTestWallSeconds))}s ${command} < "cases/${"${case_id}"}.in" > "$stdout_file" 2> "$stderr_file"`,
    "  exit_code=$?",
    `  printf '${RESULT_PREFIX}\\t%s\\t%s\\t' "$case_id" "$exit_code"`,
    `  head -c ${previewBytes} "$stdout_file" | base64 | tr -d '\\n'`,
    "  printf '\\t'",
    `  head -c ${previewBytes} "$stderr_file" | base64 | tr -d '\\n'`,
    "  printf '\\n'",
    "done",
    "exit 0",
    ""
  ].join("\n");
}

function createProjectArchive({ language, sourceCode, testcases, perTestWallSeconds, previewBytes }) {
  const project = LANGUAGE_PROJECTS[language];
  if (!project) throw new Error(`Unsupported compile-once language: ${language}.`);
  const files = [
    { name: project.sourceFile, content: sourceCode },
    { name: "run", content: createRunScript(project.run, testcases, perTestWallSeconds, previewBytes) },
    ...testcases.map((testcase) => ({ name: `cases/${testcase.index}.in`, content: testcase.input }))
  ];
  if (project.compile) files.push({ name: "compile", content: `#!/bin/bash\nset -e\n${project.compile}\n` });
  return createStoredZip(files).toString("base64");
}

function parseProjectResults(stdout) {
  return String(stdout || "").split(/\r?\n/).filter((line) => line.startsWith(`${RESULT_PREFIX}\t`)).map((line) => {
    const [, index, exitCode, encodedStdout = "", encodedStderr = ""] = line.split("\t");
    return {
      index: Number(index),
      exitCode: Number(exitCode),
      stdout: Buffer.from(encodedStdout, "base64").toString("utf8"),
      stderr: Buffer.from(encodedStderr, "base64").toString("utf8")
    };
  });
}

module.exports = { createProjectArchive, parseProjectResults };
