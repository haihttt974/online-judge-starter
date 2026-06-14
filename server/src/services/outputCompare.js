function normalizeOutput(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Preserve the previous judge behavior: ignore trailing spaces on each line.
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
}

function normalizeTokens(value) {
  return String(value ?? "").trim().split(/\s+/).filter(Boolean).join(" ");
}

function compareOutput(actual, expected) {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

module.exports = {
  compareOutput,
  normalizeOutput,
  normalizeTokens
};
