import "./style.css";
import {
  allStats,
  selectQuestions,
  trialRemaining,
  sessionSettings,
  examPassed,
  examSummary,
  type Question,
  type Translation,
  type Attempt,
  type Session,
  type Mode,
  type Stats,
} from "./engine";
import { readAll, saveSession } from "./storage";
import { unlock } from "./lock";
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
  trialTimer: number | undefined,
  active: Session | null = null,
  index = 0,
  shownAt = 0,
  shownAtDate = 0,
  revealed = false,
  manual = false,
  answered = false,
  timer: number | undefined,
  saving = false,
  saveError = false,
  storageError = false;
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
    : `${Math.floor(n / 60)} min ${Math.round(n % 60)} s`;
function languageButton() {
  if ((active?.mode ?? mode) === "exam") return '<button class="language-button" id="reveal" type="button" disabled aria-label="Francès desactivat durant l’examen" title="Francès desactivat durant l’examen"><span class="france-flag" aria-hidden="true">🇫🇷</span></button>';
  const visible = active ? revealed : autoFrench;
  const label = active
    ? visible ? "Traductions françaises visibles" : "Afficher les traductions en français"
    : "Afficher automatiquement les traductions en français";
  return `<button class="language-button" id="reveal" type="button" aria-label="${label}" aria-pressed="${visible}" title="${label}" ${active && visible ? "disabled" : ""}><span class="france-flag" aria-hidden="true">🇫🇷</span></button>`;
}
function shell(content: string, tab = "practice") {
  document.documentElement.lang = active?.mode === "exam" ? "ca" : "fr";
  root.innerHTML = `<div class="app-shell"><header><a href="#" id="brand" aria-label="Accueil"><span class="brand-car" aria-hidden="true">🚗</span><span>AutoEscola<small>${active?.mode === "exam" ? "ANDORRA" : "ANDORRE"}</small></span></a><div class="header-actions">${trialHeader()}${languageButton()}</div></header><main>${content}</main>${active ? "" : `<nav aria-label="Navigation principale"><button data-nav="practice" class="${tab === "practice" ? "current" : ""}"><span>◎</span> Pratiquer</button><button data-nav="history" class="${tab === "history" ? "current" : ""}"><span>◷</span> Historique</button><button data-nav="stats" class="${tab === "stats" ? "current" : ""}"><span>▥</span> Progression</button><button data-nav="exams" class="${tab === "exams" ? "current" : ""}"><span>▣</span> Exams</button></nav>`}</div>`;
  document.querySelector("#brand")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (!active) home();
  });
  if (!active) {
    document.querySelector<HTMLButtonElement>("#reveal")!.onclick = () => {
      if (mode === "exam") return;
      autoFrench = !autoFrench;
      document.querySelector("#reveal")!.setAttribute("aria-pressed", String(autoFrench));
      const toggle = document.querySelector<HTMLInputElement>("#auto-fr");
      if (toggle) toggle.checked = autoFrench;
    };
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
              : b.dataset.nav === "exams" ? exams() : progress()),
    );
}
function home() {
  clearInterval(timer);
  clearInterval(trialTimer);
  active = null;
  const rate = attempts.length
    ? pct(attempts.filter((a) => a.correct).length / attempts.length)
    : "—";
  shell(
    `<div class="overview"><div><strong>${bank.length.toLocaleString("fr-FR")}</strong><span>questions</span></div><div><strong>${sessions.length}</strong><span>sessions terminées</span></div><div><strong>${rate}</strong><span>de réussite</span></div></div>${storageError ? '<p class="warning">Le stockage local est indisponible. Tu peux pratiquer et exporter la session avant de quitter.</p>' : ""}<section class="setup"><div class="section-heading"><h2>Prépare ta session</h2></div><fieldset><legend>Comment veux-tu pratiquer ?</legend>${(["smart", "random", "discovery", "exam"] as Mode[]).map((m, i) => `<label class="mode-card"><input type="radio" name="mode" value="${m}" ${mode === m ? "checked" : ""}><span class="mode-icon">${["✦", "⤨", "◒", "▣"][i]}</span><span><b>${modeName[m]}</b><small>${["Travaille tes points faibles", "Explore toutes les questions du programme", "Questions inédites, peu vues ou anciennes", "40 questions · 40 min · Catalan uniquement"][i]}</small></span><span class="radio-mark"></span></label>`).join("")}</fieldset><fieldset><legend>Combien de questions ?</legend><div class="lengths">${[20, 40, 60, 80].map((n) => `<label><input type="radio" name="count" value="${n}" ${count === n ? "checked" : ""}><span>${n}<small>questions</small></span></label>`).join("")}</div></fieldset><label class="french-toggle"><span><b>Aide en français</b><small>Afficher les traductions dès le début</small></span><input type="checkbox" id="auto-fr" role="switch" ${autoFrench ? "checked" : ""}></label><p class="helper">Avec l’aide, les bonnes réponses rapportent 50 % des points de maîtrise. Tu peux aussi révéler le français pendant la question.</p><label class="french-toggle"><span><b>Time trial</b><small id="trial-duration">${count} questions = ${count} minutes au total.</small></span><input type="checkbox" id="time-trial" role="switch" ${timeTrial ? "checked" : ""}></label><p class="helper">Un chrono global, sans limite par question. À zéro, le test s’arrête et les résultats sont enregistrés.</p><button class="primary" id="start">Commencer la session <span>→</span></button></section><p class="privacy">Sur cet appareil uniquement · Sans compte</p>`,
  );
  document.querySelectorAll<HTMLInputElement>('input[name="mode"]').forEach(
    (e) =>
      (e.onchange = () => {
        mode = e.value as Mode;
        if (mode === "exam") { count = 40; autoFrench = false; timeTrial = true; }
        home();
      }),
  );
  document.querySelectorAll<HTMLInputElement>('input[name="count"]').forEach(
    (e) =>
      (e.onchange = () => {
        count = +e.value;
        document.querySelector("#trial-duration")!.textContent = `${count} questions = ${count} minutes au total.`;
      }),
  );
  document.querySelector<HTMLInputElement>("#auto-fr")!.onchange = (e) => {
    autoFrench = (e.target as HTMLInputElement).checked;
    document.querySelector("#reveal")!.setAttribute("aria-pressed", String(autoFrench));
  };
  document.querySelector<HTMLButtonElement>("#start")!.onclick = start;
  document.querySelector<HTMLInputElement>("#time-trial")!.onchange = e => {
    timeTrial = (e.target as HTMLInputElement).checked;
  };
  if (mode === "exam") {
    document.querySelectorAll<HTMLInputElement>('input[name="count"], #auto-fr, #time-trial').forEach(input => { input.disabled = true; });
  }
}
function start() {
  const settings = sessionSettings(mode, count, autoFrench, timeTrial);
  count = settings.count; autoFrench = settings.french; timeTrial = settings.trial;
  stats = allStats(attempts);
  const selected = selectQuestions(bank, count, mode, stats);
  active = {
    id: crypto.randomUUID(),
    mode,
    startedAt: new Date().toISOString(),
    completedAt: "",
    duration: 0,
    questionIds: selected.map((q) => q.id),
    attempts: [],
    timeTrial,
    deadlineAt: timeTrial ? new Date(Date.now() + selected.length * 60000).toISOString() : undefined,
  };
  index = 0;
  question();
  if (timeTrial) trialTimer = window.setInterval(updateTrialClock, 250);
}
function trialHeader() {
  return active?.timeTrial ? '<span id="trial-clock" class="trial-clock" role="timer" aria-label="Temps restant pour le test"></span>' : '';
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
  clearInterval(trialTimer);
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
  return `<div class="question-meta" tabindex="0" role="group" aria-label="Informations et statistiques de la question"><span>${esc(q.category)} · #${esc(q.id)}</span><span>${tries} ${tries === 1 ? "tentative" : "tentatives"}</span><span title="Difficulté personnelle : 100 moins le score de maîtrise. Un score élevé indique une question plus difficile.">Difficulté : ${difficulty}</span><span>Dernière réponse : ${esc(lastLabel)}</span></div>`;
}
function examQuestionMarkup(q: Question) {
  return `<div class="question-top"><button class="text-button" id="quit">Surt</button><b>Pregunta ${index + 1} / 40</b></div><progress value="${index}" max="40" aria-label="Progrés de l’examen"></progress><button class="image-frame" id="enlarge" aria-label="Amplia la imatge"><img src="${base}${esc(q.image)}" alt="Imatge de la pregunta ${esc(q.id)}"><span>⤢</span></button><div class="question-copy"><div class="eyebrow">${esc(q.category)} · #${esc(q.id)}</div><h2 id="question-title" tabindex="-1" lang="ca">${esc(q.question)}</h2></div><div class="answers">${q.answers.map((text, i) => `<button class="answer" data-answer="${i}"><span class="letter">${"ABC"[i]}</span><span><b lang="ca">${esc(text)}</b></span></button>`).join("")}</div><div class="question-actions"><button class="primary" id="next" hidden>${index === 39 ? "Finalitza l’examen" : "Pregunta següent"} <span>→</span></button></div><dialog id="image-dialog"><button id="close-image" class="secondary">Tanca la imatge</button><img src="${base}${esc(q.image)}" alt="Imatge ampliada de la pregunta"></dialog>`;
}
function question() {
  clearInterval(timer);
  revealed = active?.mode === "exam" ? false : autoFrench;
  manual = false;
  answered = false;
  const q = current();
  const t = fr[q.id];
  shell(active!.mode === "exam" ? examQuestionMarkup(q) :
    `<div class="question-top"><button class="text-button" id="quit">Quitter</button><b>Question ${index + 1} <span>/ ${active!.questionIds.length}</span></b><div id="timer" class="timer" role="meter" aria-label="Temps de réponse" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" aria-valuetext="0 seconde"><span class="timer-label" aria-hidden="true">0 s</span><span class="timer-track" aria-hidden="true"><span class="timer-fill"></span></span></div></div><progress value="${index}" max="${active!.questionIds.length}" aria-label="Progression de la session"></progress><button class="image-frame" id="enlarge" aria-label="Agrandir l’image"><img src="${base}${esc(q.image)}" alt="Image de la question ${esc(q.id)}"><span>⤢</span></button><div class="question-copy">${questionMetadata(q)}<h2 tabindex="-1" id="question-title" lang="ca">${esc(q.question)}</h2>${french(t?.question ?? "Traduction indisponible")}</div><div class="answers">${q.answers.map((a, i) => `<button class="answer" data-answer="${i}"><span class="letter">${"ABC"[i]}</span><span><b lang="ca">${esc(a)}</b>${french(t?.answers[i] ?? "Traduction indisponible")}</span><span class="answer-state"></span></button>`).join("")}<button class="answer" id="skip"><span class="letter">D</span><span><b>Passer cette question</b></span><span class="answer-state"></span></button></div><div id="feedback" role="status" aria-live="polite"></div><div class="question-actions"><button class="primary" id="next" hidden>${index + 1 === active!.questionIds.length ? "Terminer et enregistrer" : "Question suivante"} <span>→</span></button></div><dialog id="image-dialog"><button id="close-image" class="secondary">Fermer l’image</button><img src="${base}${esc(q.image)}" alt="Image agrandie de la question"></dialog>`,
  );
  document
    .querySelectorAll<HTMLButtonElement>("[data-answer]")
    .forEach((b) => (b.onclick = () => answer(+b.dataset.answer!)));
  const skip = document.querySelector<HTMLButtonElement>("#skip");
  if (skip) skip.onclick = () => answer(null);
  document.querySelector<HTMLButtonElement>("#reveal")!.onclick = () => {
    if (active?.mode === "exam") return;
    if (updateTrialClock()) return;
    if (answered) return;
    manual = true;
    revealed = true;
    showFrench();

  };
  document.querySelector<HTMLButtonElement>("#next")!.onclick = () => {
    if (saving) return;
    if (updateTrialClock()) return;
    if (index + 1 === active!.questionIds.length) void finish();
    else {
      index++;
      question();
    }
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
function updateTimer(seconds: number) {
  const el = document.querySelector<HTMLElement>("#timer");
  if (!el) return;
  const elapsed = Math.floor(seconds);
  el.style.setProperty("--timer-fill", `${Math.min(100, seconds / 60 * 100)}%`);
  el.classList.toggle("timer-warning", seconds > 40 && seconds < 60);
  el.classList.toggle("timer-full", seconds >= 60);
  el.setAttribute("aria-valuenow", String(Math.min(60, elapsed)));
  el.setAttribute("aria-valuetext", `${elapsed} secondes${seconds >= 50 ? ", réflexe lent" : ""}`);
  el.querySelector(".timer-label")!.textContent = `${elapsed} s`;
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
  clearInterval(timer);
  const q = current(),
    seconds = timedOut
      ? Math.max(0, (Date.parse(active.deadlineAt!) - shownAtDate) / 1000)
      : (performance.now() - shownAt) / 1000,
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
    `<div class="feedback ${correct ? "good" : "bad"}"><span class="thumb">${correct ? "👍" : "👎"}</span><b>${correct ? "Bonne réponse !" : selected === null ? "Question passée." : "Réponse incorrecte."}</b><span>${correct ? "" : `Bonne réponse : ${"ABC"[q.correct]}. `}${seconds >= 50 ? "Réflexe lent · pénalité de maîtrise." : ""}</span></div>${fr[q.id]?.tip ? `<p lang="fr">${esc(fr[q.id].tip)}</p>` : ""}`;
}
async function finish() {
  if (!active || saving) return;
  clearInterval(timer);
  clearInterval(trialTimer);
  saving = true;
  document.querySelectorAll<HTMLButtonElement>("button").forEach(button => { button.disabled = true; });
  const button = document.querySelector<HTMLButtonElement>("#next");
  if (button) {
    button.disabled = true;
    button.textContent = active.mode === "exam" ? "Desant l’examen…" : "Enregistrement…";
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
function metrics(rows: Attempt[], duration?: number, total = rows.length) {
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
    [time(duration ?? rows.reduce((s, a) => s + a.seconds, 0)), "Durée totale"],
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
    `<div class="eyebrow">SESSION TERMINÉE</div><h1>${s.mode === "exam" ? examPassed(s) ? "Examen réussi" : "Examen échoué" : "Un pas de plus."}</h1>${s.mode === "exam" ? '<p class="muted">Seuil de réussite : 38 bonnes réponses sur 40.</p>' : ""}<p class="muted">${modeName[s.mode]}${s.timeTrial ? " · Time trial" : ""} · ${new Date(s.completedAt).toLocaleDateString("fr-FR")}</p>${saveError ? '<div class="warning">Échec de l’enregistrement. Exporte la session ou réessaie avant de quitter.<button id="retry" class="secondary">Réessayer l’enregistrement</button></div>' : '<p class="saved">✓ Progression enregistrée sur cet appareil</p>'}${s.timedOut ? `<div class="warning" role="alert"><b>Temps écoulé — test terminé.</b><p>Le chrono de ${s.questionIds.length} minutes est arrivé à zéro. ${s.questionIds.length - s.attempts.length} question(s) non abordée(s). ${s.attempts.some(a => a.timedOut) ? s.mode === "exam" ? "La question restée sans réponse compte comme incorrecte." : "La question restée sans réponse est comptée comme passée." : ""}</p></div>` : ""}${metrics(s.attempts, s.duration, s.questionIds.length)}<button class="primary" id="again">Préparer une autre session →</button><button class="secondary full" id="export-session">Sauvegarder mon historique (JSON)</button><h2 class="review-title">Les points à retravailler</h2><p class="muted">En premier, les questions qui méritent le plus de pratique.</p>${review(s.attempts, s.mode === "exam")}`,
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
    document
      .querySelector("#brand")
      ?.replaceWith(document.querySelector("#brand")!.cloneNode(true));
  }
}
function exams() {
  const summary = examSummary(sessions);
  shell(`<div class="eyebrow">SIMULATIONS UNIQUEMENT</div><h1>Exams</h1><p class="muted">40 questions · 40 minutes · Réussite à partir de 38/40.</p><div class="score"><strong>${summary.rate === null ? "—" : pct(summary.rate)}</strong><p>taux d’examens réussis · ${summary.passed} sur ${summary.recent.length}</p></div><section class="exam-readiness"><h2>${summary.ready ? "Prêt selon tes simulations" : summary.recent.length < 5 ? "Préparation à confirmer" : "Encore un peu d’entraînement"}</h2><p>${summary.ready ? "Tes 5 derniers examens sont réussis." : "Repère de préparation : réussir 5 examens consécutifs avec au moins 38 bonnes réponses."}</p><p class="helper">Indicateur basé sur tes simulations, pas une garantie de réussite à l’examen.</p></section><button class="primary" id="prepare-exam">Préparer un examen →</button><h2 class="review-title">Les 20 derniers examens</h2>${summary.recent.length ? summary.recent.map(s => `<button class="session-row" data-exam="${s.id}"><span><b>${examPassed(s) ? "Réussi" : "Échoué"}${s.timedOut ? " · Temps écoulé" : ""}</b><small>${new Date(s.completedAt).toLocaleString("fr-FR")} · ${time(s.duration)}</small></span><strong class="${examPassed(s) ? "good" : "bad"}">${s.attempts.filter(a => a.correct).length}/40 →</strong></button>`).join("") : '<p class="empty">Aucun examen terminé. Tes sessions d’entraînement ne comptent pas ici.</p>'}`, "exams");
  document.querySelector<HTMLButtonElement>("#prepare-exam")!.onclick = () => {
    mode = "exam"; count = 40; autoFrench = false; timeTrial = true; home();
  };
  document.querySelectorAll<HTMLButtonElement>("[data-exam]").forEach(button => {
    button.onclick = () => { saveError = false; result(sessions.find(s => s.id === button.dataset.exam)!); };
  });
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
                `<button class="session-row" data-session="${s.id}"><span><b>${modeName[s.mode]}${s.timeTrial ? " · Time trial" : ""}${s.timedOut ? " · Temps écoulé" : ""}</b><small>${new Date(s.completedAt).toLocaleString("fr-FR")} · ${s.questionIds.length} questions</small></span><strong>${pct(s.attempts.filter((a) => a.correct).length / s.questionIds.length)} →</strong></button>`,
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
function progress() {
  stats = allStats(attempts);
  shell(
    `<div class="eyebrow">PAS À PAS</div><h1>Ta progression</h1><p class="muted">${stats.size} sur ${bank.length.toLocaleString("fr-FR")} questions pratiquées.</p><progress value="${stats.size}" max="${bank.length}" aria-label="Questions pratiquées"></progress>${metrics(attempts)}<button class="secondary full" id="export">Sauvegarder mon historique (JSON) ↓</button><p class="helper">Facultatif : télécharge une copie de tes réponses et sessions. Ton historique reste uniquement dans ce navigateur et peut être perdu si ses données sont effacées.</p><h2 class="review-title">Question par question</h2><input type="search" id="search" placeholder="Rechercher une question pratiquée…" aria-label="Rechercher une question pratiquée"><div id="question-stats"></div>`,
    "stats",
  );
  document.querySelector<HTMLButtonElement>("#export")!.onclick = () =>
    exportProgress();
  const search = document.querySelector<HTMLInputElement>("#search")!;
  search.oninput = () => renderStats(search.value);
  renderStats("");
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
  // Refresh before exporting so sessions completed in other tabs are included.
  try {
    [attempts, sessions] = await Promise.all([
      readAll<Attempt>("attempts"),
      readAll<Session>("sessions"),
    ]);
  } catch {
    // Memory still contains the current session when persistent storage fails.
  }
  const ss = new Map(sessions.map((s) => [s.id, s]));
  if (extra) ss.set(extra.id, extra);
  const aa = new Map(attempts.map((a) => [a.id, a]));
  extra?.attempts.forEach((a) => aa.set(a.id, a));
  const rows = [...aa.values()];
  const data = {
    schemaVersion: 1,
    app: "autoescola",
    exportedAt: new Date().toISOString(),
    sessions: [...ss.values()],
    attempts: rows,
    stats: [...allStats(rows).values()],
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
  if (active || saveError) {
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
      [attempts, sessions] = await Promise.all([
        readAll<Attempt>("attempts"),
        readAll<Session>("sessions"),
      ]);
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
