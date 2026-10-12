export interface EvidenceRespondent {
  sessionId: string;
  name: string;
  email: string;
  finishedAt: string;
  score: number;
  passed: boolean;
}

export interface EvidenceReport {
  id: string;
  orgName: string;
  testTitle: string;
  testVersion: number;
  generatedAt: string;
  passScore: number;
  respondents: EvidenceRespondent[];
  respondentCount: number;
  passedCount: number;
  averageScore: number;
  sha256: string;
}

export function formatSkDate(iso: string): string {
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function verifyUrl(origin: string, reportId: string): string {
  return `${origin}/overenie/${reportId}`;
}
