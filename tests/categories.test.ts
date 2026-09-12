import test from "node:test";
import assert from "node:assert/strict";
import source from "../src/data/questions.json";
import { EXAM_QUOTAS, examGroup, categoryLabel, filterCategories } from "../src/categories";
import { selectQuestions, type Question } from "../src/engine";

const bank: Question[] = source.tests.flatMap(t => t.questions.map(q => ({
  id: q.question_id, question: q.question, answers: q.answers,
  correct: q.correct_option - 1, image: q.image_local, category: q.category, test: t.test_number,
})));

test("All 4,400 questions have an exam group and a readable category label", () => {
  assert.equal(bank.length, 4400);
  for (const q of bank) {
    assert.ok(examGroup(q) in EXAM_QUOTAS);
    assert.notEqual(categoryLabel(q.category!), q.category);
  }
});

test("Exams always draw exactly 15 normativa, 10 safety and 15 signs without duplicates", () => {
  const selections = new Set<string>();
  for (let run = 0; run < 50; run++) {
    const selected = selectQuestions([...bank, bank[0]], run % 2 ? Infinity : 10, "exam", new Map());
    assert.equal(selected.length, 40);
    assert.equal(new Set(selected.map(q => q.id)).size, 40);
    const counts = { normativa: 0, seguretat: 0, senyals: 0 };
    selected.forEach(q => counts[examGroup(q)]++);
    assert.deepEqual(counts, EXAM_QUOTAS);
    selections.add(selected.map(q => q.id).join());
  }
  assert.ok(selections.size > 1);
});

test("Sign interpretation is recognized across topic tags; driver signals stay normativa", () => {
  for (const id of ["934", "933", "935", "1152", "1569", "948", "950", "1138"])
    assert.equal(examGroup(bank.find(q => q.id === id)!), "senyals", id);
  for (const id of ["942", "947", "1169", "1166", "1210"])
    assert.equal(examGroup(bank.find(q => q.id === id)!), "normativa", id);
});

test("An incomplete or unknown exam bank fails explicitly instead of changing the ratio", () => {
  assert.throws(() => selectQuestions(bank.filter(q => examGroup(q) !== "senyals"), 40, "exam", new Map()), /senyals/);
  assert.throws(() => selectQuestions([{ ...bank[0], category: "UNKNOWN" }], 40, "exam", new Map()), /inconnue/);
});

test("Category filters apply before each practice mode, including empty and small selections", () => {
  const categories = new Set(bank.map(q => q.category!));
  assert.equal(filterCategories(bank, categories).length, bank.length);
  const small = filterCategories(bank, new Set(["ANIMALS"]));
  assert.equal(small.length, 15);
  for (const mode of ["smart", "random", "discovery"] as const) {
    const selected = selectQuestions(small, 20, mode, new Map());
    assert.equal(selected.length, 15);
    assert.ok(selected.every(q => q.category === "ANIMALS"));
    assert.deepEqual(selectQuestions(filterCategories(bank, new Set()), 20, mode, new Map()), []);
    assert.equal(selectQuestions(small, Infinity, mode, new Map()).length, 15);
  }
});
