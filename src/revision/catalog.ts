import { themes } from './content';
import { MASTERY_TEST_ID } from './engine';
import type { RevisionTheme } from './types';

export const masteryTest: RevisionTheme = {
  id: MASTERY_TEST_ID, title: 'Test Maîtrise', icon: '🎯', color: 'neutral',
  subtitle: '25 questions · tous les thèmes · sans fiches', categories: ['MAITRISE'],
  bankIds: [], articles: '', sources: '', pages: [], questions: themes.flatMap(t => t.questions)
};
export const questionThemes = new Map(themes.flatMap(t => t.questions.map(q => [q.id, t] as const)));
