import './revision.css';
import { themes, memoryAids } from './content';
import { masteryTest, questionThemes } from './catalog';
import { drawTest, drawMasteryTest, finishRun, mastery, overallMastery, recentRuns, runPercent, shuffle, TEST_LENGTH, MASTERY_TEST_LENGTH } from './engine';
import { readRuns, saveRun } from './storage';
import type { RevisionQuestion, RevisionRun, RevisionTheme } from './types';
import { createTimeTracking } from './time-tracking';
import { studyDuration } from './time';

const esc = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const rich = (value: string) => esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const percent = (value: number | null) => value === null ? '—' : `${value} %`;
const level = (value: number | null) => value === null ? 'À découvrir' : value >= 80 ? 'Bien maîtrisé' : value >= 60 ? 'À consolider' : 'À retravailler';
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function createRevision(shell: (html: string, testing: boolean) => void) {
  const study = createTimeTracking();
  const themeSeconds = (id: string) => study.entries().filter(row => row.themeId === id).reduce((sum, row) => sum + row.seconds, 0);
  let runs: RevisionRun[] = [];
  let theme: RevisionTheme = themes[0];
  const isMastery = () => theme.id === masteryTest.id;
  const testLength = () => isMastery() ? MASTERY_TEST_LENGTH : TEST_LENGTH;
  let questions: RevisionQuestion[] = [];
  let picks: (number | null)[] = [];
  let frenchUsed: boolean[] = [];
  let index = 0;
  let selected: number | null | undefined;
  let confirmedAt = 0;
  let frenchVisible = false;
  let order: number[] = [];
  let active = false;
  let themeOpen = false;
  let lessonIndex: number | null = null;
  const unsaved = new Map<string, RevisionRun>();
  let loadFailed = false;
  let saving = false;
  let generation = 0;
  let viewGeneration = 0;
  const previous = new Map<string, string[]>();
  const button = (id: string, handler: () => void) => document.querySelector<HTMLButtonElement>(`#${id}`)?.addEventListener('click', handler);
  function render(html: string, testing = false) {
    viewGeneration++;
    shell(`<div class="revision">${html}</div>`, testing);
    study.updateHeader();
    button('rev-home', () => { if (!saving) active ? quitTest() : overview(); });
    button('rev-reveal', () => {
      if (!active || selected !== undefined) return;
      frenchUsed[index] = true;
      revealFrench();
      document.querySelector<HTMLElement>('.rev-test-hint')!.textContent = 'Français activé · une bonne réponse vaut 0 point sur 1.';
    });
    document.querySelectorAll<HTMLButtonElement>('[data-rev-page]').forEach(b => b.onclick = () => {
      if (!saving && !active) lesson(Number(b.dataset.revPage));
    });
    button('rev-header-test', () => { if (!saving && !active) start(); });
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.querySelector<HTMLElement>('.revision h1')?.focus({ preventScroll: true });
  }
  function warning() {
    return loadFailed || unsaved.size || study.error() ? '<p class="rev-warning" role="status">La sauvegarde locale est indisponible. Les résultats ou le temps affichés peuvent être conservés seulement pendant cette visite. Exporte-les avant de fermer.</p>' : '';
  }
  async function exportData() {
    study.checkpoint();
    await study.refresh();
    try { runs = [...new Map([...(await readRuns()), ...runs].map(r => [r.id, r])).values()]; } catch { /* Retain local results for export. */ }
    return { runs, time: study.entries() };
  }
  async function exportRuns() {
    const data = { app: 'autoescola-revision', schemaVersion: 3, exportedAt: new Date().toISOString(), ...await exportData() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `revision-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function overview() {
    study.stop();
    active = false; themeOpen = false; lessonIndex = null;
    const learned = themes.filter(t => recentRuns(runs, t.id).length > 0).length;
    render(`<div class="rev-eyebrow">LIRE · COMPRENDRE · RETENIR</div><h1 tabindex="-1">Révision<span class="rev-title-dot">.</span></h1><p class="rev-intro">Une idée à la fois.<br>Le code en français, les réflexes en catalan.</p>
      <div class="rev-overview"><span><b>13 + 5</b>thèmes code + català</span><span><b>${learned}<small> / ${themes.length}</small></b>thèmes évalués</span></div>
      <p class="rev-time-total">⏱ <strong>${studyDuration(study.entries().reduce((sum, row) => sum + row.seconds, 0))}</strong> de révision · lecture + tests</p><p class="rev-how">📖 2–3 fiches → 📝 10 questions au hasard → 🎯 ton bilan</p>${warning()}
      <div class="rev-section-label">LE CODE, PAR PETITES DOSES <span>13 thèmes</span></div><div class="rev-theme-list">${themes.filter(t => t.categories[0] !== 'CATALA').map(card).join('')}</div>
      <div class="rev-section-label">LE CATALÀ, PAS À PAS <span>5 thèmes</span></div><div class="rev-theme-list">${themes.filter(t => t.categories[0] === 'CATALA').map(card).join('')}</div>
      <div class="rev-section-label">TEST MAÎTRISE <span>25 questions</span></div><div class="rev-theme-list">${card(masteryTest)}</div><p class="rev-footnote">Un tirage parmi les ${themes.length} thèmes, avec au moins une question de chacun. Sa maîtrise est suivie séparément.</p>
      <div class="rev-note"><b>Comment est calculée ta maîtrise ?</b><p>La moyenne des <strong>5 derniers tests terminés</strong> de chaque thème. Les tests manquants comptent pour <strong>0 %</strong>. Un premier test à 100 % donne donc 20 % de maîtrise ; cinq tests à 100 % donnent 100 %. Un test quitté ne compte pas dans la maîtrise ; son temps reste enregistré.</p><p>Une bonne réponse vaut <strong>1 point sans aide</strong>, ou <strong>0 point avec le français révélé avant de répondre</strong>. Une erreur ou une question passée vaut 0 point. Aucune limite de temps. Un clic valide ta réponse et révèle la correction en français. Un second clic permet de continuer. Le drapeau 🇫🇷 dévoile les traductions avant de répondre ; la révélation automatique après validation ne pénalise pas le score. Les fiches sont inaccessibles pendant le test.</p><p>Le chrono démarre à l’ouverture d’une fiche et cumule lecture, tests et corrections jusqu’au retour aux thèmes. Il se met en pause quand l’app est masquée. Les temps antérieurs à cette fonction ne sont pas disponibles.</p></div>
      ${unsaved.size || study.error() ? '<button id="rev-save-all" class="rev-secondary">Réessayer les sauvegardes en attente</button>' : ''}<button id="rev-export" class="rev-secondary">Exporter mes résultats Révision</button><p class="rev-footnote">Sur ce navigateur · ${runs.length} test${runs.length === 1 ? '' : 's'} terminé${runs.length === 1 ? '' : 's'}</p>`);
    document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.onclick = () => { theme = [...themes, masteryTest].find(t => t.id === b.dataset.theme)!; isMastery() ? start() : lesson(0); });
    button('rev-export', exportRuns);
    button('rev-save-all', () => {
      const request = viewGeneration;
      const control = document.querySelector<HTMLButtonElement>('#rev-save-all')!;
      control.disabled = true; control.textContent = 'Enregistrement…';
      void Promise.all([study.refresh(), ...[...unsaved.values()].map(async r => {
        try { await saveRun(r); unsaved.delete(r.id); } catch { /* Keep retryable records. */ }
      })]).then(() => { if (request === viewGeneration) overview(); });
    });
  }
  function card(t: RevisionTheme) {
    const score = mastery(runs, t.id), recent = recentRuns(runs, t.id);
    return `<button class="rev-theme" data-theme="${t.id}"><span class="rev-icon" aria-hidden="true">${t.icon}</span><span class="rev-card-body"><strong>${esc(t.title)}</strong><span class="rev-subtitle">${esc(t.subtitle)}</span><span class="rev-meter"><span style="width:${score ?? 0}%"></span></span><span class="rev-card-meta">${recent.length ? level(score) : "À découvrir"} · ${recent.length}/5 tests récents</span><span class="rev-theme-time">⏱ ${studyDuration(themeSeconds(t.id))} · ${t.pages.length ? "lecture + tests" : "tests"}</span></span><span class="rev-card-score">${percent(score)}<span aria-hidden="true">↗</span></span></button>`;
  }
  function history() {
    const recent = recentRuns(runs, theme.id);
    const slots = [...recent].reverse();
    return `<div class="rev-history"><div><b>${isMastery() ? 'Maîtrise globale' : 'Maîtrise du thème'}</b><strong>${percent(mastery(runs, theme.id))}</strong></div><p>Moyenne sur 5 tests · ${recent.length}/5 terminés · les places vides comptent pour 0 %.</p><ol>${Array.from({ length: 5 }, (_, i) => slots[i] ? `<li><b>${runPercent(slots[i])} %</b><time datetime="${slots[i].completedAt}">${esc(date(slots[i].completedAt))}</time></li>` : '<li class="rev-empty-slot"><b>0 %</b><span>À faire</span></li>').join('')}</ol><p class="rev-theme-time">⏱ Temps total : <strong data-study-theme="${theme.id}">${studyDuration(themeSeconds(theme.id))}</strong></p></div>`;
  }
  function sources() {
    return `<details class="rev-sources"><summary>Sources de ce thème</summary><p>${esc(theme.sources)}</p>${theme.links?.map(link => `<p><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.title)}</a></p>`).join('') ?? ''}${theme.articles ? `<p><a href="https://portaljuridicandorra.ad/L2021012" target="_blank" rel="noopener noreferrer">Code de circulation d’Andorre</a> · articles ${esc(theme.articles)}.</p>${theme.id === 'documents' ? '<p><a href="https://portaljuridicandorra.ad/R20250702B" target="_blank" rel="noopener noreferrer">Règlement des permis du 2 juillet 2025</a></p>' : ''}<p>Points réglementaires recoupés le 11 septembre 2026. Les anciennes règles contradictoires des supports ne sont pas reprises.</p>` : ''}<p>${theme.bankIds.length ? `Catégories : ${esc(theme.categories.join(', '))}. Questions repères : ${esc(theme.bankIds.join(', '))}.` : 'Bonus fondé sur le vocabulaire et les tournures du quiz catalan.'}</p></details>`;
  }
  function lesson(pageIndex: number) {
    if (active || saving) return;
    study.start(theme.id);
    active = false; themeOpen = true; lessonIndex = pageIndex;
    const p = theme.pages[pageIndex];
    render(`<div class="rev-lesson"><div class="rev-eyebrow">${theme.icon} ${esc(theme.title)} · Fiche ${pageIndex + 1} / ${theme.pages.length}</div><h1 tabindex="-1">${esc(p.title)}</h1><p class="rev-kicker">${esc(p.kicker)}</p>
      <ul class="rev-facts">${p.facts.map((fact, i) => `<li><span aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${rich(fact)}</p></li>`).join('')}</ul>
      <aside class="rev-tip"><b>💡 Le déclic</b><p>${rich(p.tip)}</p>${memoryAids[theme.id] ? `<p><strong>Mémo FR → CA.</strong> ${esc(memoryAids[theme.id])}</p>` : ''}</aside>
      <section class="rev-words"><h2>Les mots à reconnaître</h2><dl>${p.words.map(([ca, fr]) => `<div><dt lang="ca">${esc(ca)}</dt><dd>${esc(fr)}</dd></div>`).join('')}</dl></section>
      <aside class="rev-grammar"><div class="rev-eyebrow">CATALÀ · PETITE DOSE A1</div><h2>${esc(p.grammar.title)}</h2><p>${esc(p.grammar.rule)}</p><blockquote lang="ca">${esc(p.grammar.ca)}</blockquote><p class="rev-translation">${esc(p.grammar.fr)}</p></aside>
      <div class="rev-ready"><span>${pageIndex < theme.pages.length - 1 ? 'Continue la lecture à ton rythme.' : 'Tu te sens prêt ? À toi de jouer.'}</span><button class="rev-primary" id="rev-continue">${pageIndex < theme.pages.length - 1 ? `Lire la fiche ${pageIndex + 2} →` : 'Lancer le test · 10 questions →'}</button><p>Q lance le test. Les fiches seront inaccessibles pendant les questions.<br>🇫🇷 Avant de répondre : une bonne réponse vaut 0 point au lieu de 1.</p></div>${sources()}</div>`);
    button('rev-continue', () => pageIndex < theme.pages.length - 1 ? lesson(pageIndex + 1) : start());
  }
  function start() {
    study.start(theme.id);
    themeOpen = true;
    const last = previous.get(theme.id) ?? recentRuns(runs, theme.id)[0]?.questionIds;
    questions = isMastery() ? drawMasteryTest(themes, last) : drawTest(theme, last);
    previous.set(theme.id, questions.map(q => q.id));
    picks = []; frenchUsed = questions.map(() => false); index = 0; active = true; lessonIndex = null; prepareQuestion();
  }
  function prepareQuestion() {
    selected = undefined;
    frenchVisible = false;
    order = shuffle(questions[index].answers.map((_, i) => i));
    question();
  }
  // A separate gesture advances after feedback. Quit/dialog actions retain
  // their own behavior; the confirming click never reaches these handlers.
  const canAdvance = (target: EventTarget | null) => active && selected !== undefined && !saving
    && performance.now() - confirmedAt >= 300
    && !document.querySelector('.rev-dialog')
    && !(target instanceof Element && target.closest('header, .rev-dialog-backdrop, a, input, textarea, select, summary'));
  document.addEventListener('click', e => {
    if (canAdvance(e.target) && !window.getSelection()?.toString()) advance();
  });
  document.addEventListener('keydown', e => {
    if (!e.repeat && ['Enter', ' ', 'ArrowRight'].includes(e.key) && canAdvance(e.target)) {
      e.preventDefault(); advance();
    }
  });
  function revealFrench() {
    frenchVisible = true;
    document.querySelectorAll('.revision .concealed').forEach(el => {
      el.classList.remove('concealed'); el.removeAttribute('aria-hidden');
    });
    const flag = document.querySelector<HTMLButtonElement>('#rev-reveal');
    if (flag) {
      flag.disabled = true; flag.setAttribute('aria-pressed', 'true');
      flag.setAttribute('aria-label', 'Traductions françaises affichées');
      flag.title = 'Traductions françaises affichées';
    }
  }
  function confirmAnswer(pick: number | null) {
    if (!active || selected !== undefined || saving) return;
    selected = pick; confirmedAt = performance.now(); picks.push(pick);
    showFeedback();
  }
  function showFeedback() {
    const pick = selected;
    if (pick === undefined) return;
    const q = questions[index], correct = pick === q.correct;
    revealFrench();
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => {
      const original = Number(b.dataset.choice);
      b.onclick = null; b.tabIndex = -1;
      b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-pressed', String(original === pick));
      b.classList.toggle('rev-option-correct', original === q.correct);
      b.classList.toggle('rev-option-wrong', original === pick && !correct);
      const letter = String.fromCharCode(65 + order.indexOf(original));
      b.innerHTML = `<span>${original === q.correct ? '✓' : original === pick ? '✕' : letter}</span><div class="rev-option-copy"><span lang="ca">${esc(q.answers[original])}</span><small class="rev-option-fr" lang="fr">${esc(q.french.answers[original])}</small></div>`;
    });
    const skip = document.querySelector<HTMLButtonElement>('#rev-skip')!;
    skip.hidden = true; skip.onclick = null;
    const feedback = document.querySelector<HTMLElement>('#rev-feedback')!;
    feedback.hidden = false;
    feedback.className = `rev-feedback ${correct ? 'rev-feedback-good' : 'rev-feedback-bad'}`;
    feedback.innerHTML = `<strong>${correct ? '✓ Bonne réponse !' : pick === null ? '↷ Question passée' : '✕ Mauvaise réponse'}</strong><p>${correct ? frenchUsed[index] ? '0 point · français utilisé, non compté dans la maîtrise' : '+1 point · sans aide française' : '0 point'}</p><p>Bonne réponse : <b>${String.fromCharCode(65 + order.indexOf(q.correct))}</b> · ${esc(q.french.answers[q.correct])}</p><p>${esc(q.explanation)}</p>`;
    const hint = document.querySelector<HTMLElement>('#rev-advance-hint')!;
    hint.hidden = false;
    hint.textContent = index === questions.length - 1 ? 'Clique à nouveau n’importe où pour voir ton bilan.' : 'Clique à nouveau n’importe où pour continuer.';
    document.querySelector<HTMLElement>('.rev-test-hint')!.textContent = correct ? '✓ Bonne réponse · traduction révélée' : pick === null ? '↷ Question passée · correction révélée' : '✕ Mauvaise réponse · correction révélée';
  }
  function question() {
    const q = questions[index];
    render(`<div class="rev-progress" role="progressbar" aria-label="Questions terminées" aria-valuenow="${index}" aria-valuemin="0" aria-valuemax="${questions.length}"><span style="width:${100 * index / questions.length}%"></span></div>
      <div class="rev-eyebrow">${theme.icon} ${esc(theme.title)}</div><p class="rev-test-hint">Clique sur une réponse pour la valider. 🇫🇷 : 0 point si juste.</p><h1 class="rev-question" lang="ca" tabindex="-1">${esc(q.prompt)}</h1><p id="rev-question-fr" class="rev-question-fr concealed" lang="fr" aria-hidden="true">${esc(q.french.prompt)}</p>
      <div class="rev-answers" lang="ca" role="group" aria-label="Respostes">${order.map((original, i) => `<button data-choice="${original}" aria-pressed="false"><span>${String.fromCharCode(65 + i)}</span><div class="rev-option-copy"><span>${esc(q.answers[original])}</span><small class="rev-option-fr concealed" lang="fr" aria-hidden="true">${esc(q.french.answers[original])}</small></div></button>`).join('')}</div>
      <div class="rev-test-actions"><button id="rev-skip" class="rev-secondary" lang="ca">No ho sé · passar</button></div><div id="rev-feedback" role="status" aria-live="polite" hidden></div><p id="rev-advance-hint" class="rev-advance-hint" hidden></p><div id="rev-quit-dialog"></div>`, true);
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => b.onclick = e => {
      e.stopPropagation(); confirmAnswer(Number(b.dataset.choice));
    });
    document.querySelector<HTMLButtonElement>('#rev-skip')!.onclick = e => { e.stopPropagation(); confirmAnswer(null); };
  }
  function quitTest() {
      const area = document.querySelector<HTMLDivElement>('#rev-quit-dialog')!;
      area.innerHTML = '<div class="rev-dialog-backdrop"><section class="rev-dialog" role="alertdialog" aria-modal="true" aria-labelledby="rev-quit-title" aria-describedby="rev-quit-description"><h2 id="rev-quit-title">Quitter ce test ?</h2><p id="rev-quit-description">Ce test incomplet ne comptera pas dans ta maîtrise.</p><button class="rev-primary" id="rev-resume">Continuer le test</button><button class="rev-secondary" id="rev-abandon">Quitter le test</button></section></div>';
      const dialog = area.querySelector<HTMLElement>('.rev-dialog')!;
      const controls = [...dialog.querySelectorAll<HTMLButtonElement>('button')];
      controls[0].focus();
      dialog.onkeydown = e => {
        if (e.key === 'Escape') { area.innerHTML = ''; document.querySelector<HTMLButtonElement>('#rev-home')?.focus(); }
        if (e.key === 'Tab') { e.preventDefault(); controls[document.activeElement === controls[0] ? 1 : 0].focus(); }
      };
      button('rev-resume', () => { area.innerHTML = ''; document.querySelector<HTMLButtonElement>('#rev-home')?.focus(); });
      button('rev-abandon', () => { questions = []; overview(); });
  }
  function advance() {
    if (!active || selected === undefined || saving) return;
    if (++index < questions.length) prepareQuestion();
    else {
      active = false;
      const run = finishRun(theme.id, questions, picks, frenchUsed);
      runs = [...runs, run];
      unsaved.set(run.id, run);
      void persist(run);
    }
  }
  async function persist(run: RevisionRun) {
    saving = true; result(run);
    try { await saveRun(run); unsaved.delete(run.id); }
    catch { unsaved.set(run.id, run); }
    saving = false;
    result(run);
  }
  function result(run: RevisionRun) {
    const score = runPercent(run);
    const missed = questions.filter((q, i) => picks[i] !== q.correct).length;
    render(`<div class="rev-result"><div class="rev-eyebrow">${theme.icon} ${esc(theme.title)} · TEST TERMINÉ</div><h1 tabindex="-1">${score >= 80 ? 'Bien joué !' : score >= 60 ? 'Ça prend forme.' : 'On reprend les repères.'}</h1><div class="rev-score" style="--score:${score}%"><span>${score}<small>%</small></span></div><p><strong>${(run.points ?? run.correct).toLocaleString('fr-FR')} / ${run.total} points</strong><br>${run.correct} bonnes réponses · ${frenchUsed.filter(Boolean).length} question(s) avec aide 🇫🇷</p><p class="rev-save-status" role="status">${saving ? 'Enregistrement…' : unsaved.has(run.id) ? 'Résultat non sauvegardé sur cet appareil.' : '✓ Résultat enregistré sur cet appareil.'}</p></div>
      ${unsaved.has(run.id) && !saving ? '<p class="rev-warning">Ton résultat reste visible. Réessaie la sauvegarde ou exporte-le avant de fermer.</p><button id="rev-retry" class="rev-secondary">Réessayer la sauvegarde</button>' : ''}${history()}
      <div class="rev-result-actions"><button id="rev-again" class="rev-primary" ${saving ? 'disabled' : ''}>Nouveau test · ${testLength()} questions ↻</button>${isMastery() ? '' : `<button id="rev-reread" class="rev-secondary" ${saving ? 'disabled' : ''}>Relire les fiches</button>`}<button id="rev-export" class="rev-secondary">Exporter mes résultats</button></div>
      <div class="rev-section-label">LA CORRECTION <span>${missed} à revoir</span></div><div class="rev-corrections">${questions.map((q, i) => {
        const pick = picks[i], correct = pick === q.correct;
        const owner = questionThemes.get(q.id)!;
        return `<details class="rev-correction ${correct ? 'rev-correct' : 'rev-incorrect'}" ${correct ? '' : 'open'}><summary><span>${correct ? '✓' : pick === null ? '↷' : '✕'} ${i + 1}.</span> <span lang="ca">${esc(q.prompt)}</span></summary><div>${!correct ? `<p>Ta réponse : <span lang="ca">${pick === null ? 'No ho sé' : esc(q.answers[pick])}</span></p>` : ''}<p class="rev-answer-key">✓ <span lang="ca">${esc(q.answers[q.correct])}</span></p><p>${esc(q.explanation)}</p><button class="rev-text-link" data-review-question="${i}" ${saving ? 'disabled' : ''}>Relire la fiche ${q.page + 1} · ${esc(owner.title)} · ${esc(owner.pages[q.page].title)} →</button></div></details>`;
      }).join('')}</div>`, true);
    button('rev-again', start); button('rev-reread', () => lesson(0)); button('rev-export', exportRuns);
    button('rev-retry', () => { if (!saving) void persist(run); });
    document.querySelectorAll<HTMLButtonElement>('[data-review-question]').forEach(b => b.onclick = () => {
      if (saving) return;
      const q = questions[Number(b.dataset.reviewQuestion)];
      theme = questionThemes.get(q.id)!; lesson(q.page);
    });
  }
  return {
    async open() {
      study.stop(); themeOpen = false; active = false; lessonIndex = null;
      const request = ++generation;
      render('<h1 tabindex="-1">Révision</h1><p role="status">Chargement de tes résultats…</p>');
      try {
        const [stored] = await Promise.all([readRuns(), study.refresh()]);
        if (request !== generation) return;
        runs = [...new Map([...stored, ...runs].map(r => [r.id, r])).values()]; loadFailed = false;
      } catch { if (request !== generation) return; loadFailed = true; }
      overview();
    },
    leave() { generation++; viewGeneration++; active = false; themeOpen = false; study.stop(); },
    hasUnfinished() { return active || unsaved.size > 0 || study.unsaved(); },
    headerLead: () => themeOpen ? `<button type="button" class="rev-header-back" id="rev-home" aria-label="Retour aux thèmes" ${saving ? 'disabled' : ''}><span aria-hidden="true">←</span><span class="rev-back-label">Thèmes</span></button>${active ? `<b class="header-count" id="rev-header-count" aria-label="Question ${index + 1} sur ${questions.length}">${index + 1}<span> / ${questions.length}</span></b>` : ''}` : '',
    headerNav: () => themeOpen && !active && theme.pages.length > 0 ? `<div class="rev-header-tabs" role="group" aria-label="Fiches et test : ${esc(theme.title)}"><span class="rev-header-caption">Fiches</span>${theme.pages.map((p, i) => `<button type="button" data-rev-page="${i}" aria-label="Fiche ${i + 1} : ${esc(p.title)}" title="${esc(p.title)}" ${lessonIndex === i ? 'aria-current="page"' : ''} ${saving ? 'disabled' : ''}>${i + 1}</button>`).join('')}<button type="button" id="rev-header-test" aria-label="Lancer le test de 10 questions" title="Lancer le test de 10 questions" ${saving ? 'disabled' : ''}>Q</button></div>` : '',
    header: () => `${study.header()}${active ? `<button class="language-button" id="rev-reveal" type="button" aria-label="Afficher le français : bonne réponse à 0 point sur 1" title="Français : bonne réponse à 0 point sur 1" aria-pressed="${frenchVisible}" ${frenchVisible ? 'disabled' : ''}><span class="france-flag" aria-hidden="true">🇫🇷</span></button>` : ''}`,
    async refreshProgress() {
      try {
        const [stored] = await Promise.all([readRuns(), study.refresh()]);
        runs = [...new Map([...stored, ...runs].map(r => [r.id, r])).values()]; loadFailed = false;
      } catch { loadFailed = true; }
    },
    masterySummary: () => ({ percent: overallMastery(runs, themes), total: themes.length, error: loadFailed }),
    timeEntries: study.entries,
    timeError: study.error,
    exportData
  };
}
