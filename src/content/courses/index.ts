import type { Course, CourseCategory } from "./_schema";
// `_demo` is imported only to keep the schema compile-checked against a
// concrete sample; it is intentionally NOT registered in COURSES.
import "./_demo";
import { smsSmishingCourse } from "./sms-smishing";
import { emailPhishingCourse } from "./email-phishing";
import { vishingCourse } from "./vishing";
import { marketplaceCourse } from "./marketplace-podvody";
import { dataHygieneCourse } from "./data-hygiene";
import { investmentScamsCourse } from "./investicne-podvody";
import { romanceScamsCourse } from "./romance-scams";
import { becWorkplaceCourse } from "./bec-pracovisko";
import { fyzickePodvodyCourse } from "./fyzicke-podvody";
import { ochranaBlizkychCourse } from "./chran-svojich-blizkych";
import { qrQuishingCourse } from "./qr-quishing";
import { aiDeepfakeCourse } from "./ai-deepfake-podvody";
import { kradezKontCourse } from "./kradez-kont-socialnych-sieti";
import { naborPraceScamCourse } from "./nabor-prace-podvody";
import { pigButcheringCourse } from "./pig-butchering-podvod";
import { malvertisingCourse } from "./malvertising-fake-reklamy";
import { aiBezpecnostCourse } from "./ai-bezpecnost-co-nezdielat";
import { aiPomocnikCourse } from "./ai-pomocnik-kazdy-den";
import { psychologiaPodvodovCourse } from "./psychologia-podvodov";
import { fakeEshopOverenieCourse } from "./fake-eshop-ako-overit";
import { bezpecneOnlineNakupyCourse } from "./bezpecne-online-nakupy";
import { rodinaDetiSenioriCourse } from "./rodina-deti-seniori";
import { studentiOnlineCourse } from "./studenti-online";
import { pribehyObetiCourse } from "./pribehy-skutocnych-obeti";
import { hesla2faPasskeysCourse } from "./hesla-2fa-passkeys";
import { vpnAntivirusZalohyCourse } from "./vpn-antivirus-zalohy";
import { coRobitPoPodvodeCourse } from "./co-robit-po-podvode";
import { topPodvody2026Course } from "./top-podvody-2026-sk";

export type { Course, CourseCategory, CourseSection, CourseDifficulty } from "./_schema";
export { courseSchema } from "./_schema";

export const COURSES: Course[] = [
  smsSmishingCourse,
  emailPhishingCourse,
  vishingCourse,
  marketplaceCourse,
  dataHygieneCourse,
  investmentScamsCourse,
  romanceScamsCourse,
  becWorkplaceCourse,
  fyzickePodvodyCourse,
  ochranaBlizkychCourse,
  qrQuishingCourse,
  aiDeepfakeCourse,
  kradezKontCourse,
  naborPraceScamCourse,
  pigButcheringCourse,
  malvertisingCourse,
  aiBezpecnostCourse,
  aiPomocnikCourse,
  psychologiaPodvodovCourse,
  fakeEshopOverenieCourse,
  bezpecneOnlineNakupyCourse,
  rodinaDetiSenioriCourse,
  studentiOnlineCourse,
  pribehyObetiCourse,
  hesla2faPasskeysCourse,
  vpnAntivirusZalohyCourse,
  coRobitPoPodvodeCourse,
  topPodvody2026Course,
];

const slugs = new Set<string>();
for (const c of COURSES) {
  if (slugs.has(c.slug)) {
    throw new Error(`Duplicate course slug: ${c.slug}`);
  }
  slugs.add(c.slug);
}

export function getCourseBySlug(slug: string): Course | null {
  return COURSES.find((c) => c.slug === slug) ?? null;
}

export function getCoursesByCategory(category: CourseCategory): Course[] {
  return COURSES.filter((c) => c.category === category);
}
