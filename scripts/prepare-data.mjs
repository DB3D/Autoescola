import { readFile, mkdir, writeFile, cp, access } from "node:fs/promises";
const source = JSON.parse(await readFile("src/data/questions.json", "utf8"));
const translations = Object.values(
  JSON.parse(await readFile("src/data/translations.json", "utf8")),
);
const key = (q, a) => JSON.stringify([q, ...a]);
const lookup = new Map(
  translations.map((t) => [
    key(t.question_cat, [t.answer_1_cat, t.answer_2_cat, t.answer_3_cat]),
    t,
  ]),
);
const questions = [],
  french = {},
  ids = new Set();
for (const test of source.tests)
  for (const q of test.questions) {
    if (ids.has(q.question_id)) throw Error(`Duplicate ID ${q.question_id}`);
    ids.add(q.question_id);
    if (q.answers.length !== 3 || ![1, 2, 3].includes(q.correct_option))
      throw Error(`Invalid question ${q.question_id}`);
    await access(`src/${q.image_local}`);
    questions.push({
      id: q.question_id,
      question: q.question,
      answers: q.answers,
      correct: q.correct_option - 1,
      image: q.image_local,
      category: `Test ${test.test_number}`,
    });
    const t = lookup.get(key(q.question, q.answers));
    if (!t)
      throw Error(`Missing exact French translation for ${q.question_id}`);
    french[q.question_id] = {
      question: t.question_fr,
      answers: [t.answer_1_fr, t.answer_2_fr, t.answer_3_fr],
    };
  }
await mkdir("public", { recursive: true });
await writeFile("public/questions_ca.json", JSON.stringify(questions));
await writeFile("public/translations_fr.json", JSON.stringify(french));
await cp("src/images", "public/images", { recursive: true, force: false });
console.log(
  `Validated ${questions.length} questions, exact French matches and image paths.`,
);
