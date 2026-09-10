import quiz from "./data/quizz.json";

export type VocabQuestion = {
  id: string;
  type: string;
  prompt: string;
  catalan: string;
  answers: string[];
  correct_option: number; // 1-based, as in the question bank.
  note: string;
};

export const VOCAB_LENGTH = quiz.quiz_length;
export const vocabBank: VocabQuestion[] = quiz.questions;
export const vocabTypeName: Record<string, string> = quiz.types;

// The quiz keeps no history: every run is a fresh draw from the whole bank.
export function drawVocab(
  count = VOCAB_LENGTH,
  bank: VocabQuestion[] = vocabBank,
): VocabQuestion[] {
  const pool = [...bank];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
