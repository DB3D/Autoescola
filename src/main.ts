import "./style.css";
import { createRevision } from "./revision";
import {
  allStats,
  answerOrder,
  cappedSeconds,
  capAttempt,
  selectQuestions,
  trialRemaining,
  sessionSettings,
  examPassed,
  examSummary,
  recentScores,
  ENDLESS,
  MAX_ANSWER_SECONDS,
  type Question,
  type Translation,
  type Attempt,
  type Session,
  type Mode,
  type Stats,
  practiceDays,
  totalPracticeSeconds,
  type QuizRun,
  type QuizAttempt,
} from "./engine";
import { readAll, saveSession, saveQuizRun, saveQuizAttempt } from "./storage";
import { unlock } from "./lock";
import {
  difficultyTier,
  drawVocab,
  vocabBank,
  vocabStats,
  vocabStatsFor,
  vocabTypeName,
  VOCAB_LENGTH,
  type QuizMode,
  type VocabQuestion,
} from "./vocab";
const root = document.querySelector<HTMLDivElement>("#app")!;
const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const base = import.meta.env.BASE_URL;
let bank: Question[] = [],
  fr: Record<string, Translation> = {},
  attempts: Attempt[] = [],
  sessions: Session[] = [],
  stats = new Map<string, Stats>();
let mode: Mode = "smart",
  count = 20,
  autoFrench = false,
  timeTrial = false,
  clockTimer: number | undefined,
  active: Session | null = null,
  pool: string[] = [], // Questions still to serve in an endless session.
  index = 0,
  shownAt = 0,
  shownAtDate = 0,
  revealed = false,
  order: number[] = [],
  manual = false,
  answered = false,
  answeredAt = 0,
  timer: number | undefined,
  saving = false,
  saveError = false,
  storageError = false;
// The Català quiz is a standalone drill with its own difficulty tracking: its
// answers never reach the driving attempts, statistics or mastery.
let quizMode: QuizMode = "smart",
  quizAttempts: QuizAttempt[] = [],
  quizRunId = "",
  quizRun: VocabQuestion[] | null = null,
  quizPicks: (number | null)[] = [],
  quizIndex = 0,
  quizOrder: number[] = [],
  quizAnswered = false,
  quizAnsweredAt = 0,
  quizRuns: QuizRun[] = [], // Finished runs, kept only for the practice time.
  quizShownAt = 0,
  quizSeconds = 0;
const modeName: Record<Session["mode"], string> = {
  random: "Aléatoire",
  medium: "Difficulté moyenne",
  discovery: "Discovery",
  smart: "Entraînement intelligent",
  exam: "Simulation examen",
};
const pct = (v: number) => `${Math.round(v * 100)} %`;
const time = (n: number) =>
  n < 60
    ? `${Math.round(n)} s`
    : n < 3600
      ? `${Math.floor(n / 60)} min ${Math.round(n % 60)} s`
      : `${Math.floor(n / 3600)} h ${String(Math.floor((n % 3600) / 60)).padStart(2, "0")} min`;
const stopwatch = (n: number) => {
  const s = Math.max(0, Math.floor(n)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  const rest = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
  return h ? `${h}:${rest}` : rest;
};
function languageButton() {
  if ((active?.mode ?? mode) === "exam") return '<button class="language-button" id="reveal" type="button" disabled aria-label="Francès desactivat durant l’examen" title="Francès desactivat durant l’examen"><span class="france-flag" aria-hidden="true">🇫🇷</span></button>';
  const visible = active ? revealed : autoFrench;
  const label = active
    ? visible ? "Traductions françaises visibles" : "Afficher les traductions en français"
    : "Afficher automatiquement les traductions en français";
  return `<button class="language-button" id="reveal" type="button" aria-label="${label}" aria-pressed="${visible}" title="${label}" ${active && visible ? "disabled" : ""}><span class="france-flag" aria-hidden="true">🇫🇷</span></button>`;
}
function headerLead() {
  if (quizRun)
    return `<button class="quit-button" id="quit" aria-label="Stop"><span aria-hidden="true">↩</span><span class="quit-label">Stop</span></button><b class="header-count"><span class="count-label"> </span>${quizIndex + 1}<span> / ${quizRun.length}</span></b>`;
  if (!active)
    return '<a href="#" id="brand" aria-label="Accueil"><span class="brand-car" aria-hidden="true">🚗</span><span>AutoEscola<small>ANDORRE</small></span></a>';
  const exam = active.mode === "exam";
  const label = exam ? "Surt" : "Stop";
  return `<button class="quit-button" id="quit" aria-label="${label}"><span aria-hidden="true">↩</span><span class="quit-label">${label}</span></button><b class="header-count"><span class="count-label"> </span>${index + 1}<span> / ${active.endless ? "∞" : active.questionIds.length}</span></b>`;
}
function headerTools() {
  // The quiz is a French↔Catalan drill on its own: no translation toggle, no clock.
  if (quizRun) return "";
  if (!active) return "";
  const gauge =
    active.mode === "exam"
      ? ""
      : `<div id="timer" class="timer" role="meter" aria-label="Temps de réponse" aria-valuemin="0" aria-valuemax="${MAX_ANSWER_SECONDS}" aria-valuenow="0" aria-valuetext="0 seconde"><span class="timer-label" aria-hidden="true">0 s</span></div>`;
  const clock = active.timeTrial
    ? '<span id="trial-clock" class="clock" role="timer" aria-label="Temps restant pour le test"></span>'
    : `<span id="session-clock" class="clock" role="timer" aria-label="Temps écoulé dans cette session">${stopwatch(elapsed())}</span>`;
  return `${gauge}${clock}${languageButton()}`;
}
function elapsed() {
  return active ? (Date.now() - Date.parse(active.startedAt)) / 1000 : 0;
}
function updateElapsed() {
  const clock = document.querySelector<HTMLElement>("#session-clock");
  if (clock) clock.textContent = stopwatch(elapsed());
}
const revision = createRevision((content, testing) => shell(content, "revision", testing));
function shell(content: string, tab = "practice", revisionTest = false) {
  if (tab !== "revision") revision.leave();
  document.documentElement.lang = active?.mode === "exam" ? "ca" : "fr";
  root.innerHTML = `<div class="app-shell"><header>${revisionTest ? '<b>📖 Révision</b>' : headerLead()}<div class="header-actions">${tab === "revision" ? revision.header() : headerTools()}</div>${tab === "revision" ? revision.headerNav() : ''}</header><main>${content}</main>${active || quizRun || revisionTest ? "" : `<nav aria-label="Navigation principale">
    <button data-nav="practice" class="${tab === "practice" ? "current" : ""}"><span>◎</span> Pratiquer</button>
    <button data-nav="exams" class="${tab === "exams" ? "current" : ""}"><span>▣</span> Exam</button>
    <button data-nav="revision" class="${tab === "revision" ? "current" : ""}"><span>▧</span> Révision</button>
    <button data-nav="vocab" class="${tab === "vocab" ? "current" : ""}"><span>▤</span> Català</button>
    <button data-nav="stats" class="${tab === "stats" ? "current" : ""}"><span>▥</span> Progression</button>
    <!-- Historique: navigation hidden; page and saved history remain available in the code.
    <button data-nav="history" class="${tab === "history" ? "current" : ""}"><span>◷</span> Historique</button>
    -->
  </nav>`}</div>`;
  if (!active && !quizRun && !revisionTest) {
    document.querySelector("#brand")!.addEventListener("click", (e) => {
      e.preventDefault();
      home();
    });
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-nav]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          b.dataset.nav === "practice"
            ? home()
            : b.dataset.nav === "history"
              ? history()
              : b.dataset.nav === "exams"
                ? exams()
                : b.dataset.nav === "vocab" ? quizHome() : b.dataset.nav === "revision" ? void revision.open() : progress()),
    );
}
function home() {
  clearInterval(timer);
  clearInterval(clockTimer);
  active = null;
  quizRun = null;
  // Exam mode displays its own fixed settings without overwriting the
  // preferences, which are restored as soon as another mode is picked.
  const forced = sessionSettings(mode, count, autoFrench, timeTrial);
  const endless = forced.count === ENDLESS;
  const lengths: { value: number; label: string; note: string }[] = [
    ...[10, 20, 40, 60].map((n) => ({ value: n, label: String(n), note: "questions" })),
    { value: ENDLESS, label: "∞", note: "sans fin" },
  ];
  const trialNote = endless
    ? "Indisponible en mode sans fin."
    : `${forced.count} questions = ${forced.count} minutes au total.`;
  shell(
    `${storageError ? '<p class="warning">Le stockage local est indisponible. Tu peux pratiquer et exporter la session avant de quitter.</p>' : ""}<section class="setup"><div class="section-heading"><h2>Prépare ta session</h2></div><fieldset><legend>Comment veux-tu pratiquer ?</legend>${(["smart", "random", "discovery", "exam"] as Mode[]).map((m, i) => `<label class="mode-card"><input type="radio" name="mode" value="${m}" ${mode === m ? "checked" : ""}><span class="mode-icon">${["✦", "⤨", "◒", "▣"][i]}</span><span><b>${modeName[m]}</b><small>${["Travaille tes points faibles", "Explore toutes les questions du programme", "Questions inédites, peu vues ou anciennes", "40 questions · 40 min · Catalan uniquement"][i]}</small></span><span class="radio-mark"></span></label>`).join("")}</fieldset><fieldset><legend>Combien de questions ?</legend><div class="lengths">${lengths.map((l) => `<label><input type="radio" name="count" value="${l.value}" ${forced.count === l.value ? "checked" : ""}><span>${l.label}<small>${l.note}</small></span></label>`).join("")}</div></fieldset><label class="french-toggle"><span><b>Aide en français</b><small>Afficher les traductions dès le début</small></span><input type="checkbox" id="auto-fr" role="switch" ${forced.french ? "checked" : ""}></label><p class="helper">Avec l’aide, les bonnes réponses rapportent 50 % des points de maîtrise. Tu peux aussi révéler le français pendant la question.</p><label class="french-toggle"><span><b>Time trial</b><small id="trial-duration">${trialNote}</small></span><input type="checkbox" id="time-trial" role="switch" ${forced.trial ? "checked" : ""}></label><p class="helper">Un chrono global, sans limite par question. À zéro, le test s’arrête et les résultats sont enregistrés. Sans lui, le temps de la session compte simplement à partir de zéro.</p><button class="primary" id="start">Commencer la session <span>→</span></button></section><p class="privacy">Sur cet appareil uniquement · Sans compte</p>`,
  );
  document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach(
    (e) =>
      (e.onchange = () => {
        mode = e.value as Mode;
        home();
      }),
  );
  document.querySelectorAll<HTMLInputElement>('input[name="count"]').forEach(
    (e) =>
      (e.onchange = () => {
        count = +e.value;
        home(); // The endless length also decides whether time trial is offered.
      }),
  );
  document.querySelector<HTMLInputElement>("#auto-fr")!.onchange = (e) => {
    autoFrench = (e.target as HTMLInputElement).checked;
  };
  document.querySelector<HTMLButtonElement>("#start")!.onclick = start;
  document.querySelector<HTMLInputElement>("#time-trial")!.onchange = e => {
    timeTrial = (e.target as HTMLInputElement).checked;
  };
  if (mode === "exam")
    document.querySelectorAll<HTMLInputElement>('input[name="count"], #auto-fr, #time-trial').forEach(input => { input.disabled = true; });
  else if (endless)
    document.querySelector<HTMLInputElement>("#time-trial")!.disabled = true;
}
function start() {
  const settings = sessionSettings(mode, count, autoFrench, timeTrial);
  stats = allStats(attempts);
  const selected = selectQuestions(bank, settings.count, mode, stats);
  const endless = settings.count === ENDLESS;
  // Endless keeps the drawn order in reserve and serves one question at a time,
  // so the record holds only what was actually asked.
  pool = endless ? selected.slice(1).map((q) => q.id) : [];
  active = {
    id: crypto.randomUUID(),
    mode,
    startedAt: new Date().toISOString(),
    completedAt: "",
    duration: 0,
    questionIds: endless ? selected.slice(0, 1).map((q) => q.id) : selected.map((q) => q.id),
    attempts: [],
    timeTrial: settings.trial,
    deadlineAt: settings.trial ? new Date(Date.now() + selected.length * 60000).toISOString() : undefined,
    ...(endless ? { endless: true } : {}),
  };
  index = 0;
  question();
  clockTimer = window.setInterval(() => {
    updateElapsed();
    updateTrialClock();
  }, 250);
}
function updateTrialClock(): boolean {
  if (!active || saving) return false;
  if (active.timedOut) return true;
  const remaining = trialRemaining(active);
  if (remaining === null) return false;
  const clock = document.querySelector<HTMLElement>("#trial-clock");
  if (clock) {
    const seconds = Math.ceil(remaining);
    clock.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
    clock.classList.toggle("urgent", remaining <= 60);
    clock.setAttribute("aria-label", active.mode === "exam" ? `Temps restant: ${Math.floor(seconds / 60)} minuts i ${seconds % 60} segons` : `Time trial : ${Math.floor(seconds / 60)} minutes et ${seconds % 60} secondes restantes`);
  }
  if (remaining > 0) return false;
  clearInterval(clockTimer);
  active.timedOut = true;
  active.completedAt = active.deadlineAt!;
  if (!answered) answer(null, true);
  document.querySelector<HTMLDialogElement>("#image-dialog")?.close();
  void finish();
  return true;
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateTrialClock();
});
window.addEventListener("focus", () => updateTrialClock());
function current() {
  return bank.find((q) => q.id === active!.questionIds[index])!;
}
function french(text: string) {
  if (active?.mode === "exam") return "";
  return `<span lang="fr" class="fr ${revealed ? "" : "concealed"}" ${revealed ? "" : 'aria-hidden="true"'}>${esc(text)}</span>`;
}
function questionMetadata(q: Question) {
  const history = stats.get(q.id);
  const tries = history?.shown ?? 0;
  const difficulty = tries ? `${Math.round(100 - history!.mastery)}/100` : "À évaluer";
  const last = history?.lastAsked;
  const lastLabel = last
    ? new Date(last).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    : "Jamais";
  return `<div class="question-meta" tabindex="0" role="group" aria-label="Informations et statistiques de la question"><span class="tag">${esc(q.category ?? "—")}</span><span>Test ${esc(q.test ?? "?")} · #${esc(q.id)}</span><span>${tries} ${tries === 1 ? "tentative" : "tentatives"}</span><span title="Difficulté personnelle : 100 moins le score de maîtrise. Un score élevé indique une question plus difficile.">Difficulté : ${difficulty}</span><span>Dernière réponse : ${esc(lastLabel)}</span></div>`;
}
function examQuestionMarkup(q: Question) {
  return `<progress value="${index}" max="40" aria-label="Progrés de l’examen"></progress><button class="image-frame" id="enlarge" aria-label="Amplia la imatge"><img src="${base}${esc(q.image)}" alt="Imatge de la pregunta ${esc(q.id)}"><span>⤢</span></button><div class="question-copy"><div class="eyebrow">Test ${esc(q.test ?? "?")} · #${esc(q.id)}</div><h2 id="question-title" tabindex="-1" lang="ca">${esc(q.question)}</h2></div><div class="answers">${order.map((a, i) => `<button class="answer" data-answer="${a}"><span class="letter">${"ABC"[i]}</span><span><b lang="ca">${esc(q.answers[a])}</b></span></button>`).join("")}</div><div class="question-actions"><p class="next-hint" id="next" role="status" hidden>Toca qualsevol lloc per ${index === 39 ? "finalitzar l’examen" : "continuar"} <span aria-hidden="true">→</span></p></div><dialog id="image-dialog"><button id="close-image" class="secondary">Tanca la imatge</button><img src="${base}${esc(q.image)}" alt="Imatge ampliada de la pregunta"></dialog>`;
}
function question() {
  clearInterval(timer);
  revealed = active?.mode === "exam" ? false : autoFrench;
  manual = false;
  answered = false;
  const q = current();
  const t = fr[q.id];
  order = answerOrder(q.answers.length);
  shell(active!.mode === "exam" ? examQuestionMarkup(q) :
    `${active!.endless ? "" : `<progress value="${index}" max="${active!.questionIds.length}" aria-label="Progression de la session"></progress>`}<button class="image-frame" id="enlarge" aria-label="Agrandir l’image"><img src="${base}${esc(q.image)}" alt="Image de la question ${esc(q.id)}"><span>⤢</span></button><div class="question-copy">${questionMetadata(q)}<h2 tabindex="-1" id="question-title" lang="ca">${esc(q.question)}</h2>${french(t?.question ?? "Traduction indisponible")}</div><div class="answers">${order.map((a, i) => `<button class="answer" data-answer="${a}"><span class="letter">${"ABC"[i]}</span><span><b lang="ca">${esc(q.answers[a])}</b>${french(t?.answers[a] ?? "Traduction indisponible")}</span><span class="answer-state"></span></button>`).join("")}<button class="answer" id="skip"><span class="letter">D</span><span><b>Passer cette question</b></span><span class="answer-state"></span></button></div><div id="feedback" role="status" aria-live="polite"></div><div class="question-actions"><p class="next-hint" id="next" role="status" hidden>Clique n’importe où pour ${lastQuestion() ? "terminer et enregistrer" : "passer à la question suivante"} <span aria-hidden="true">→</span></p></div>${active!.endless ? '<div class="end-session"><span class="sep" aria-hidden="true"></span><span class="sep" aria-hidden="true"></span><span class="sep" aria-hidden="true"></span><button class="danger-button" id="end-session">Terminer la session</button></div>' : ""}<dialog id="image-dialog"><button id="close-image" class="secondary">Fermer l’image</button><img src="${base}${esc(q.image)}" alt="Image agrandie de la question"></dialog>`,
  );
  // stopPropagation keeps the answering click from reaching the advance
  // handler below, which would skip the feedback entirely.
  document
    .querySelectorAll<HTMLButtonElement>("[data-answer]")
    .forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          answer(+b.dataset.answer!);
        }),
    );
  const skip = document.querySelector<HTMLButtonElement>("#skip");
  if (skip)
    skip.onclick = (e) => {
      e.stopPropagation();
      answer(null);
    };
  const end = document.querySelector<HTMLButtonElement>("#end-session");
  if (end)
    end.onclick = (e) => {
      e.stopPropagation();
      endSession();
    };
  document.querySelector<HTMLButtonElement>("#reveal")!.onclick = () => {
    if (active?.mode === "exam") return;
    if (updateTrialClock()) return;
    if (answered) return;
    manual = true;
    revealed = true;
    showFrench();

  };
  // Once answered, the page itself advances; the header, the enlarged image
  // and its dialog keep their own actions.
  document.querySelector<HTMLElement>(".app-shell")!.onclick = (e) => {
    if (!(e.target as HTMLElement).closest("header, dialog, #enlarge")) advance();
  };
  document.querySelector<HTMLButtonElement>("#quit")!.onclick = () => {
    if (
      confirm(
        active?.mode === "exam" ? "Vols sortir? L’examen no es desarà." : "Quitter ? Les réponses de cette session ne sont pas encore enregistrées.",
      )
    )
      home();
  };
  const dialog = document.querySelector<HTMLDialogElement>("#image-dialog")!;
  document.querySelector<HTMLButtonElement>("#enlarge")!.onclick = () =>
    dialog.showModal();
  document.querySelector<HTMLButtonElement>("#close-image")!.onclick = () =>
    dialog.close();
  document.querySelector("img")!.addEventListener("error", (e) => {
    (e.target as HTMLImageElement).alt =
      active?.mode === "exam" ? "No s’ha pogut carregar la imatge. Comprova la connexió." : "Impossible de charger l’image. Vérifie ta connexion et réessaie.";
  });
  shownAt = performance.now();
  shownAtDate = Date.now();
  if (updateTrialClock()) return;
  timer = window.setInterval(() => {
    const s = (performance.now() - shownAt) / 1000;
    updateTimer(s);
  }, 250);
  window.scrollTo(0, 0);
  document
    .querySelector<HTMLElement>("#question-title")
    ?.focus({ preventScroll: true });
}
function lastQuestion() {
  return active!.endless
    ? pool.length === 0
    : index + 1 === active!.questionIds.length;
}
function advance() {
  if (!active || !answered || saving) return;
  // A tap that answers can be followed by a ghost click on the redrawn page;
  // ignoring the first moments keeps it from skipping the feedback.
  if (Date.now() - answeredAt < 300) return;
  if (updateTrialClock()) return;
  if (lastQuestion()) {
    void finish();
    return;
  }
  if (active.endless) active.questionIds.push(pool.shift()!);
  index++;
  question();
}
function endSession() {
  if (!active || saving) return;
  // The question on screen only belongs to the record once it is answered.
  if (!answered) active.questionIds = active.questionIds.slice(0, index);
  if (!active.attempts.length) {
    home();
    return;
  }
  void finish();
}
// Keyboard equivalent of clicking the page to move on. Enter and Space are
// left to whatever control has focus; the arrow always advances.
document.addEventListener("keydown", (e) => {
  // Outside an answered question these keys belong to the page: typing in a
  // field, scrolling with Space, activating whatever has focus.
  if (quizRun ? !quizAnswered : !active || !answered || saving) return;
  if (!["Enter", " ", "ArrowRight"].includes(e.key)) return;
  if (document.querySelector("dialog[open]")) return;
  const target = e.target as HTMLElement;
  if (target.closest("input, textarea, select, a, summary")) return;
  if (e.key !== "ArrowRight" && target.closest("button")) return;
  e.preventDefault();
  if (quizRun) quizAdvance();
  else advance();
});
function updateTimer(seconds: number) {
  const el = document.querySelector<HTMLElement>("#timer");
  if (!el) return;
  const capped = cappedSeconds(seconds),
    whole = Math.floor(capped),
    maxed = capped >= MAX_ANSWER_SECONDS;
  el.style.setProperty("--timer-fill", `${(capped / MAX_ANSWER_SECONDS) * 100}%`);
  el.classList.toggle("timer-warning", capped >= 40 && capped < 50);
  el.classList.toggle("timer-full", capped >= 50);
  el.setAttribute("aria-valuenow", String(whole));
  el.setAttribute(
    "aria-valuetext",
    maxed
      ? `${MAX_ANSWER_SECONDS} secondes, trop lent`
      : `${whole} secondes${capped >= 50 ? ", réflexe lent" : ""}`,
  );
  el.querySelector(".timer-label")!.textContent = maxed
    ? "Trop lent !"
    : `${whole} s`;
}
function showFrench() {
  if (active?.mode === "exam") return;
  document.querySelectorAll(".fr").forEach((e) => {
    e.classList.remove("concealed");
    e.removeAttribute("aria-hidden");
  });
  const button = document.querySelector<HTMLButtonElement>("#reveal");
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", "Traductions françaises visibles");
    button.title = answered ? "Traductions françaises visibles" : "Français visible · 50 % des points";
  }
}
function answer(selected: number | null, timedOut = false) {
  if (answered || !active) return;
  if (active.mode === "exam" && selected === null && !timedOut) return;
  if (!timedOut && updateTrialClock()) return;
  answered = true;
  answeredAt = Date.now();
  clearInterval(timer);
  const q = current(),
    seconds = cappedSeconds(
      timedOut
        ? (Date.parse(active.deadlineAt!) - shownAtDate) / 1000
        : (performance.now() - shownAt) / 1000,
    ),
    correct = selected === q.correct;
  updateTimer(seconds);
  active.attempts.push({
    id: crypto.randomUUID(),
    sessionId: active.id,
    questionId: q.id,
    selected,
    correct,
    passed: selected === null && active.mode !== "exam",
    seconds: Math.round(seconds * 100) / 100,
    slow_reflex: seconds >= 50,
    frenchVisible: revealed,
    frenchManuallyRevealed: manual,
    at: new Date().toISOString(),
    ...(timedOut ? { timedOut: true, at: active.deadlineAt! } : {}),
  });
  document.querySelector(".answers")!.classList.add("locked");
  if (active.mode === "exam") {
    document.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach(button => {
      button.disabled = true;
      button.classList.toggle("selected", +button.dataset.answer! === selected);
    });
    if (!timedOut) document.querySelector<HTMLElement>("#next")!.hidden = false;
    return;
  }
  document.querySelector(".app-shell")!.classList.add(correct ? "flash-success" : "flash-failure");
  showFrench();
  document.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((b) => {
    const i = +b.dataset.answer!;
    b.disabled = true;
    b.classList.toggle("correct", i === q.correct);
    b.classList.toggle("incorrect", i === selected && !correct);
    b.querySelector(".answer-state")!.textContent =
      i === q.correct ? "✓" : i === selected ? "✕" : "";
  });
  document.querySelector<HTMLButtonElement>("#skip")!.disabled = true;
  if (selected === null) {
    const skip = document.querySelector<HTMLButtonElement>("#skip")!;
    skip.classList.add("incorrect");
    skip.querySelector(".answer-state")!.textContent = "✕";
  }

  document.querySelector<HTMLElement>("#next")!.hidden = false;
  document.querySelector("#feedback")!.innerHTML =
    `<div class="feedback ${correct ? "good" : "bad"}"><span class="thumb">${correct ? "👍" : "👎"}</span><b>${correct ? "Bonne réponse !" : selected === null ? "Question passée." : "Réponse incorrecte."}</b><span>${correct ? "" : `Bonne réponse : ${"ABC"[order.indexOf(q.correct)]}. `}${seconds >= 50 ? "Réflexe lent · pénalité de maîtrise." : ""}</span></div>${fr[q.id]?.tip ? `<p lang="fr">${esc(fr[q.id].tip)}</p>` : ""}`;
}
async function finish() {
  if (!active || saving) return;
  clearInterval(timer);
  clearInterval(clockTimer);
  saving = true;
  document.querySelectorAll<HTMLButtonElement>("button").forEach(button => { button.disabled = true; });
  const hint = document.querySelector<HTMLElement>("#next");
  if (hint) {
    hint.hidden = false;
    hint.textContent = active.mode === "exam" ? "Desant l’examen…" : "Enregistrement…";
  }
  active.completedAt ||= new Date().toISOString();
  active.duration =
    (Date.parse(active.completedAt) - Date.parse(active.startedAt)) / 1000;
  try {
    await saveSession(active);
    const merged = new Map(attempts.map((a) => [a.id, a]));
    active.attempts.forEach((a) => merged.set(a.id, a));
    attempts = [...merged.values()];
    sessions = [active, ...sessions.filter((s) => s.id !== active!.id)];
    stats = allStats(attempts);
    saveError = false;
    storageError = false;
  } catch {
    saveError = true;
  }
  saving = false;
  const done = active;
  active = null;
  result(done);
  window.scrollTo(0, 0);
}
function metrics(
  rows: Attempt[],
  duration?: number,
  total = rows.length,
  durationLabel = "Durée totale",
) {
  const ok = rows.filter((a) => a.correct).length;
  return `<div class="score"><strong>${ok}<span> / ${total}</span></strong><p>bonnes réponses · ${pct(ok / (total || 1))}</p></div><div class="metric-grid">${[
    [rows.filter((a) => !a.correct && !a.passed).length, "Incorrectes"],
    [rows.filter((a) => a.passed).length, "Passées"],
    [
      time(rows.reduce((s, a) => s + a.seconds, 0) / (rows.length || 1)),
      "Temps moyen",
    ],
    [rows.filter((a) => a.slow_reflex).length, "Réflexes lents"],
    [rows.filter((a) => a.frenchVisible).length, "Avec français"],
    [time(duration ?? rows.reduce((s, a) => s + a.seconds, 0)), durationLabel],
  ]
    .map(
      ([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`,
    )
    .join("")}</div>`;
}
function review(rows: Attempt[], exam = false) {
  return [...rows]
    .sort((a, b) => risk(b) - risk(a))
    .map((a) => {
      const q = bank.find((q) => q.id === a.questionId);
      return `<details class="review"><summary><span class="result-mark ${a.correct ? "good" : "bad"}">${a.correct ? "✓" : a.passed ? "—" : "✕"}</span><span><span lang="ca">${esc(q?.question ?? a.questionId)}</span><small>${time(a.seconds)} · ${a.frenchVisible ? "Avec français" : "Sans français"}${a.timedOut ? " · Temps écoulé" : ""}${a.slow_reflex ? " · Réflexe lent" : ""} · Maîtrise ${Math.round(stats.get(a.questionId)?.mastery ?? 0)}/100</small></span></summary><div class="review-body">${q ? `<img loading="lazy" src="${base}${esc(q.image)}" alt="Image de la question"><p>Ta réponse : ${a.selected === null ? a.timedOut ? "Sans réponse (temps écoulé)" : "Passée" : `<span lang="ca">${esc(q.answers[a.selected])}</span>`}</p><p class="good"><b>Bonne réponse : <span lang="ca">${esc(q.answers[q.correct])}</span></b></p>${exam ? "" : `<p lang="fr">${esc(fr[q.id]?.question ?? "")}</p><p lang="fr">${esc(fr[q.id]?.answers[q.correct] ?? "")}</p>`}` : ""}</div></details>`;
    })
    .join("");
}
function risk(a: Attempt) {
  return (
    (!a.correct ? 100 : 0) +
    Math.min(a.seconds, 120) +
    (a.frenchVisible ? 20 : 0) +
    (100 - (stats.get(a.questionId)?.mastery ?? 0)) * 0.3
  );
}
function result(s: Session) {
  shell(
    `<div class="eyebrow">SESSION TERMINÉE</div><h1>${s.mode === "exam" ? examPassed(s) ? "Examen réussi" : "Examen échoué" : "Un pas de plus."}</h1>${s.mode === "exam" ? '<p class="muted">Seuil de réussite : 38 bonnes réponses sur 40.</p>' : ""}<p class="muted">${modeName[s.mode]}${s.endless ? " · Sans fin" : ""}${s.timeTrial ? " · Time trial" : ""} · ${new Date(s.completedAt).toLocaleDateString("fr-FR")}</p>${saveError ? '<div class="warning">Échec de l’enregistrement. Exporte la session ou réessaie avant de quitter.<button id="retry" class="secondary">Réessayer l’enregistrement</button></div>' : '<p class="saved">✓ Progression enregistrée sur cet appareil</p>'}${s.timedOut ? `<div class="warning" role="alert"><b>Temps écoulé — test terminé.</b><p>Le chrono de ${s.questionIds.length} minutes est arrivé à zéro. ${s.questionIds.length - s.attempts.length} question(s) non abordée(s). ${s.attempts.some(a => a.timedOut) ? s.mode === "exam" ? "La question restée sans réponse compte comme incorrecte." : "La question restée sans réponse est comptée comme passée." : ""}</p></div>` : ""}${metrics(s.attempts, s.duration, s.questionIds.length)}<button class="primary" id="again">Préparer une autre session →</button><button class="secondary full" id="export-session">Sauvegarder mon historique (JSON)</button><h2 class="review-title">Les points à retravailler</h2><p class="muted">En premier, les questions qui méritent le plus de pratique.</p>${review(s.attempts, s.mode === "exam")}`,
    "history",
  );
  document.querySelector<HTMLButtonElement>("#again")!.onclick = () => {
    if (
      !saveError ||
      confirm("La session n’est pas enregistrée. L’as-tu exportée et veux-tu continuer ?")
    ) {
      saveError = false;
      home();
    }
  };
  document.querySelector<HTMLButtonElement>("#export-session")!.onclick = () =>
    exportProgress(s);
  const retry = document.querySelector<HTMLButtonElement>("#retry");
  if (retry)
    retry.onclick = () => {
      active = s;
      void finish();
    };
  if (saveError) {
    document
      .querySelectorAll<HTMLButtonElement>("nav button")
      .forEach((b) => (b.disabled = true));
    const brand = document.querySelector("#brand")!;
    brand.replaceWith(brand.cloneNode(true)); // Drop its listener: leaving would lose the session.
  }
}
function exams() {
  const summary = examSummary(sessions);
  shell(`<div class="eyebrow">SIMULATIONS UNIQUEMENT</div><h1>Exams</h1><p class="muted">40 questions · 40 minutes · Réussite à partir de 38/40.</p><div class="score"><strong>${summary.rate === null ? "—" : pct(summary.rate)}</strong><p>taux d’examens réussis · ${summary.passed} sur ${summary.recent.length}</p></div><section class="exam-readiness"><h2>${summary.ready ? "Prêt selon tes simulations" : summary.recent.length < 5 ? "Préparation à confirmer" : "Encore un peu d’entraînement"}</h2><p>${summary.ready ? "Tes 5 derniers examens sont réussis." : "Repère de préparation : réussir 5 examens consécutifs avec au moins 38 bonnes réponses."}</p><p class="helper">Indicateur basé sur tes simulations, pas une garantie de réussite à l’examen.</p></section><button class="primary" id="prepare-exam">Préparer un examen →</button><h2 class="review-title">Les 20 derniers examens</h2>${summary.recent.length ? summary.recent.map(s => `<button class="session-row" data-exam="${s.id}"><span><b>${examPassed(s) ? "Réussi" : "Échoué"}${s.timedOut ? " · Temps écoulé" : ""}</b><small>${new Date(s.completedAt).toLocaleString("fr-FR")} · ${time(s.duration)}</small></span><strong class="${examPassed(s) ? "good" : "bad"}">${s.attempts.filter(a => a.correct).length}/40 →</strong></button>`).join("") : '<p class="empty">Aucun examen terminé. Tes sessions d’entraînement ne comptent pas ici.</p>'}`, "exams");
  document.querySelector<HTMLButtonElement>("#prepare-exam")!.onclick = () => {
    mode = "exam"; // Exam settings are forced at start, never written over the preferences.
    home();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-exam]").forEach(button => {
    button.onclick = () => { saveError = false; result(sessions.find(s => s.id === button.dataset.exam)!); };
  });
}
function quizHome() {
  clearInterval(timer);
  clearInterval(clockTimer);
  active = null;
  quizRun = null;
  const counts = vocabBank.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] ?? 0) + 1;
    return acc;
  }, {});
  const stats = vocabStats(quizAttempts);
  const tiers = { hard: 0, shaky: 0, known: 0, new: 0 };
  for (const q of vocabBank) tiers[difficultyTier(stats.get(q.id))]++;
  // Only words that are still a problem: a known word is not worth listing.
  const hardest = vocabBank
    .map((q) => ({ q, s: stats.get(q.id) }))
    .filter(({ s }) => s && difficultyTier(s) !== "known")
    .sort((a, b) => b.s!.difficulty - a.s!.difficulty)
    .slice(0, 12);
  const modes: [QuizMode, string, string, string][] = [
    ["smart", "✦", "Entraînement intelligent", "Revient surtout sur les mots classés difficiles, avec quelques mots jamais vus"],
    ["random", "⤨", "Aléatoire", `${VOCAB_LENGTH} questions au hasard parmi les ${vocabBank.length}`],
  ];
  shell(
    `<div class="eyebrow">LECTURE DU CATALAN</div><h1>Català</h1><p class="muted">${VOCAB_LENGTH} questions parmi ${vocabBank.length} : ${Object.entries(counts)
      .map(([type, n]) => `${n} ${esc((vocabTypeName[type] ?? type).toLocaleLowerCase("fr-FR"))}`)
      .join(" · ")}.</p><section class="setup"><fieldset><legend>Comment veux-tu t’entraîner ?</legend>${modes
      .map(
        ([m, icon, name, note]) =>
          `<label class="mode-card"><input type="radio" name="quiz-mode" value="${m}" ${quizMode === m ? "checked" : ""}><span class="mode-icon">${icon}</span><span><b>${name}</b><small>${note}</small></span><span class="radio-mark"></span></label>`,
      )
      .join("")}</fieldset><button class="primary" id="quiz-start">Commencer le quiz <span>→</span></button></section><h2 class="review-title">Ta difficulté</h2><div class="metric-grid">${(
      [
        [tiers.hard, "Difficiles"],
        [tiers.shaky, "Fragiles"],
        [tiers.known, "Acquis"],
        [tiers.new, "Jamais vus"],
      ] as const
    )
      .map(([n, label]) => `<div><strong>${n}</strong><span>${label}</span></div>`)
      .join("")}</div><p class="helper">Une erreur ou un passage classe un mot difficile. Deux bonnes réponses rapides (moins de 8 s) le rendent acquis ; sans révision, il redevient fragile après quelques jours.</p>${
      hardest.length
        ? `<h2 class="review-title">Les mots qui te résistent</h2>${hardest
            .map(
              ({ q, s }) =>
                `<details class="review"><summary><span class="mastery">${Math.round(s!.difficulty)}<small>/100</small></span><span><span lang="ca">${esc(q.catalan)}</span><small>${s!.shown} ${s!.shown === 1 ? "tentative" : "tentatives"} · ${s!.successes} réussie${s!.successes > 1 ? "s" : ""} · ${s!.failures} ratée${s!.failures > 1 ? "s" : ""}${s!.passes ? ` dont ${s!.passes} passée${s!.passes > 1 ? "s" : ""}` : ""}</small></span></summary><div class="review-body"><p class="muted">${esc(q.prompt)}</p><p class="good"><b>Bonne réponse : <span lang="${q.answer_lang ?? "fr"}">${esc(q.answers[q.correct_option - 1])}</span></b></p><p class="quiz-note">${esc(q.note)}</p></div></details>`,
            )
            .join("")}`
        : '<p class="empty">Aucun mot difficile pour l’instant. Lance un quiz pour que chaque réponse classe le mot.</p>'
    }<p class="privacy">Sur cet appareil uniquement · Sans compte</p>`,
    "vocab",
  );
  document.querySelectorAll<HTMLInputElement>('input[name="quiz-mode"]').forEach((input) => {
    input.onchange = () => {
      quizMode = input.value as QuizMode;
    };
  });
  document.querySelector<HTMLButtonElement>("#quiz-start")!.onclick = quizStart;
}
function quizStart() {
  quizRun = drawVocab(VOCAB_LENGTH, vocabBank, quizMode, vocabStats(quizAttempts));
  quizRunId = crypto.randomUUID();
  quizPicks = [];
  quizIndex = 0;
  quizSeconds = 0;
  quizQuestion();
}
function quizQuestion() {
  quizAnswered = false;
  const q = quizRun![quizIndex];
  const s = vocabStatsFor(q.id, quizAttempts);
  quizOrder = answerOrder(q.answers.length);
  shell(
    `<progress value="${quizIndex}" max="${quizRun!.length}" aria-label="Progression du quiz"></progress><div class="question-copy"><div class="question-meta" role="group" aria-label="Type et difficulté de la question"><span class="tag">${esc(vocabTypeName[q.type] ?? q.type)}</span><span>#${esc(q.id)}</span><span>${s.shown} ${s.shown === 1 ? "tentative" : "tentatives"}</span><span title="Difficulté personnelle : 100 moins le score de maîtrise du mot.">Difficulté : ${s.shown ? `${Math.round(s.difficulty)}/100` : "À évaluer"}</span></div><p class="quiz-prompt">${esc(q.prompt)}</p><h2 tabindex="-1" id="question-title" lang="ca">${esc(q.catalan)}</h2></div><div class="answers">${quizOrder
      .map(
        (a, i) =>
          `<button class="answer" data-answer="${a}"><span class="letter">${"ABCD"[i]}</span><span><b lang="${q.answer_lang ?? "fr"}">${esc(q.answers[a])}</b></span><span class="answer-state"></span></button>`,
      )
      .join(
        "",
      )}<button class="answer" id="skip"><span class="letter">${"ABCDE"[quizOrder.length]}</span><span><b>Passer cette question</b></span><span class="answer-state"></span></button></div><div id="feedback" role="status" aria-live="polite"></div><div class="question-actions"><p class="next-hint" id="next" role="status" hidden>Clique n’importe où pour ${quizIndex + 1 === quizRun!.length ? "voir ton résultat" : "passer à la question suivante"} <span aria-hidden="true">→</span></p></div>`,
    "vocab",
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-answer]")
    .forEach(
      (b) =>
        (b.onclick = (e) => {
          e.stopPropagation();
          quizAnswer(+b.dataset.answer!);
        }),
    );
  document.querySelector<HTMLButtonElement>("#skip")!.onclick = (e) => {
    e.stopPropagation();
    quizAnswer(null);
  };
  document.querySelector<HTMLElement>(".app-shell")!.onclick = (e) => {
    if (!(e.target as HTMLElement).closest("header")) quizAdvance();
  };
  document.querySelector<HTMLButtonElement>("#quit")!.onclick = () => {
    if (!confirm("Quitter le quiz ? Les réponses déjà données restent comptées dans ta difficulté.")) return;
    // Every answer is already saved; the time they took is kept with them.
    const answered = quizIndex + (quizAnswered ? 1 : 0);
    if (answered) recordQuizRun(quizRun!.slice(0, answered));
    quizHome();
  };
  window.scrollTo(0, 0);
  document
    .querySelector<HTMLElement>("#question-title")
    ?.focus({ preventScroll: true });
  quizShownAt = performance.now();
}
function quizAnswer(selected: number | null) {
  if (quizAnswered || !quizRun) return;
  quizAnswered = true;
  quizAnsweredAt = Date.now();
  // Same per-question ceiling as a practice session, so both feed one total.
  const seconds = cappedSeconds((performance.now() - quizShownAt) / 1000);
  quizSeconds += seconds;
  const q = quizRun[quizIndex],
    right = q.correct_option - 1,
    correct = selected === right;
  quizPicks[quizIndex] = selected;
  // Saved at once, so leaving mid-run still classes the words already seen.
  // A storage failure keeps the answer in memory for this visit.
  const attempt: QuizAttempt = {
    id: crypto.randomUUID(),
    runId: quizRunId,
    questionId: q.id,
    selected,
    correct,
    passed: selected === null,
    seconds: Math.round(seconds * 100) / 100,
    at: new Date().toISOString(),
  };
  quizAttempts = [...quizAttempts, attempt];
  void saveQuizAttempt(attempt).catch(() => {
    storageError = true;
  });
  document.querySelector(".answers")!.classList.add("locked");
  const skip = document.querySelector<HTMLButtonElement>("#skip")!;
  skip.disabled = true;
  if (selected === null) {
    skip.classList.add("incorrect");
    skip.querySelector(".answer-state")!.textContent = "✕";
  }
  document
    .querySelector(".app-shell")!
    .classList.add(correct ? "flash-success" : "flash-failure");
  document.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach((b) => {
    const i = +b.dataset.answer!;
    b.disabled = true;
    b.classList.toggle("correct", i === right);
    b.classList.toggle("incorrect", i === selected && !correct);
    b.querySelector(".answer-state")!.textContent =
      i === right ? "✓" : i === selected ? "✕" : "";
  });
  document.querySelector<HTMLElement>("#next")!.hidden = false;
  document.querySelector("#feedback")!.innerHTML =
    `<div class="feedback ${correct ? "good" : "bad"}"><span class="thumb">${correct ? "👍" : "👎"}</span><b>${correct ? "Bonne réponse !" : selected === null ? "Question passée." : "Réponse incorrecte."}</b><span>${correct ? "" : `Bonne réponse : ${"ABCD"[quizOrder.indexOf(right)]}.`}</span></div><p class="quiz-note">${esc(q.note)}</p>`;
}
function quizAdvance() {
  if (!quizRun || !quizAnswered) return;
  // A tap that answers can be followed by a ghost click on the redrawn page.
  if (Date.now() - quizAnsweredAt < 300) return;
  if (quizIndex + 1 === quizRun.length) {
    quizResult();
    return;
  }
  quizIndex++;
  quizQuestion();
}
// A run's practice time is recorded when it ends, and also when it is left
// early, since the answers already given count in the difficulty. A storage
// failure must not cost the score on screen, so it is noted and never blocks.
function recordQuizRun(answered: VocabQuestion[]) {
  const record: QuizRun = {
    id: quizRunId,
    completedAt: new Date().toISOString(),
    questions: answered.length,
    correct: answered.filter((q, i) => quizPicks[i] === q.correct_option - 1).length,
    seconds: Math.round(quizSeconds * 100) / 100,
  };
  quizRuns = [...quizRuns, record];
  void saveQuizRun(record).catch(() => {
    quizRuns = quizRuns.filter((r) => r.id !== record.id);
    storageError = true;
  });
}
function quizResult() {
  const run = quizRun!,
    picks = quizPicks,
    ok = run.filter((q, i) => picks[i] === q.correct_option - 1).length,
    skipped = picks.filter((p) => p === null).length,
    missed = run
      .map((q, i) => ({ q, picked: picks[i] ?? null }))
      .filter(({ q, picked }) => picked !== q.correct_option - 1);
  recordQuizRun(run);
  quizRun = null; // Back to a normal screen: the nav and the brand return.
  shell(
    `<div class="eyebrow">QUIZ TERMINÉ · ${quizMode === "smart" ? "ENTRAÎNEMENT INTELLIGENT" : "ALÉATOIRE"}</div><h1>${ok === run.length ? "Sans faute." : ok >= run.length * 0.75 ? "Bien lu." : "À retravailler."}</h1><div class="score"><strong>${ok}<span> / ${run.length}</span></strong><p>bonnes réponses · ${pct(ok / run.length)}${skipped ? ` · ${skipped} passée${skipped > 1 ? "s" : ""}` : ""}</p></div><button class="primary" id="quiz-again">Refaire ${VOCAB_LENGTH} questions →</button><button class="secondary full" id="quiz-back">Voir ma difficulté</button>${
      missed.length
        ? `<h2 class="review-title">Les ${missed.length === 1 ? "mot manqué" : `${missed.length} mots manqués`}</h2><p class="muted">Relis-les : ce sont eux qui te font mal lire une phrase.</p>${missed
            .map(
              ({ q, picked }) =>
                `<details class="review"><summary><span class="result-mark bad">${picked === null ? "—" : "✕"}</span><span><span lang="ca">${esc(q.catalan)}</span><small>${esc(vocabTypeName[q.type] ?? q.type)}</small></span></summary><div class="review-body"><p>Ta réponse : ${
                  picked === null
                    ? "Passée"
                    : `<span lang="${q.answer_lang ?? "fr"}">${esc(q.answers[picked])}</span>`
                }</p><p class="good"><b>Bonne réponse : <span lang="${q.answer_lang ?? "fr"}">${esc(q.answers[q.correct_option - 1])}</span></b></p><p class="quiz-note">${esc(q.note)}</p></div></details>`,
            )
            .join("")}`
        : '<p class="empty">Aucune erreur. Retire 20 questions pour en croiser d’autres.</p>'
    }`,
    "vocab",
  );
  document.querySelector<HTMLButtonElement>("#quiz-again")!.onclick = quizStart;
  document.querySelector<HTMLButtonElement>("#quiz-back")!.onclick = quizHome;
}
function history() {
  shell(
    `<div class="eyebrow">TON PARCOURS</div><h1>Historique des sessions</h1><p class="muted">Chaque session est une nouvelle occasion de progresser.</p>${
      sessions.length
        ? sessions
            .slice()
            .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
            .map(
              (s) =>
                `<button class="session-row" data-session="${s.id}"><span><b>${modeName[s.mode]}${s.endless ? " · Sans fin" : ""}${s.timeTrial ? " · Time trial" : ""}${s.timedOut ? " · Temps écoulé" : ""}</b><small>${new Date(s.completedAt).toLocaleString("fr-FR")} · ${s.questionIds.length} questions</small></span><strong>${pct(s.attempts.filter((a) => a.correct).length / s.questionIds.length)} →</strong></button>`,
            )
            .join("")
        : '<div class="empty"><span>◷</span><h2>Ton parcours commence ici</h2><p>Tes sessions terminées apparaîtront ici.</p><button class="primary" id="first">Commencer à pratiquer →</button></div>'
    }`,
    "history",
  );
  document.querySelectorAll<HTMLButtonElement>("[data-session]").forEach(
    (b) =>
      (b.onclick = () => {
        saveError = false;
        result(sessions.find((s) => s.id === b.dataset.session)!);
      }),
  );
  const first = document.querySelector<HTMLButtonElement>("#first");
  if (first) first.onclick = home;
}
// Practice time reads in hours and minutes, not in the seconds a single
// question is measured in.
const practiceTime = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
};
function practiceBoard() {
  const days = practiceDays(attempts, quizRuns, 3, new Date(), revision.timeEntries());
  const labels = ["Aujourd’hui", "Hier", "Avant-hier"];
  const peak = Math.max(...days.map((d) => d.totalSeconds), 1);
  const total = days.reduce((s, d) => s + d.totalSeconds, 0);
  const quiz = days.reduce((s, d) => s + d.quizSeconds, 0);
  const study = days.reduce((s, d) => s + d.revisionSeconds, 0);
  return `<section class="practice-board"><h2>Ces 3 derniers jours</h2><div class="score"><strong>${practiceTime(total)}</strong><p>d’entraînement${total ? ` · dont ${practiceTime(quiz)} de català et ${practiceTime(study)} de révision` : ""}</p></div>${revision.timeError() ? '<p class="warning">Le temps de révision local n’a pas pu être entièrement chargé ou sauvegardé. Réessaie ou exporte tes données avant de fermer.</p>' : ''}<ol class="day-rows">${days
    .map((d, i) => {
      const label =
        labels[i] ??
        d.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
      // An empty part is left out entirely: a zero-width span would still show
      // the gaps that separate the activities.
      const fill = (seconds: number, kind: string) =>
        seconds
          ? `<span class="day-fill ${kind}" style="width:${(seconds / peak) * 100}%"></span>`
          : "";
      return `<li><span class="day-label">${esc(label)}</span><span class="day-bar" role="img" aria-label="${practiceTime(d.questionSeconds)} de questions, ${practiceTime(d.quizSeconds)} de català et ${practiceTime(d.revisionSeconds)} de révision">${fill(d.questionSeconds, "questions")}${fill(d.quizSeconds, "quiz")}${fill(d.revisionSeconds, "revision")}</span><span class="day-total">${d.totalSeconds ? practiceTime(d.totalSeconds) : "—"}</span></li>`;
    })
    .join(
      "",
    )}</ol><p class="helper"><span class="legend questions"></span>Questions de conduite <span class="legend quiz"></span>Quiz català <span class="legend revision"></span>Révision (lecture + tests).</p><p class="helper">Conduite et quiz : ${MAX_ANSWER_SECONDS} s maximum par question. Révision : temps passé dans les fiches, tests et corrections, en pause quand l’app est masquée.</p></section>`;
}
function recentScoreboard() {
  const recent = recentScores(attempts);
  const value = (rate: number) => (recent.count ? pct(rate) : "—");
  const won = (n: number) => `${n} réussie${n > 1 ? "s" : ""}`;
  const title =
    recent.count === 0
      ? "Sur les 100 dernières questions"
      : recent.count === 1
        ? "Sur la dernière question"
        : `Sur les ${recent.count} dernières questions`;
  const assisted = recent.total - recent.catalan;
  return `<section class="recent-score"><h2>${title}</h2><div class="recent-grid"><div class="catalan"><strong>${value(recent.catalanRate)}</strong><span>Score catalan</span><small>${won(recent.catalan)} sans le français</small></div><div><strong>${value(recent.totalRate)}</strong><span>Score total</span><small>${won(recent.total)} dont ${assisted} avec le français</small></div></div><p class="helper">Seul le score catalan compte pour l’examen : les questions réussies avec les traductions affichées ne prouvent pas encore que tu les as en catalan.</p></section>`;
}
function progress(refresh = true) {
  revision.leave(); // Include the final reading/test seconds before computing totals.
  stats = allStats(attempts);
  shell(
    `<div class="eyebrow">PAS À PAS</div><h1>Ta progression</h1><p class="muted">${stats.size} sur ${bank.length.toLocaleString("fr-FR")} questions pratiquées.</p><progress value="${stats.size}" max="${bank.length}" aria-label="Questions pratiquées"></progress>${practiceBoard()}${recentScoreboard()}${metrics(attempts, totalPracticeSeconds(attempts, quizRuns, revision.timeEntries()), attempts.length, "Temps total · toutes activités")}<button class="secondary full" id="export">Sauvegarder mon historique (JSON) ↓</button><p class="helper">Facultatif : télécharge une copie de tes réponses, sessions et temps de révision. Ton historique reste uniquement dans ce navigateur et peut être perdu si ses données sont effacées.</p><h2 class="review-title">Question par question</h2><input type="search" id="search" placeholder="Rechercher une question pratiquée…" aria-label="Rechercher une question pratiquée"><div id="question-stats"></div>`,
    "stats",
  );
  document.querySelector<HTMLButtonElement>("#export")!.onclick = () =>
    exportProgress();
  const search = document.querySelector<HTMLInputElement>("#search")!;
  search.oninput = () => renderStats(search.value);
  renderStats("");
  if (refresh) void revision.refreshTime().then(() => {
    if (document.querySelector('[data-nav="stats"].current')) {
      const query = document.querySelector<HTMLInputElement>('#search')?.value ?? '';
      progress(false);
      document.querySelector<HTMLInputElement>('#search')!.value = query;
      renderStats(query);
    }
  });
}
function renderStats(query: string) {
  const entries = [...stats.values()]
    .filter((s) => {
      const q = bank.find((q) => q.id === s.id);
      return `${q?.question} ${s.id}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase());
    })
    .sort((a, b) => a.mastery - b.mastery);
  document.querySelector("#question-stats")!.innerHTML = entries.length
    ? entries
        .map(
          (s) =>
            `<details class="review"><summary><span class="mastery">${Math.round(s.mastery)}<small>/100</small></span><span><span lang="ca">${esc(bank.find((q) => q.id === s.id)?.question ?? s.id)}</span><small>${s.shown} tentatives · ${pct(s.successRate)} de réussite · ${time(s.averageSeconds)}</small></span></summary><div class="review-body"><p>${s.successes} bonnes réponses · ${s.failures} erreurs (dont ${s.passes} passées)</p><p>Avec français : ${s.successesWithFrench} bonnes réponses / ${s.failuresWithFrench} erreurs<br>Sans français : ${s.successesWithoutFrench} bonnes réponses / ${s.failuresWithoutFrench} erreurs</p><p>Dépendance au français : ${pct(s.frenchDependency)} · Réflexes lents : ${s.slowCount}</p><p>Priorité : ${s.priority.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · Dernière tentative : ${new Date(s.lastAsked!).toLocaleString("fr-FR")}</p>${review(attempts.filter((a) => a.questionId === s.id))}</div></details>`,
        )
        .join("")
    : '<p class="empty">Aucune question pratiquée ne correspond à la recherche.</p>';
}
async function exportProgress(extra?: Session) {
  const revisionData = await revision.exportData();
  // Refresh before exporting so sessions completed in other tabs are included.
  try {
    const [rows, saved, runs, words] = await Promise.all([
      readAll<Attempt>("attempts"),
      readAll<Session>("sessions"),
      readAll<QuizRun>("quizRuns"),
      readAll<QuizAttempt>("quizAttempts"),
    ]);
    attempts = rows.map(capAttempt);
    sessions = saved;
    quizRuns = runs;
    quizAttempts = words;
  } catch {
    // Memory still contains the current session when persistent storage fails.
  }
  const ss = new Map(sessions.map((s) => [s.id, s]));
  if (extra) ss.set(extra.id, extra);
  const aa = new Map(attempts.map((a) => [a.id, a]));
  extra?.attempts.forEach((a) => aa.set(a.id, a));
  const rows = [...aa.values()];
  const data = {
    // Version 4 adds revision scores/time; earlier fields are unchanged.
    schemaVersion: 4,
    app: "autoescola",
    exportedAt: new Date().toISOString(),
    sessions: [...ss.values()],
    attempts: rows,
    stats: [...allStats(rows).values()],
    quizRuns,
    quizAttempts,
    revisionRuns: revisionData.runs,
    revisionTime: revisionData.time,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `autoescola-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
window.addEventListener("beforeunload", (e) => {
  if (active || saveError || revision.hasUnfinished()) {
    e.preventDefault();
    e.returnValue = "";
  }
});
async function boot() {
  await unlock(root);
  root.innerHTML = '<p class="loading">Chargement des questions…</p>';
  try {
    const fetchJSON = async (path: string) => {
      const r = await fetch(base + path);
      if (!r.ok) throw Error(path);
      return r.json();
    };
    [bank, fr] = await Promise.all([
      fetchJSON("questions_ca.json"),
      fetchJSON("translations_fr.json"),
    ]);
    try {
      const [rows, saved, runs, words] = await Promise.all([
        readAll<Attempt>("attempts"),
        readAll<Session>("sessions"),
        readAll<QuizRun>("quizRuns"),
        readAll<QuizAttempt>("quizAttempts"),
      ]);
      attempts = rows.map(capAttempt);
      sessions = saved;
      quizRuns = runs;
      quizAttempts = words;
    } catch {
      storageError = true;
    }
    stats = allStats(attempts);
    home();
  } catch {
    shell(
      '<div class="empty"><h1>Impossible de charger les questions</h1><p>Vérifie ta connexion internet et réessaie.</p><button class="primary" id="reload">Recharger</button></div>',
    );
    document.querySelector<HTMLButtonElement>("#reload")!.onclick = () =>
      location.reload();
  }
}
void boot();
