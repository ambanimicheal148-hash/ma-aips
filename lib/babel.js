export const BABEL_PHASE1_LANGUAGES = Object.freeze([
  "Sheng","Dholuo","Kiswahili","English","German","Somali","French","Kinyarwanda","Amharic","Lingala"
]);

export function babelLanguageRecord(language, results = {}) {
  const name = String(language || "").trim();
  if (!BABEL_PHASE1_LANGUAGES.includes(name)) throw new Error("Language is outside V343 Phase-1 benchmark");
  return {
    language: name,
    textUnderstanding: results.textUnderstanding ?? "UNTESTED",
    textGeneration: results.textGeneration ?? "UNTESTED",
    translation: results.translation ?? "UNTESTED",
    speechRecognition: results.speechRecognition ?? "UNTESTED",
    speechGeneration: results.speechGeneration ?? "UNTESTED",
    imageDocument: results.imageDocument ?? "UNTESTED",
    codeSwitching: results.codeSwitching ?? "UNTESTED",
    terminology: results.terminology ?? "UNTESTED",
    limitations: Array.isArray(results.limitations) ? results.limitations : [],
    lastTested: results.lastTested || null
  };
}

export function createBabelBenchmarkCase({ language, task, inputType, expected } = {}) {
  if (!BABEL_PHASE1_LANGUAGES.includes(language)) throw new Error("Unsupported benchmark language");
  return {
    id: cryptoRandomId(),
    language, task: String(task || ""), inputType: String(inputType || "text"),
    expected: String(expected || ""), status: "PENDING"
  };
}
function cryptoRandomId(){ return "babel-" + Math.random().toString(36).slice(2,10); }
