// AH-15.5 batch 5 — locale-aware resolver for the quiz/composer/courses
// surface: /test.*, /tests.*, /courses.*, /r/$shareId, /t/$shareId, plus
// the quiz + composer + courses component trees. Standalone namespace
// (separate from marketing/legal) because the vocabulary is large and
// edits churn independently from the marketing chrome.
import sk from "./locales/sk/quiz.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/quiz.json").then((m) => m.default),
    cs: () => import("./locales/cs/quiz.json").then((m) => m.default),
  },
});
