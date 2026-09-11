import test from "node:test";
import assert from "node:assert/strict";
import quiz from "../src/data/quizz.json";
import type { QuizAttempt } from "../src/engine";
import {
  difficultyTier,
  drawVocab,
  vocabBank,
  vocabStats,
  vocabStatsFor,
  vocabTypeName,
  UNSEEN_PRIORITY,
  VOCAB_LENGTH,
} from "../src/vocab";

test("the Catalan quiz bank is complete and internally consistent", () => {
  assert.equal(vocabBank.length, quiz.question_count);
  assert.equal(vocabBank.length, 300);
  assert.equal(VOCAB_LENGTH, 20);

  const ids = new Set(vocabBank.map((q) => q.id));
  assert.equal(ids.size, vocabBank.length, "question ids must be unique");

  for (const q of vocabBank) {
    assert.equal(q.answers.length, 4, `${q.id} needs exactly four choices`);
    assert.equal(
      new Set(q.answers).size,
      4,
      `${q.id} repeats a choice, which gives the answer away`,
    );
    assert.ok(
      q.correct_option >= 1 && q.correct_option <= 4,
      `${q.id} points outside its choices`,
    );
    assert.ok(vocabTypeName[q.type], `${q.id} has an unlabelled type: ${q.type}`);
    assert.ok(
      q.answer_lang === undefined || q.answer_lang === "ca",
      `${q.id} has an unknown answer language`,
    );
    for (const field of ["prompt", "catalan", "note"] as const)
      assert.ok(q[field].trim().length > 0, `${q.id} has an empty ${field}`);
  }
});

test("vocabulary is the largest part, and similar questions are never clones", () => {
  assert.equal(vocabBank.filter((q) => q.type === "vocabulari").length, 170);
  // Important words come back under several angles, but never as the same
  // prompt on the same Catalan text.
  const asked = new Set(vocabBank.map((q) => `${q.prompt}\n${q.catalan}`));
  assert.equal(asked.size, vocabBank.length);
});

test("the correct answer is spread over the four positions", () => {
  // A bank that always answered A would be passable without reading anything.
  const counts = [0, 0, 0, 0];
  for (const q of vocabBank) counts[q.correct_option - 1]++;
  for (const [i, n] of counts.entries())
    assert.ok(
      n >= vocabBank.length / 8,
      `position ${"ABCD"[i]} only holds ${n} of ${vocabBank.length} answers`,
    );
});

test("a draw takes distinct questions and never exceeds the bank", () => {
  for (const mode of ["random", "smart"] as const)
    for (let run = 0; run < 50; run++) {
      const drawn = drawVocab(VOCAB_LENGTH, vocabBank, mode);
      assert.equal(drawn.length, VOCAB_LENGTH);
      assert.equal(
        new Set(drawn.map((q) => q.id)).size,
        VOCAB_LENGTH,
        "a run must not repeat a question",
      );
      for (const q of drawn) assert.ok(vocabBank.includes(q));
    }
  assert.equal(drawVocab(500).length, vocabBank.length);
  assert.equal(drawVocab(500, vocabBank, "smart").length, vocabBank.length);
});

test("successive draws differ, so the quiz is not a fixed list", () => {
  const first = drawVocab().map((q) => q.id).join();
  const differs = Array.from({ length: 20 }, () =>
    drawVocab().map((q) => q.id).join(),
  ).some((ids) => ids !== first);
  assert.ok(differs, "every draw returned the same 20 questions");
});

const NOW = Date.parse("2026-09-10T12:00:00Z");
let serial = 0;
function answer(
  questionId: string,
  correct: boolean,
  minutesAgo: number,
  seconds = 4,
  passed = false,
): QuizAttempt {
  return {
    id: `a${serial++}`,
    runId: "r",
    questionId,
    selected: passed ? null : correct ? 0 : 1,
    correct,
    passed,
    seconds,
    at: new Date(NOW - minutesAgo * 60000).toISOString(),
  };
}

test("an unseen word is not ranked yet", () => {
  const s = vocabStatsFor("q001", [], NOW);
  assert.equal(s.shown, 0);
  assert.equal(s.priority, UNSEEN_PRIORITY);
  assert.equal(difficultyTier(s), "new");
  assert.equal(difficultyTier(undefined), "new");
});

test("a skip counts as a miss and makes the word difficult", () => {
  const skipped = vocabStatsFor("q001", [answer("q001", false, 60, 3, true)], NOW);
  const missed = vocabStatsFor("q001", [answer("q001", false, 60)], NOW);
  assert.equal(skipped.failures, 1);
  assert.equal(skipped.passes, 1);
  assert.equal(skipped.difficulty, missed.difficulty);
  assert.equal(skipped.difficulty, 75);
  assert.equal(difficultyTier(skipped), "hard");
});

test("two quick successes make a word known; slow ones only make it shaky", () => {
  const quick = vocabStatsFor(
    "q001",
    [answer("q001", true, 120, 3), answer("q001", true, 60, 5)],
    NOW,
  );
  const slow = vocabStatsFor(
    "q001",
    [answer("q001", true, 120, 25), answer("q001", true, 60, 30)],
    NOW,
  );
  assert.equal(difficultyTier(quick), "known");
  assert.equal(difficultyTier(slow), "shaky");
  assert.ok(slow.difficulty > quick.difficulty);
});

test("a known word slides back to shaky when it is not revised", () => {
  const rows = (days: number) => [
    answer("q001", true, days * 1440 + 1, 3),
    answer("q001", true, days * 1440, 3),
  ];
  assert.equal(difficultyTier(vocabStatsFor("q001", rows(10), NOW)), "known");
  assert.equal(difficultyTier(vocabStatsFor("q001", rows(40), NOW)), "shaky");
});

test("a word just answered is held back for a few minutes", () => {
  const justNow = vocabStatsFor("q001", [answer("q001", false, 1)], NOW);
  const earlier = vocabStatsFor("q001", [answer("q001", false, 30)], NOW);
  assert.ok(justNow.priority * 5 < earlier.priority);
});

test("the intelligent mode brings difficult words back far more than random", () => {
  const hard = vocabBank.slice(0, 10).map((q) => q.id);
  const known = vocabBank.slice(10, 110).map((q) => q.id);
  const rows = [
    ...hard.flatMap((id) => [answer(id, false, 180), answer(id, false, 120)]),
    ...known.flatMap((id) => [answer(id, true, 2 * 1440 + 1, 3), answer(id, true, 2 * 1440, 3)]),
  ];
  const stats = vocabStats(rows, NOW);
  assert.ok(hard.every((id) => difficultyTier(stats.get(id)) === "hard"));
  assert.ok(known.every((id) => difficultyTier(stats.get(id)) === "known"));

  const hardPerRun = (mode: "random" | "smart") => {
    let total = 0;
    for (let run = 0; run < 300; run++)
      total += drawVocab(VOCAB_LENGTH, vocabBank, mode, stats).filter((q) =>
        hard.includes(q.id),
      ).length;
    return total / 300;
  };
  const smart = hardPerRun("smart"),
    random = hardPerRun("random");
  assert.ok(smart > 3, `only ${smart} difficult words per intelligent run`);
  assert.ok(smart > random * 4, `intelligent ${smart} vs random ${random}`);
});
