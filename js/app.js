(() => {
const C = window.COURSE;
const KEY = 'amh-course-v2';
const OLD_KEY = 'amfh-training-v1';
const STEP_NAMES = { learn: 'Learn', try: 'Try', check: 'Check', note: 'Note' };

/* ---------- state ---------- */
const blank = () => ({ track: null, name: '', done: {}, quiz: {}, forms: {}, notes: {}, confirms: {}, checklist: [], review: false, night: false });
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { S = blank(); }
const save = () => localStorage.setItem(KEY, JSON.stringify(S));

function migrateV1() {
  if (S.migrated) return;
  let old; try { old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch { old = null; }
  S.migrated = true;
  if (!old) { save(); return; }
  const set = (f, k, v) => { if (v && !(S.forms[f] && S.forms[f][k])) { S.forms[f] = S.forms[f] || {}; S.forms[f][k] = v; } };
  set('contacts', 'crisis', old.crisis); set('contacts', 'community', old.community); set('contacts', 'mentor', old.mentor);
  set('mission', 'who', old.missionWho); set('mission', 'when', old.missionWhen);
  set('reflection', 'worked', old.worked); set('reflection', 'difficult', old.difficult); set('reflection', 'adjust', old.adjust);
  save();
  if (old.crisis || old.missionWho || old.worked) setTimeout(() => toast('Brought over your contacts and notes from the previous guide.'), 400);
}

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const units = () => C.UNITS.filter(u => !u.track || u.track === S.track);
const stageUnits = s => units().filter(u => u.stage === s);
const unitById = id => C.UNITS.find(u => u.id === id);
const isDone = u => !!S.done[u.id];
const stageComplete = s => stageUnits(s).every(isDone);
const stageUnlocked = s => S.review || s === 0 || (stageUnlocked(s - 1) && stageComplete(s - 1));
const unitUnlocked = u => stageUnlocked(u.stage) && (!u.checkpoint || S.review || stageUnits(u.stage).filter(x => x !== u).every(isDone));
const nextUnit = () => units().find(u => !isDone(u));
const sessionUnlocked = () => S.review || stageComplete(0) && stageComplete(1) && stageComplete(2);
const minutesLeft = () => units().filter(u => !isDone(u)).reduce((a, u) => a + (u.minutes || 0), 0);
const pct = () => Math.round(units().filter(isDone).length / units().length * 100);
const allDone = () => units().every(isDone);
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + ' min' : ''}`.trim() : `${m} min`;
const form = id => (S.forms[id] = S.forms[id] || {});
const formComplete = id => C.FORMS[id].fields.filter(f => f.required).every(f => String(form(id)[f.id] || '').trim());

function checkSatisfied(u) {
  const c = u.check; if (!c) return true;
  if (c.kind === 'quiz') return c.items.every((it, i) => { const a = (S.quiz[u.id] || {})[i]; return a != null && it.options[a].correct; });
  if (c.kind === 'form') return formComplete(c.form) && (!c.confirm || !!S.confirms[u.id]);
  if (c.kind === 'confirm') return !!S.confirms[u.id];
  if (c.kind === 'ready') return c.requires.every(formComplete) && !!S.confirms[u.id];
  return true;
}
function stepsFor(u) {
  if (u.checkpoint) return ['check'];
  const s = [];
  if (u.learn || u.card) s.push('learn');
  if (u.try || u.card) s.push('try');
  if (u.check) s.push('check');
  if (u.note) s.push('note');
  return s;
}
function actLit() {
  const lit = {}; Object.keys(C.ACT).forEach(k => lit[k] = 0);
  units().filter(isDone).forEach(u => (u.act || []).forEach(a => lit[a]++));
  return lit;
}

/* ---------- icons ---------- */
const I = {
  done: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor" opacity=".18"/><path d="M6 10.5l2.6 2.5L14 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  open: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  now: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10" r="4" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="9" width="10" height="8" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* ---------- shell ---------- */
function shell(main, { hideBar = false } = {}) {
  const n = nextUnit();
  const route = location.hash || '#/';
  const navs = [['#/', 'Path'], ['#/session', 'Session mode'], ['#/plan', 'My plan'], ['#/library', 'Library']];
  const bar = !hideBar && S.track ? `
    <div class="here" role="status">
      <div class="here-text">
        <span class="eyebrow">You are here</span>
        <span>${n ? `Stage ${n.stage} · ${esc(C.STAGES[n.stage].title)} — ${esc(n.id)} ${esc(n.title)}` : 'Course complete'}</span>
      </div>
      <div class="here-meter" aria-label="${pct()}% complete"><span style="width:${pct()}%"></span></div>
      <span class="here-left">${n ? `${fmtMin(minutesLeft())} left` : '100%'}</span>
      ${n ? `<a class="btn btn-primary btn-sm" href="#/u/${n.id}">Continue ${I.arrow}</a>` : `<a class="btn btn-primary btn-sm" href="#/record">Completion record</a>`}
    </div>` : '';
  return `
    <a class="skip" href="#main">Skip to content</a>
    <header class="top">
      <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">✦</span><span><strong>Astronomy for Mental Health</strong><small>Facilitator course</small></span></a>
      ${S.track ? `<nav class="nav" aria-label="Main">${navs.map(([h, l]) => {
        const locked = h === '#/session' && !sessionUnlocked();
        const active = (h === '#/' ? route === '#/' || route.startsWith('#/u/') : route.startsWith(h));
        return `<a href="${h}" class="${active ? 'active' : ''} ${locked ? 'locked' : ''}" ${active ? 'aria-current="page"' : ''}>${locked ? I.lock : ''}${l}</a>`;
      }).join('')}</nav>` : ''}
      <button class="night-toggle" data-night aria-pressed="${S.night}" title="Red night view protects dark adaptation">${S.night ? 'Normal view' : 'Red night view'}</button>
    </header>
    ${bar}
    <main id="main" tabindex="-1">${main}</main>
    <footer class="foot"><p>IAU Office of Astronomy for Development · Astronomy for Mental Health. Your progress and notes are stored only in this browser. This course trains reflective facilitation; it is not clinical training.</p></footer>`;
}

/* ---------- painted stage art (Spark's Wilds images, one per stage) ---------- */
const ART = ['00-start', '01-foundations', '02-safety', '03-practice', '04-context', '05-go'];
function pic(stage, { lazy = true, sizes = '(max-width: 960px) 100vw, 1200px' } = {}) {
  const n = ART[stage] || ART[0], b = 'assets/wilds/' + n;
  return `<picture><source type="image/webp" srcset="${b}-960.webp 960w, ${b}.webp 1600w" sizes="${sizes}"><img src="${b}.jpg" width="1600" height="900" alt="" decoding="async" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}></picture>`;
}

/* ---------- pages ---------- */
function welcome() {
  return shell(`
    <section class="hero">
      <div class="hero-art">${pic(0, { lazy: false, sizes: '100vw' })}</div>
      <div class="hero-copy">
        <p class="eyebrow">A self-guided facilitator course</p>
        <p class="display">Look up.</p>
        <h1>Learn to guide safe, sky-based reflection.</h1>
        <p class="lede">For people who know the sky and want to use it to support wellbeing. Built on ACT (Acceptance and Commitment Therapy) and trauma-informed practice. About 3½–4 hours, in units of 15 minutes or less.</p>
      </div>
    </section>
    <section class="strip" aria-label="The six stages">
      ${C.STAGES.map(s => `<figure class="frag">${pic(s.id)}<figcaption><span class="frag-n">0${s.id}</span><b>${esc(s.title)}</b><small>${esc(s.blurb)}</small></figcaption></figure>`).join('')}
    </section>
    <section class="panel">
      <h2>Choose your track</h2>
      <p class="muted">You can switch at any time and keep your progress.</p>
      <div class="tracks">${Object.entries(C.TRACKS).map(([k, t]) => `
        <button class="track" data-track="${k}">
          <b>${esc(t.label)}</b><span>${esc(t.text)}</span><span class="track-go">Start ${I.arrow}</span>
        </button>`).join('')}</div>
      <p class="muted small">Coming from the in-person training day? Choose Astro-tourism guide. The forms here match the pages of your workbook, so you can copy your self-care plan and session design straight in.</p>
    </section>`, { hideBar: true });
}

function hexaflex(size = 260) {
  const lit = actLit(); const keys = Object.keys(C.ACT);
  const cx = 130, cy = 130, r = 92;
  const pts = keys.map((k, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  return `<figure class="hex">
    <svg viewBox="0 0 260 260" width="${size}" height="${size}" role="img" aria-label="ACT map: ${keys.filter(k => lit[k]).length} of 6 processes practised">
      <polygon points="${pts.map(p => p.join(',')).join(' ')}" class="hex-edge"/>
      ${pts.map(p => `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" class="hex-spoke"/>`).join('')}
      <circle cx="${cx}" cy="${cy}" r="30" class="hex-core"/>
      <text x="${cx}" y="${cy - 3}" class="hex-core-t">open up ·</text><text x="${cx}" y="${cy + 10}" class="hex-core-t">be present · act</text>
      ${keys.map((k, i) => `<g class="hex-node ${lit[k] ? 'lit' : ''}"><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="${lit[k] ? 22 : 18}"/><text x="${pts[i][0]}" y="${pts[i][1] + 4}">${lit[k] || ''}</text></g>`).join('')}
    </svg>
    <figcaption><ul>${keys.map(k => `<li class="${lit[k] ? 'lit' : ''}"><b>${esc(C.ACT[k].label)}</b> <span>(${esc(C.ACT[k].short)})</span> ${esc(C.ACT[k].plain)}</li>`).join('')}</ul></figcaption>
  </figure>`;
}

function home() {
  const n = nextUnit();
  const done = allDone();
  const stages = C.STAGES.map(s => {
    const us = stageUnits(s.id); const unlocked = stageUnlocked(s.id); const complete = stageComplete(s.id);
    const current = n && n.stage === s.id;
    return `<li class="stage ${complete ? 'complete' : ''} ${current ? 'current' : ''} ${unlocked ? '' : 'locked'}">
      <div class="stage-head">
        <div class="stage-art">${pic(s.id)}</div>
        <span class="stage-num">${complete ? I.done : unlocked ? s.id : I.lock}</span>
        <div><h3>Stage ${s.id} · ${esc(s.title)}</h3><p>${esc(s.blurb)}</p>
        ${!unlocked ? `<p class="small muted">Unlocks after Stage ${s.id - 1} is complete.</p>` : ''}</div>
        <span class="stage-meta">${us.filter(isDone).length}/${us.length} · ${fmtMin(us.reduce((a, u) => a + (u.minutes || 0), 0))}</span>
      </div>
      ${unlocked ? `<ol class="units">${us.map(u => {
        const ok = unitUnlocked(u); const st = isDone(u) ? 'done' : (n && n.id === u.id) ? 'now' : ok ? 'open' : 'lock';
        const inner = `<span class="u-ico ${st}">${I[st]}</span><span class="u-id">${esc(u.id)}</span><span class="u-title">${esc(u.title)}${u.track === 'tourism' ? ' <em class="tag">tourism</em>' : ''}${u.checkpoint ? ' <em class="tag tag-check">checkpoint</em>' : ''}</span><span class="u-min">${u.minutes} min</span>`;
        return `<li>${ok ? `<a class="unit-row ${st}" href="#/u/${u.id}">${inner}</a>` : `<span class="unit-row lock" aria-disabled="true">${inner}</span>`}</li>`;
      }).join('')}</ol>` : ''}
    </li>`;
  }).join('');
  return shell(`
    <div class="home-grid">
      <section>
        ${done ? `<div class="panel done-panel"><h2>You have completed the course.</h2><p>Keep Session mode handy for your next session, and download your plan from My plan.</p><a class="btn btn-primary" href="#/record">View completion record</a></div>`
          : `<div class="panel next-panel"><div class="banner-art">${pic(n.stage, { lazy: false })}</div><p class="eyebrow">Next up · Stage ${n.stage} · ${esc(C.STAGES[n.stage].title)}</p><h2>${esc(n.id)} ${esc(n.title)}</h2><p>${esc(n.intro || '')}</p><a class="btn btn-primary" href="#/u/${n.id}">${units().some(isDone) ? 'Continue' : 'Begin'} ${I.arrow}</a></div>`}
        <h2 class="section-h">Your path <span class="muted small">· ${esc(C.TRACKS[S.track].label)} track</span></h2>
        <ol class="stages">${stages}</ol>
      </section>
      <aside class="side">
        <div class="panel"><h2 class="h3">Your ACT map</h2><p class="small muted">Each process lights up as you complete units that train it.</p>${hexaflex(220)}</div>
        <div class="panel"><h2 class="h3">Session mode</h2>
          ${sessionUnlocked() ? `<p class="small">Cards, opening script, pivot phrase and your contacts, ready to use during a session.</p><a class="btn btn-secondary" href="#/session">Open Session mode</a>`
            : `<p class="small muted">${I.lock} Opens when you reach Stage 3, after Safety. You will have your contacts and pivot phrase ready first.</p>`}
        </div>
      </aside>
    </div>`);
}

function fieldHTML(fid, f) {
  const v = esc(form(fid)[f.id] || ''); const id = `f-${fid}-${f.id}`;
  const req = f.required ? '<span class="req" aria-hidden="true">*</span>' : '';
  if (f.type === 'scale') return `<fieldset class="field scale"><legend>${esc(f.label)} ${req}</legend><div>${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" name="${id}" value="${i}" data-form="${fid}" data-field="${f.id}" ${String(form(fid)[f.id]) === String(i) ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div></fieldset>`;
  const tag = f.type === 'textarea'
    ? `<textarea id="${id}" data-form="${fid}" data-field="${f.id}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'aria-required="true"' : ''}>${v}</textarea>`
    : `<input id="${id}" data-form="${fid}" data-field="${f.id}" value="${v}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'aria-required="true"' : ''}>`;
  return `<div class="field"><label for="${id}">${esc(f.label)} ${req}</label>${tag}</div>`;
}
function formHTML(fid) {
  const F = C.FORMS[fid];
  return `<div class="form-block" data-formblock="${fid}">
    ${F.workbook ? `<p class="small muted">Same as workbook ${esc(F.workbook)}.</p>` : ''}
    ${F.fields.map(f => fieldHTML(fid, f)).join('')}
    <p class="small muted"><span class="req">*</span> needed to complete this step. Saved on this device as you type.</p>
  </div>`;
}

function quizHTML(u) {
  const ans = S.quiz[u.id] || {};
  return u.check.items.map((it, i) => {
    const a = ans[i];
    return `<fieldset class="quiz"><legend><span class="q-n">${u.check.items.length > 1 ? `Scenario ${i + 1}` : 'Check'}</span>${esc(it.q)}</legend>
      ${it.options.map((o, j) => `<button class="opt ${a === j ? (o.correct ? 'right' : 'wrong') : ''}" data-quiz="${u.id}" data-item="${i}" data-opt="${j}" aria-pressed="${a === j}">${esc(o.t)}</button>`).join('')}
      <p class="feedback" aria-live="polite">${a != null ? `<b>${it.options[a].correct ? 'Yes.' : 'Not quite.'}</b> ${esc(it.options[a].why)}${it.options[a].correct ? '' : ' Try another.'}` : ''}</p>
    </fieldset>`;
  }).join('');
}

function cardDetail(c, { compact = false } = {}) {
  return `
    ${compact ? '' : `<p><b>When to use it:</b> ${esc(c.when)}</p><p><b>Prepare:</b> ${esc(c.prep)}</p>`}
    <h3 class="h4">Steps</h3><ol class="steps">${c.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <blockquote class="script"><span class="eyebrow">Say something like</span>${esc(c.prompt)}</blockquote>
    <div class="two">
      <div class="box box-warn"><h3 class="h4">Trauma-informed watch-fors</h3><ul>${c.trauma.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="box"><h3 class="h4">Indoor or cloudy version</h3><p>${esc(c.indoor)}</p></div>
    </div>
    <p><b>Closing:</b> ${esc(c.after)}</p>`;
}

function actChips(u) {
  return (u.act || []).length ? `<div class="chips">${u.act.map(a => `<span class="chip">ACT · ${esc(C.ACT[a].label)}</span>`).join('')}</div>` : '';
}

function unitPage(id, step) {
  const u = unitById(id);
  if (!u || (u.track && u.track !== S.track)) return shell(`<div class="panel"><h1>Unit not found</h1><a href="#/">Back to your path</a></div>`);
  if (!unitUnlocked(u)) {
    const why = !stageUnlocked(u.stage) ? `Finish Stage ${u.stage - 1} first.` : 'Finish the other units in this stage first.';
    return shell(`<div class="panel"><p class="eyebrow">${I.lock} Locked</p><h1>${esc(u.id)} ${esc(u.title)}</h1><p>${why}</p><a class="btn btn-primary" href="#/">Back to your path</a></div>`);
  }
  const steps = stepsFor(u);
  if (!steps.includes(step)) step = steps[0];
  const si = steps.indexOf(step);
  const c = u.card && C.CARDS[u.card];
  let body = '';
  if (step === 'learn') {
    body = c ? cardDetail(c) : `
      ${u.learn.map(p => `<p>${esc(p)}</p>`).join('')}
      ${u.keyPoints ? `<div class="box"><h3 class="h4">Hold on to</h3><ul>${u.keyPoints.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
      ${u.script ? `<blockquote class="script"><span class="eyebrow">Say something like</span>${esc(u.script)}</blockquote>` : ''}
      ${u.showHex ? hexaflex(240) : ''}`;
  } else if (step === 'try') {
    const t = c ? { title: 'Practise alone', text: c.solo } : u.try;
    body = `<div class="try"><p class="eyebrow">Try it · a few minutes</p><h2 class="h3">${esc(t.title)}</h2>
      ${t.text ? `<p>${esc(t.text)}</p>` : ''}${t.steps ? `<ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}</div>`;
  } else if (step === 'check') {
    const k = u.check.kind;
    if (k === 'quiz') body = quizHTML(u);
    if (k === 'form') body = `${u.check.intro ? `<p>${esc(u.check.intro)}</p>` : ''}<h2 class="h3">${esc(C.FORMS[u.check.form].title)}</h2>${formHTML(u.check.form)}`;
    if (k === 'confirm' || (k === 'form' && u.check.confirm) || k === 'ready') {
      if (k === 'ready') body = `<ul class="ready">${u.check.requires.map(f => `<li class="${formComplete(f) ? 'ok' : ''}">${formComplete(f) ? I.done : I.open} ${esc(C.FORMS[f].title)} ${formComplete(f) ? '' : `<a href="#/plan">complete in My plan</a>`}</li>`).join('')}</ul>`;
      const label = u.check.label || u.check.confirm;
      body += `<label class="confirm"><input type="checkbox" data-confirm="${u.id}" ${S.confirms[u.id] ? 'checked' : ''}><span>${esc(label)}</span></label>`;
    }
  } else if (step === 'note') {
    body = `<div class="field"><label for="note">${esc(u.note)} <span class="muted small">(optional, private)</span></label><textarea id="note" data-note="${u.id}" rows="5">${esc(S.notes[u.id] || '')}</textarea></div>`;
  }
  const last = si === steps.length - 1;
  const ready = checkSatisfied(u);
  const nextBtn = last
    ? `<button class="btn btn-primary" data-complete="${u.id}" ${ready ? '' : 'disabled'}>${isDone(u) ? 'Done · next unit' : 'Complete unit'} ${I.arrow}</button>`
    : step === 'check' && !ready
      ? `<button class="btn btn-primary" disabled data-gate="${u.id}">Next: ${STEP_NAMES[steps[si + 1]]}</button>`
      : `<a class="btn btn-primary" data-gate="${u.id}" href="#/u/${u.id}/${steps[si + 1]}">Next: ${STEP_NAMES[steps[si + 1]]} ${I.arrow}</a>`;
  const gateMsg = (step === 'check' && !ready) ? `<p class="small muted gate-msg">${u.check.kind === 'quiz' ? 'Choose the best answer to continue.' : 'Complete the starred items to continue.'}</p>` : '';
  return shell(`
    <figure class="unit-art">${pic(u.stage, { lazy: false })}</figure>
    <article class="unit">
      <a class="back" href="#/">← Your path</a>
      <p class="eyebrow">Stage ${u.stage} · ${esc(C.STAGES[u.stage].title)} · ${esc(u.id)} · ${u.minutes} min</p>
      <h1>${esc(u.title)}</h1>
      ${actChips(u)}
      ${u.intro ? `<p class="lede">${esc(u.intro)}</p>` : ''}
      ${steps.length > 1 ? `<ol class="stepper" aria-label="Unit steps">${steps.map((s, i) => {
        const reachable = i <= si || (steps.indexOf('check') >= i || checkSatisfied(u));
        return `<li class="${i === si ? 'active' : i < si ? 'past' : ''}">${reachable ? `<a href="#/u/${u.id}/${s}" ${i === si ? 'aria-current="step"' : ''}>${i + 1}. ${STEP_NAMES[s]}</a>` : `<span>${i + 1}. ${STEP_NAMES[s]}</span>`}</li>`;
      }).join('')}</ol>` : ''}
      <div class="unit-body">${body}</div>
      <div class="unit-nav">
        ${si > 0 ? `<a class="btn btn-ghost" href="#/u/${u.id}/${steps[si - 1]}">← ${STEP_NAMES[steps[si - 1]]}</a>` : '<span></span>'}
        <div class="unit-next">${gateMsg}${nextBtn}</div>
      </div>
    </article>`);
}

function stageDone(s) {
  const nextStage = C.STAGES[s + 1];
  const n = nextUnit();
  return shell(`<div class="panel stage-done">
    <div class="banner-art">${pic(nextStage ? nextStage.id : 5, { lazy: false })}</div>
    <p class="eyebrow">${I.done} Stage ${s} complete</p>
    <h1>${esc(C.STAGES[s].title)}: done.</h1>
    ${nextStage ? `<p>Stage ${nextStage.id}, <b>${esc(nextStage.title)}</b>, is now open. ${esc(nextStage.blurb)}</p>` : ''}
    ${s === 2 ? `<p class="box">Session mode is now open: activity cards, opening script, pivot phrase and your contacts in one place for use during a session.</p>` : ''}
    ${hexaflex(200)}
    <div class="row">${n ? `<a class="btn btn-primary" href="#/u/${n.id}">Continue to ${esc(n.id)} ${esc(n.title)} ${I.arrow}</a>` : `<a class="btn btn-primary" href="#/record">View completion record</a>`}<a class="btn btn-ghost" href="#/">Your path</a></div>
  </div>`);
}

function session() {
  if (!sessionUnlocked()) return shell(`<div class="panel"><p class="eyebrow">${I.lock} Locked</p><h1>Session mode</h1><p>Session mode opens when you reach Stage 3. Finish Safety first so your contacts and pivot phrase are ready.</p><a class="btn btn-primary" href="#/">Back to your path</a></div>`);
  const ct = form('contacts');
  const cl = S.checklist || [];
  return shell(`
    <figure class="unit-art">${pic(3, { lazy: false })}</figure>
    <div class="session">
      <h1>Session mode</h1>
      <p class="muted">Everything you need mid-session. Turn on <b>Red night view</b> (top right) to protect dark adaptation.</p>
      <section class="pivot"><p class="eyebrow">If the weather turns heavy</p><p class="pivot-text">“Let’s come back to what is here: the ground under our feet, the air on our skin, the sounds around us, and the sky above us.”</p>
        <p class="small">Stay steady → ground the group, eyes open → offer space (“anyone can take a break”) → check in privately → offer contacts → tell your supervisor.</p></section>
      <section class="panel"><h2 class="h3">Your support contacts</h2>
        <dl class="contacts">${C.FORMS.contacts.fields.map(f => `<dt>${esc(f.label)}</dt><dd>${esc(ct[f.id] || '— not filled in —')}</dd>`).join('')}</dl>
        <p class="small muted">Hand-off: “What you’ve shared matters, and I want to make sure you have proper support for it. Would it be OK if I shared some contact details?”</p></section>
      <section class="panel"><h2 class="h3">Opening: arrive → widen → reflect</h2>
        <ol class="steps"><li><b>Arrive.</b> Ground, air, sounds, then the sky. Ten seconds of quiet first.</li><li><b>Hook.</b> One true image or fact. Then silence.</li><li><b>Reflect.</b> One question. Stop talking.</li></ol></section>
      <section><h2 class="h3">Activity cards</h2>
        ${Object.values(C.CARDS).map((c, i) => `<details class="card" ${i === 0 ? 'open' : ''}><summary><span>${esc(c.title)}</span><small>${esc(c.time)} · ${c.act.map(a => esc(C.ACT[a].label)).join(', ')}</small></summary>${cardDetail(c, { compact: true })}</details>`).join('')}
      </section>
      <section class="panel"><h2 class="h3">Before you start</h2>
        ${C.CHECKLIST.map((t, i) => `<label class="confirm"><input type="checkbox" data-check="${i}" ${cl[i] ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
        <button class="btn btn-ghost btn-sm" data-clearcheck>Clear checklist</button></section>
      <section class="panel"><h2 class="h3">Care boundaries</h2><dl class="bounds">${C.BOUNDARIES.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></section>
    </div>`);
}

function plan() {
  const fids = ['scope', 'contacts', 'selfcare', ...(S.track === 'tourism' ? ['tourism'] : []), 'segment', 'mission', 'reflection'];
  const notes = units().filter(u => S.notes[u.id]);
  return shell(`
    <figure class="unit-art">${pic(4, { lazy: false })}</figure>
    <h1>My plan</h1>
    <p class="muted">Everything you have written, in one place. Edit here or in the units. It stays in this browser until you export it.</p>
    <div class="panel row wrap">
      <button class="btn btn-primary" data-export="md">Download my plan (.md)</button>
      <button class="btn btn-secondary" data-print>Print</button>
      <button class="btn btn-ghost" data-export="json">Back up progress (.json)</button>
      <label class="btn btn-ghost">Restore backup<input type="file" accept="application/json" data-import hidden></label>
    </div>
    <div class="field panel"><label for="name">Your name (used on your completion record)</label><input id="name" data-name value="${esc(S.name)}"></div>
    ${fids.map(f => `<details class="panel plan-form" ${formComplete(f) ? '' : 'open'}><summary><h2 class="h3">${esc(C.FORMS[f].title)}</h2><span class="${formComplete(f) ? 'ok' : 'muted'} small">${formComplete(f) ? 'complete' : 'to do'}</span></summary>${formHTML(f)}</details>`).join('')}
    <section class="panel"><h2 class="h3">Unit notes</h2>${notes.length ? notes.map(u => `<p><b>${esc(u.id)} ${esc(u.title)}</b><br>${esc(S.notes[u.id])}</p>`).join('') : '<p class="muted">No notes yet. Each unit ends with an optional note.</p>'}</section>
    <section class="panel settings"><h2 class="h3">Settings</h2>
      <p><b>Track:</b> ${Object.entries(C.TRACKS).map(([k, t]) => `<button class="btn btn-sm ${S.track === k ? 'btn-secondary' : 'btn-ghost'}" data-track="${k}" aria-pressed="${S.track === k}">${esc(t.label)}</button>`).join(' ')}</p>
      <label class="confirm"><input type="checkbox" data-review ${S.review ? 'checked' : ''}><span><b>Review mode</b>: unlock all stages (for trainers and reviewers). Progress is not marked complete.</span></label>
      <button class="btn btn-ghost btn-danger" data-reset>Reset all progress and notes</button>
    </section>`);
}

function library() {
  return shell(`
    <figure class="unit-art">${pic(1, { lazy: false })}</figure>
    <h1>Library</h1>
    <section class="panel"><h2 class="h3">Sky narratives</h2>${C.NARRATIVES.map(n => `<h3 class="h4">${esc(n.title)}</h3><p>${esc(n.body)}</p>`).join('')}
      <p class="small muted">Using a local or cultural sky story? Ask permission where you can, and credit where it comes from.</p></section>
    <section class="panel"><h2 class="h3">Plain-language glossary</h2><dl class="gloss">${C.GLOSSARY.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></section>
    <section class="panel"><h2 class="h3">Resources</h2><ul class="res">${C.RESOURCES.map(r => `<li><span class="chip">${esc(r.kind)}</span> <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><br><span class="small muted">${esc(r.text)}</span></li>`).join('')}</ul></section>`);
}

function record() {
  if (!allDone() && !S.review) return shell(`<div class="panel"><h1>Completion record</h1><p>Available when every unit on your path is complete. ${fmtMin(minutesLeft())} to go.</p><a class="btn btn-primary" href="#/">Back to your path</a></div>`);
  const d = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return shell(`
    <div class="record">
      <div class="record-art">${pic(5, { lazy: false })}</div>
      <p class="eyebrow">Record of completion</p>
      <h1>${esc(S.name || 'Your name')}</h1>
      <p>completed the self-guided <b>Astronomy for Mental Health Facilitator Course</b> (${esc(C.TRACKS[S.track].label)} track), including trauma-informed practice, ACT foundations, safety and hand-off, five sky activities${S.track === 'tourism' ? ', astro-tourism practice' : ''}, a session design and a first facilitated session with reflection.</p>
      <p class="muted">${d}</p>
      <p class="small muted">Self-recorded completion of a self-guided course. Not a clinical qualification.</p>
      <div class="row noprint">${S.name ? '' : '<a class="btn btn-ghost" href="#/plan">Add your name</a>'}<button class="btn btn-primary" data-print>Print or save as PDF</button></div>
    </div>`, { hideBar: true });
}

/* ---------- export ---------- */
function exportMD() {
  const L = [`# My facilitator plan`, ``, `${S.name ? `Name: ${S.name}  ` : ''}Track: ${C.TRACKS[S.track]?.label || '-'}  `, `Exported: ${new Date().toLocaleString()}`, ``];
  ['scope', 'contacts', 'selfcare', 'tourism', 'segment', 'mission', 'reflection'].forEach(fid => {
    const F = C.FORMS[fid]; const v = form(fid);
    if (!F.fields.some(f => v[f.id])) return;
    L.push(`## ${F.title}${F.workbook ? ` (workbook ${F.workbook})` : ''}`, '');
    F.fields.forEach(f => v[f.id] && L.push(`**${f.label}:** ${v[f.id]}`, ''));
  });
  const notes = units().filter(u => S.notes[u.id]);
  if (notes.length) { L.push('## Unit notes', ''); notes.forEach(u => L.push(`**${u.id} ${u.title}:** ${S.notes[u.id]}`, '')); }
  download('my-facilitator-plan.md', L.join('\n'), 'text/markdown');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- toast ---------- */
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }
let ft; function flash() { clearTimeout(ft); ft = setTimeout(() => { const t = $('#toast'); if (t && !t.classList.contains('show')) toast('Saved on this device'); }, 900); }

/* ---------- router ---------- */
let pendingStageDone = null;
function render() {
  document.body.classList.toggle('night', !!S.night);
  const h = location.hash.replace(/^#\/?/, '');
  const [p, a, b] = h.split('/');
  let html;
  if (!S.track && p !== 'library') html = welcome();
  else if (pendingStageDone != null) { html = stageDone(pendingStageDone); pendingStageDone = null; }
  else if (p === 'u') html = unitPage(a, b);
  else if (p === 'session') html = session();
  else if (p === 'plan') html = plan();
  else if (p === 'library') html = library();
  else if (p === 'record') html = record();
  else html = home();
  $('#app').innerHTML = html;
  const titleEl = $('#app h1'); document.title = (titleEl ? titleEl.textContent + ' · ' : '') + 'Astronomy for Mental Health · Facilitator course';
}
function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); const m = $('#main'); m && m.focus({ preventScroll: true }); });

/* ---------- live gate update (no full re-render while typing) ---------- */
function updateGate() {
  const m = location.hash.match(/^#\/u\/([^/]+)/); if (!m) return;
  const u = unitById(m[1]); if (!u) return;
  const ok = checkSatisfied(u);
  const btn = document.querySelector('[data-complete],[data-gate]');
  if (!btn) return;
  if (btn.matches('[data-complete]')) btn.disabled = !ok;
  else if (ok && btn.tagName === 'BUTTON') {
    const steps = stepsFor(u); const nx = steps[steps.indexOf('check') + 1];
    const a = document.createElement('a');
    a.className = 'btn btn-primary'; a.dataset.gate = u.id; a.href = `#/u/${u.id}/${nx}`;
    a.innerHTML = `Next: ${STEP_NAMES[nx]} ${I.arrow}`;
    btn.replaceWith(a);
  }
  const msg = $('.gate-msg'); if (msg && ok) msg.remove();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-track],[data-quiz],[data-complete],[data-night],[data-export],[data-print],[data-reset],[data-clearcheck]');
  if (!t) return;
  if (t.dataset.track) { const first = !S.track; S.track = t.dataset.track; save(); first ? go('#/u/0.1') : render(); return; }
  if (t.dataset.quiz) { const q = S.quiz[t.dataset.quiz] = S.quiz[t.dataset.quiz] || {}; q[t.dataset.item] = +t.dataset.opt; save(); const y = scrollY; render(); scrollTo(0, y); return; }
  if (t.dataset.complete) {
    const u = unitById(t.dataset.complete); const wasDone = isDone(u);
    S.done[u.id] = true; save();
    if (!wasDone && stageComplete(u.stage)) { pendingStageDone = u.stage; go('#/stage'); return; }
    const n = nextUnit(); go(n ? `#/u/${n.id}` : '#/record'); return;
  }
  if ('night' in t.dataset) { S.night = !S.night; save(); render(); return; }
  if (t.dataset.export === 'md') return exportMD();
  if (t.dataset.export === 'json') return download('facilitator-course-backup.json', JSON.stringify(S, null, 2), 'application/json');
  if ('print' in t.dataset) return window.print();
  if ('reset' in t.dataset) { if (confirm('Delete all progress, forms and notes on this device? This cannot be undone.')) { S = blank(); S.migrated = true; save(); go('#/'); } return; }
  if ('clearcheck' in t.dataset) { S.checklist = []; save(); render(); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.form) { form(t.dataset.form)[t.dataset.field] = t.value; save(); flash(); updateGate(); }
  else if (t.dataset.note) { S.notes[t.dataset.note] = t.value; save(); flash(); }
  else if ('name' in t.dataset) { S.name = t.value; save(); flash(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.confirm) { S.confirms[t.dataset.confirm] = t.checked; save(); updateGate(); }
  else if (t.dataset.check) { S.checklist[+t.dataset.check] = t.checked; save(); }
  else if ('review' in t.dataset) { S.review = t.checked; save(); render(); }
  else if ('import' in t.dataset && t.files[0]) {
    t.files[0].text().then(txt => { try { const d = JSON.parse(txt); if (!d || typeof d !== 'object' || !('done' in d)) throw 0; S = Object.assign(blank(), d); save(); toast('Backup restored.'); render(); } catch { toast('That file is not a course backup.'); } });
  }
});

migrateV1();
render();
})();
