// Judge0 language IDs vary by release. Verify the configured IDs with GET /languages.
const DEFAULT_LANGUAGE_MAP = {
  c: 50,
  cpp: 54,
  python: 71,
  java: 62,
  csharp: 51,
  pascal: 67
};

function envName(language) {
  return `JUDGE0_LANGUAGE_ID_${language.toUpperCase()}`;
}

const LANGUAGE_MAP = Object.fromEntries(
  Object.entries(DEFAULT_LANGUAGE_MAP).map(([language, fallback]) => {
    const override = Number(process.env[envName(language)]);
    return [language, Number.isInteger(override) && override > 0 ? override : fallback];
  })
);

function getJudge0LanguageId(language) {
  return LANGUAGE_MAP[language];
}

module.exports = {
  LANGUAGE_MAP,
  getJudge0LanguageId
};
