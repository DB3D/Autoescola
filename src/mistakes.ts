import type { Attempt, Question, QuizAttempt, Translation } from "./engine";
import { categoryIcon, categoryLabel, questionCategory } from "./categories";
import type { VocabQuestion } from "./vocab";
import type { RevisionRun, RevisionTheme } from "./revision/types";

export const MISTAKE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export type MistakeContext = "catalan" | "assisted" | "bilingual" | "unknown";
export const contextLabel: Record<MistakeContext, string> = {
  catalan: "Català seul",
  assisted: "Català + français",
  bilingual: "Català ↔ français · quiz bilingue",
  unknown: "Aide française non renseignée",
};
export const sourceLabel = { practice: "Pratique / examen", vocab: "Quiz Català", revision: "Révision" };
export interface RecentMistake {
  key: string;
  questionId: string;
  source: keyof typeof sourceLabel;
  category: string;
  icon: string;
  at: string;
  context: MistakeContext;
  instruction?: string;
  question: string;
  questionFrench?: string;
  answerLanguage: string;
  correctAnswer: string;
  correctFrench?: string;
  selectedAnswer: string;
  selectedFrench?: string;
  image?: string;
  passed: boolean;
  occurrences: number;
}
export interface MistakeHistory {
  bank: Question[];
  translations: Record<string, Translation>;
  attempts: Attempt[];
  vocabBank: VocabQuestion[];
  vocabTypes: Record<string, string>;
  quizAttempts: QuizAttempt[];
  revisionThemes: RevisionTheme[];
  revisionRuns: RevisionRun[];
}

// Correctness is factual, never inferred from mastery points. An assisted
// correct answer (including a zero-point Revision answer) is not a mistake.
export function recentMistakes(history: MistakeHistory, now = Date.now(), limit = 100) {
  const bank = new Map(history.bank.map(q => [q.id, q]));
  const vocab = new Map(history.vocabBank.map(q => [q.id, q]));
  const revision = new Map(history.revisionThemes.flatMap(theme => theme.questions.map(q => [q.id, { q, theme }] as const)));
  const rows: RecentMistake[] = [];
  const inWindow = (at: string) => {
    const time = Date.parse(at);
    return Number.isFinite(time) && time >= now - MISTAKE_WINDOW_MS && time <= now;
  };
  for (const a of new Map(history.attempts.map(a => [a.id, a])).values()) {
    if ((!a.passed && a.correct) || !inWindow(a.at)) continue;
    const q = bank.get(a.questionId);
    if (!q) continue;
    const fr = history.translations[q.id];
    const unanswered = a.passed || a.selected === null;
    rows.push({
      key: `practice:${q.id}`, questionId: q.id, source: "practice", at: a.at,
      category: categoryLabel(questionCategory(q)), icon: categoryIcon(questionCategory(q)),
      context: a.frenchVisible ? "assisted" : "catalan",
      question: q.question, questionFrench: fr?.question, answerLanguage: "ca",
      correctAnswer: q.answers[q.correct], correctFrench: fr?.answers[q.correct],
      selectedAnswer: unanswered ? a.timedOut ? "Sans réponse · temps écoulé" : "Question passée · aucune réponse"
        : q.answers[a.selected!] ?? "Réponse enregistrée indisponible",
      selectedFrench: unanswered ? undefined : fr?.answers[a.selected!],
      image: /no-image/i.test(q.image) ? undefined : q.image,
      passed: a.passed, occurrences: 1,
    });
  }
  for (const a of new Map(history.quizAttempts.map(a => [a.id, a])).values()) {
    if ((!a.passed && a.correct) || !inWindow(a.at)) continue;
    const q = vocab.get(a.questionId);
    if (!q) continue;
    rows.push({
      key: `vocab:${q.id}`, questionId: q.id, source: "vocab", at: a.at,
      category: history.vocabTypes[q.type] ?? q.type, icon: "📚", context: "bilingual",
      instruction: q.prompt, question: q.catalan, answerLanguage: q.answer_lang ?? "fr",
      correctAnswer: q.answers[q.correct_option - 1],
      selectedAnswer: a.passed || a.selected === null ? "Question passée · aucune réponse"
        : q.answers[a.selected] ?? "Réponse enregistrée indisponible",
      passed: a.passed, occurrences: 1,
    });
  }
  for (const run of new Map(history.revisionRuns.map(r => [r.id, r])).values()) {
    run.questionIds.forEach((id, i) => {
      const item = revision.get(id), pick = run.picks[i];
      // Old runs have a completion date only; new ones retain answer dates.
      const at = run.answeredAt?.[i] ?? run.completedAt;
      if (!item || pick === undefined || pick === item.q.correct || !inWindow(at)) return;
      const { q, theme } = item;
      const french = run.frenchUsed?.[i];
      rows.push({
        key: `revision:${id}`, questionId: id, source: "revision", at,
        category: theme.title, icon: theme.icon,
        context: french === undefined ? "unknown" : french ? "assisted" : "catalan",
        question: q.prompt, questionFrench: q.french.prompt, answerLanguage: "ca",
        correctAnswer: q.answers[q.correct], correctFrench: q.french.answers[q.correct],
        selectedAnswer: pick === null ? "Question passée · aucune réponse" : q.answers[pick] ?? "Réponse enregistrée indisponible",
        selectedFrench: pick === null ? undefined : q.french.answers[pick],
        passed: pick === null, occurrences: 1,
      });
    });
  }
  rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.key.localeCompare(b.key));
  const distinct = new Map<string, RecentMistake>();
  for (const row of rows) {
    const latest = distinct.get(row.key);
    if (latest) latest.occurrences++;
    else distinct.set(row.key, row);
  }
  return { total: distinct.size, items: [...distinct.values()].slice(0, Math.max(0, Math.min(100, limit))) };
}

export function mistakesText(items: RecentMistake[], imageBase?: string) {
  const lines = [
    `${items.length} question(s) ratée(s) · 72 dernières heures`,
    "Dernière erreur par question. Les questions passées comptent comme ratées.",
    "Une bonne réponse avec aide française n’est pas une erreur.",
  ];
  items.forEach((row, i) => {
    lines.push("", `${i + 1}. ${sourceLabel[row.source]} · ${row.category} · #${row.questionId}`,
      `Date : ${row.at}`, `Langue / aide : ${contextLabel[row.context]}`);
    if (row.occurrences > 1) lines.push(`Erreurs sur cette période : ${row.occurrences}`);
    if (row.instruction) lines.push(`Consigne : ${row.instruction}`);
    lines.push(`Question (catalan) : ${row.question}`);
    if (row.questionFrench) lines.push(`Question (français) : ${row.questionFrench}`);
    if (row.image) lines.push(`Image de la question (à joindre si nécessaire) : ${imageBase ? new URL(row.image, imageBase).href : row.image}`);
    lines.push(`Ma réponse (incorrecte) : ${row.selectedAnswer}`);
    if (row.selectedFrench) lines.push(`Ma réponse (français) : ${row.selectedFrench}`);
    lines.push(`Bonne réponse : ${row.correctAnswer}`);
    if (row.correctFrench) lines.push(`Bonne réponse (français) : ${row.correctFrench}`);
  });
  return lines.join("\n");
}
