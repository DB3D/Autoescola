export interface RevisionQuestion {
  id: string;
  page: number;
  prompt: string;
  answers: string[];
  correct: number;
  explanation: string;
  french: { prompt: string; answers: string[] };
}
export interface RevisionPage {
  title: string;
  kicker: string;
  facts: string[];
  tip: string;
  words: [string, string][];
  grammar: { title: string; rule: string; ca: string; fr: string };
}
export interface RevisionTheme {
  id: string;
  title: string;
  icon: string;
  color: string;
  subtitle: string;
  categories: string[];
  bankIds: string[];
  sources: string;
  articles: string;
  links?: { title: string; url: string }[];
  pages: RevisionPage[];
  questions: RevisionQuestion[];
}
export interface RevisionRun {
  id: string;
  themeId: string;
  completedAt: string;
  questionIds: string[];
  picks: (number | null)[];
  correct: number;
  total: number;
  // Absent on legacy runs, which retain their original full-credit score.
  points?: number;
  frenchUsed?: boolean[];
  // Legacy runs have only completedAt. New runs retain each answer's time.
  answeredAt?: string[];
}
// A cumulative checkpoint per study visit and local calendar day. Reading and
// testing share one clock; these records never enter theme mastery.
export interface RevisionTime {
  id: string;
  sessionId: string;
  themeId: string;
  day: string;
  seconds: number;
}
