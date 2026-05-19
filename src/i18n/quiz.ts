// AH-15.5 batch 5 — locale-aware resolver for the quiz/composer/courses
// surface: /test.*, /tests.*, /courses.*, /r/$shareId, /t/$shareId, plus
// the quiz + composer + courses component trees. Standalone namespace
// (separate from marketing/legal) because the vocabulary is large and
// edits churn independently from the marketing chrome.
import sk from "./locales/sk/quiz.json";
import en from "./locales/en/quiz.json";
import cs from "./locales/cs/quiz.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
