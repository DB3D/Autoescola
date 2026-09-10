import test from "node:test";
import assert from "node:assert/strict";
import quiz from "../src/data/quizz.json";
import { drawVocab, vocabBank, vocabTypeName, VOCAB_LENGTH } from "../src/vocab";

test("the Catalan quiz bank is complete and internally consistent", () => {
  assert.equal(vocabBank.length, quiz.question_count);
  assert.equal(vocabBank.length, 200);
  assert.equal(VOCAB_LENGTH, 20);

  const ids = new Set(vocabBank.map((q) => q.id));
  assert.equal(ids.size, vocabBank.length, "question ids must be unique");

  for (const q of vocabBank) {
    assert.equal(q.answers.length, 3, `${q.id} needs exactly three choices`);
    assert.equal(
      new Set(q.answers).size,
      3,
      `${q.id} repeats a choice, which gives the answer away`,
    );
    assert.ok(
      q.correct_option >= 1 && q.correct_option <= 3,
      `${q.id} points outside its choices`,
    );
    assert.ok(vocabTypeName[q.type], `${q.id} has an unlabelled type: ${q.type}`);
    for (const field of ["prompt", "catalan", "note"] as const)
      assert.ok(q[field].trim().length > 0, `${q.id} has an empty ${field}`);
  }
});

test("the correct answer is spread over the three positions", () => {
  // A bank that always answered A would be passable without reading anything.
  const counts = [0, 0, 0];
  for (const q of vocabBank) counts[q.correct_option - 1]++;
  for (const [i, n] of counts.entries())
    assert.ok(
      n >= vocabBank.length / 6,
      `position ${"ABC"[i]} only holds ${n} of ${vocabBank.length} answers`,
    );
});

test("a draw takes distinct questions and never exceeds the bank", () => {
  for (let run = 0; run < 50; run++) {
    const drawn = drawVocab();
    assert.equal(drawn.length, VOCAB_LENGTH);
    assert.equal(
      new Set(drawn.map((q) => q.id)).size,
      VOCAB_LENGTH,
      "a run must not repeat a question",
    );
    for (const q of drawn) assert.ok(vocabBank.includes(q));
  }
  assert.equal(drawVocab(500).length, vocabBank.length);
});

test("successive draws differ, so the quiz is not a fixed list", () => {
  const first = drawVocab().map((q) => q.id).join();
  const differs = Array.from({ length: 20 }, () =>
    drawVocab().map((q) => q.id).join(),
  ).some((ids) => ids !== first);
  assert.ok(differs, "every draw returned the same 20 questions");
});
