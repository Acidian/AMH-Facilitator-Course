/* Astronomy for Mental Health · Facilitator course (v3)
 * Renders window.COURSE (js/content.js). No build step, no dependencies.
 * Progress lives in localStorage under the same key as v2, so existing learners keep their work.
 */
(() => {
const C = window.COURSE;
const KEY = 'amh-course-v2';
const OLD_KEY = 'amfh-training-v1';
const PREVIEW = !!window.AMH_PREVIEW; /* hosted preview: downloads and printing are blocked there */

/* ---------- state ---------- */
const blank = () => ({ track: null, name: '', done: {}, doneAt: {}, quiz: {}, first: {}, flags: {}, forms: {}, notes: {}, confirms: {}, checklist: [], pos: {}, review: false, night: false, completedAt: null });
let S;
function load() {
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = blank(); }
  ['done', 'doneAt', 'quiz', 'first', 'flags', 'forms', 'notes', 'confirms', 'pos'].forEach(k => { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });
  if (!Array.isArray(S.checklist)) S.checklist = [];
  if (!C.TRACKS[S.track]) S.track = null;
}
let storageOK = true;
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { storageOK = false; } }

function migrateV1() {
  if (S.migrated) return;
  let old; try { old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch (e) { old = null; }
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
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const units = () => C.UNITS.filter(u => !u.track || u.track === S.track);
const stageUnits = s => units().filter(u => u.stage === s);
const unitById = id => C.UNITS.find(u => u.id === id);
const isDone = u => !!S.done[u.id];
const stageComplete = s => stageUnits(s).every(isDone);
const stageUnlocked = s => S.review || s === 0 || (stageUnlocked(s - 1) && stageComplete(s - 1));
const unitUnlocked = u => stageUnlocked(u.stage) && (!u.checkpoint || S.review || stageUnits(u.stage).filter(x => x !== u).every(isDone));
const nextUnit = () => units().find(u => !isDone(u));
const sessionUnlocked = () => S.review || (stageComplete(0) && stageComplete(1) && stageComplete(2));
const minutesLeft = () => units().filter(u => !isDone(u)).reduce((a, u) => a + (u.minutes || 0), 0);
const pct = () => Math.round(units().filter(isDone).length / units().length * 100);
const allDone = () => units().every(isDone);
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`;
const form = id => (S.forms[id] = S.forms[id] || {});
const formComplete = id => C.FORMS[id].fields.filter(f => f.required).every(f => String(form(id)[f.id] || '').trim());
const uHash = u => '#u-' + u.id.replace('.', '-');
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function shuffled(arr, seed) { /* stable shuffle so answer order differs per question but not per visit */
  const a = arr.map((v, i) => i); let h = hashStr(seed);
  for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* A unit is a run of screens. */
function screensFor(u) {
  const s = [{ k: 'intro', g: 'learn' }];
  (u.learn || []).forEach(l => s.push({ k: 'learn', g: 'learn', l }));
  if (u.keyPoints) s.push({ k: 'keys', g: 'learn' });
  if (u.try) s.push({ k: 'try', g: 'try' });
  (u.check || []).forEach(c => {
    if (c.kind === 'quiz') c.items.forEach((it, i) => s.push({ k: 'quiz', g: 'check', c, i, it, n: c.items.length }));
    else s.push({ k: c.kind, g: 'check', c });
  });
  if (u.note) s.push({ k: 'note', g: 'note' });
  s.push({ k: 'done', g: 'done' });
  return s;
}
function screenOK(u, sc) {
  if (S.review) return true;
  switch (sc.k) {
    case 'quiz': { const a = (S.quiz[u.id] || {})[sc.i]; return a != null && !!(sc.it.options[a] || {}).correct; }
    case 'scenario': return !!S.flags[u.id + ':sc'];
    case 'order': return !!S.flags[u.id + ':order'];
    case 'form': return formComplete(sc.c.form);
    case 'confirm': return !!S.confirms[u.id];
    case 'ready': return sc.c.requires.every(formComplete);
    default: return true;
  }
}
const checkSatisfied = u => screensFor(u).every(sc => screenOK(u, sc));
function actLit() {
  const lit = {}; Object.keys(C.ACT).forEach(k => lit[k] = 0);
  units().filter(isDone).forEach(u => (u.act || []).forEach(a => lit[a]++));
  return lit;
}

/* ---------- icons ---------- */
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  lock: svg('<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>'),
  arrow: svg('<path d="M5 12h13M13 6l6 6-6 6"/>'),
  back: svg('<path d="M19 12H6M11 6l-6 6 6 6"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  path: svg('<circle cx="6" cy="18" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="18" cy="5" r="2"/><path d="M7.3 16.4l3.4-4.8M13.6 8.8l3-2.6"/>'),
  session: svg('<path d="M12 3l2.2 5.6 6 .5-4.6 3.9 1.5 5.9L12 15.7 6.9 18.9l1.5-5.9L3.8 9.1l6-.5z"/>'),
  plan: svg('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/>'),
  library: svg('<path d="M4 5.5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>'),
  moon: svg('<path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l1.9 7.1L21 12l-7.1 2.9L12 22l-1.9-7.1L3 12l7.1-2.9z"/></svg>'
};

/* ---------- stage art ---------- */
function pic(stage, { lazy = true, sizes = '(max-width: 960px) 100vw, 960px' } = {}) {
  const b = 'assets/wilds/' + (C.STAGES[stage] || C.STAGES[0]).art;
  return `<img src="${b}-960.webp" srcset="${b}-960.webp 960w, ${b}.webp 1600w" sizes="${sizes}" width="1600" height="900" alt="" decoding="async" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}>`;
}

/* ---------- shell ---------- */
const NAVS = [['#path', 'Path', 'path'], ['#session', 'Session', 'session'], ['#plan', 'My plan', 'plan'], ['#library', 'Library', 'library']];
function navLinks(route) {
  return NAVS.map(([h, l, ico]) => {
    const locked = h === '#session' && !sessionUnlocked();
    const active = h === '#path' ? (route === 'path' || route === 'stage') : route === h.slice(1) || (h === '#session' && route === 'run');
    return `<a href="${h}" class="${active ? 'active' : ''}${locked ? ' locked' : ''}" ${active ? 'aria-current="page"' : ''}>${locked ? I.lock : I[ico]}<span>${l}</span></a>`;
  }).join('');
}
function shell(main, route, { bare = false } = {}) {
  return `
    <a class="skip" href="#main" data-act="skip">Skip to content</a>
    <header class="top">
      <div class="top-in">
        <a class="brand" href="#path"><span class="brand-mark">${I.star}</span><span class="brand-t"><strong>Astronomy for Mental Health</strong><small>Facilitator course</small></span></a>
        ${S.track && !bare ? `<nav class="nav nav-top" aria-label="Main">${navLinks(route)}</nav>` : '<span class="grow"></span>'}
        <button class="night-toggle" data-act="night" aria-pressed="${!!S.night}" title="Red night view protects dark adaptation">${I.moon}<span>${S.night ? 'Normal view' : 'Red night view'}</span></button>
      </div>
    </header>
    <main id="main" tabindex="-1" class="${bare ? 'bare' : ''}">${main}</main>
    ${S.track && !bare ? `<nav class="nav nav-bottom" aria-label="Main">${navLinks(route)}</nav>` : ''}
    <footer class="foot"><p>IAU Office of Astronomy for Development · Astronomy for Mental Health. Your progress and notes are stored only in this browser. This course trains reflective facilitation; it is not clinical training.</p></footer>`;
}

/* ---------- widgets: markup comes from wHTML, behaviour is wired in mountWidgets ---------- */
let WREG = [];
function widget(name, data) { WREG.push({ name, data }); return `<div class="w w-${name}" data-wi="${WREG.length - 1}"></div>`; }

function hexaflex({ interactive = false } = {}) {
  const lit = actLit(); const keys = Object.keys(C.ACT);
  const cx = 170, cy = 150, r = 96;
  const pts = keys.map((k, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const n = keys.filter(k => lit[k]).length;
  return `<figure class="hex ${interactive ? 'hex-live' : ''}">
    <svg viewBox="0 0 340 300" role="${interactive ? 'group' : 'img'}" aria-label="ACT map: ${n} of 6 processes practised so far">
      <polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" class="hex-edge"/>
      ${pts.map(p => `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" class="hex-spoke"/>`).join('')}
      <text x="${cx}" y="${cy - 4}" class="hex-core-t">psychological</text><text x="${cx}" y="${cy + 10}" class="hex-core-t">flexibility</text>
      ${keys.map((k, i) => { const [x, y] = pts[i]; const ly = i === 0 ? y - 24 : y + 34;
        return `<g class="hex-node ${lit[k] ? 'lit' : ''}" data-hex="${k}" ${interactive ? `role="button" tabindex="0" aria-label="${esc(C.ACT[k].label)}"` : ''}>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="17"/>
          ${lit[k] ? `<path d="M${(x - 6).toFixed(1)} ${(y + .5).toFixed(1)}l4 4 8-8.5" class="hex-tick"/>` : ''}
          <text x="${x.toFixed(1)}" y="${ly.toFixed(1)}" class="hex-label">${esc(C.ACT[k].label)}</text></g>`; }).join('')}
    </svg>
    ${interactive ? `<div class="hex-detail" aria-live="polite"><p class="muted">Tap a point on the map.</p></div><p class="small muted hex-count">Explored <b>0</b> of 6</p>`
      : `<figcaption class="small muted">${n} of 6 processes practised so far. Each lights up as you complete units that train it.</figcaption>`}
  </figure>`;
}

function ringSVG() { return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="326.7" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>`; }
const mmss = s => `${Math.floor(s / 60)}:${String(Math.ceil(s) % 60).padStart(2, '0')}`;

let audioCtx;
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [528, 792].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + i * 0.18;
      o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + 2.3);
    });
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
  } catch (e) { /* sound is optional */ }
}
let timers = [];
const clearTimers = () => { timers.forEach(t => { clearInterval(t); cancelAnimationFrame(t); }); timers = []; };

const WIDGETS = {
  /* sort: one item at a time into 2 or 3 bins */
  sort(el, d) {
    let i = 0, firstTry = 0, missed = false;
    const draw = () => {
      if (i >= d.items.length) {
        el.innerHTML = `<div class="w-end"><p class="w-score"><b>${firstTry} of ${d.items.length}</b> first time.</p><button class="btn btn-ghost btn-sm" data-again>Go again</button></div>`;
        $('[data-again]', el).onclick = () => { i = 0; firstTry = 0; draw(); }; return;
      }
      const it = d.items[i]; missed = false;
      el.innerHTML = `<p class="w-count">${i + 1} of ${d.items.length}</p><p class="w-item">${esc(it.t)}</p>
        <div class="bins bins-${d.bins.length}">${d.bins.map(([id, label]) => `<button class="bin" data-bin="${id}">${esc(label)}</button>`).join('')}</div>
        <p class="feedback" aria-live="polite"></p>`;
      $$('.bin', el).forEach(b => b.onclick = () => {
        const fb = $('.feedback', el);
        if (b.dataset.bin === it.bin) {
          if (!missed) firstTry++;
          b.classList.add('right'); $$('.bin', el).forEach(x => x.disabled = true);
          fb.innerHTML = `<b>Yes.</b> ${esc(it.why)} <button class="btn btn-sm btn-secondary" data-next>${i + 1 < d.items.length ? 'Next' : 'See score'}</button>`;
          const nx = $('[data-next]', el); nx.onclick = () => { i++; draw(); }; nx.focus();
        } else { missed = true; b.classList.add('wrong'); b.disabled = true; fb.innerHTML = '<b>Not that one.</b> Look again.'; }
      });
    };
    draw();
  },
  /* window of tolerance: three tappable bands */
  window(el, d) {
    el.innerHTML = `<div class="bands">${d.bands.map(b => `<button class="band band-${b.id}" data-band="${b.id}" aria-expanded="false"><span class="band-name">${esc(b.name)}</span><span class="band-tech">${esc(b.tech)}</span></button>`).join('')}</div><div class="band-detail" aria-live="polite"><p class="muted">Tap a band.</p></div>`;
    $$('.band', el).forEach(b => b.onclick = () => {
      const x = d.bands.find(v => v.id === b.dataset.band);
      $$('.band', el).forEach(o => { o.classList.toggle('on', o === b); o.setAttribute('aria-expanded', o === b); });
      $('.band-detail', el).innerHTML = `<p><b>What you see:</b> ${esc(x.signs)}</p><p><b>What you do:</b> ${esc(x.you)}</p>`;
    });
  },
  /* spot: tap everything risky, then check */
  spot(el, d) {
    const draw = () => {
      el.innerHTML = `<ul class="spot">${d.items.map((it, i) => `<li><button class="spot-i" data-i="${i}" aria-pressed="false">${esc(it.t)}</button><p class="spot-why" hidden></p></li>`).join('')}</ul>
        <div class="w-actions"><button class="btn btn-secondary btn-sm" data-check>Check my picks</button><span class="w-score" aria-live="polite"></span></div>`;
      $$('.spot-i', el).forEach(b => b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'));
      $('[data-check]', el).onclick = e => {
        let ok = 0;
        $$('.spot-i', el).forEach(b => {
          const it = d.items[+b.dataset.i], picked = b.getAttribute('aria-pressed') === 'true', good = picked === !!it.risk; if (good) ok++;
          b.disabled = true; b.classList.add(it.risk ? 'is-risk' : 'is-safe', good ? 'good' : 'miss');
          const w = b.nextElementSibling; w.hidden = false;
          w.innerHTML = `<b>${it.risk ? (picked ? 'Risk, well spotted.' : 'Missed: this is a risk.') : (picked ? 'This one is fine.' : 'Safe.')}</b> ${esc(it.why)}`;
        });
        $('.w-score', el).innerHTML = `<b>${ok} of ${d.items.length}</b> read correctly.`;
        e.target.textContent = 'Reset'; e.target.onclick = draw;
      };
    };
    draw();
  },
  /* guests: flip to see what you could not have known */
  guests(el, d) {
    let seen = 0;
    el.innerHTML = `<div class="guests">${d.guests.map((g, i) => `<button class="guest" data-i="${i}" aria-expanded="false"><span class="guest-out"><span class="guest-k">What you see</span>${esc(g.out)}</span><span class="guest-in" hidden><span class="guest-k">Tonight: ${esc(g.zone)}</span>${esc(g.inn)}</span><span class="guest-tap">Tap to turn over</span></button>`).join('')}</div><p class="w-after" hidden>${esc(d.after)}</p>`;
    $$('.guest', el).forEach(b => b.onclick = () => {
      if (b.classList.contains('open')) return;
      b.classList.add('open'); b.setAttribute('aria-expanded', 'true'); $('.guest-in', b).hidden = false; $('.guest-tap', b).hidden = true;
      if (++seen === d.guests.length) $('.w-after', el).hidden = false;
    });
  },
  hex(el) {
    const seen = new Set();
    el.innerHTML = hexaflex({ interactive: true });
    const pick = k => {
      const a = C.ACT[k]; seen.add(k);
      $$('.hex-node', el).forEach(n => { n.classList.toggle('on', n.dataset.hex === k); if (seen.has(n.dataset.hex)) n.classList.add('seen'); });
      $('.hex-detail', el).innerHTML = `<h3>${esc(a.label)} <span class="muted">(${esc(a.short)})</span></h3><p>${esc(a.plain)}</p><dl class="mini"><dt>Everyday</dt><dd>${esc(a.example)}</dd><dt>Under the sky</dt><dd>${esc(a.sky)}</dd></dl>`;
      $('.hex-count b', el).textContent = seen.size;
    };
    $$('.hex-node', el).forEach(n => { n.onclick = () => pick(n.dataset.hex); n.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(n.dataset.hex); } }; });
  },
  /* defusion: the thought is never stored */
  defuse(el) {
    const STEPS = [
      ['Here is the thought, the way it usually arrives: as the plain truth.', 'Add “I am having the thought that…”'],
      ['Same words. Now it is something you are having, not something you are.', 'Put it in a silly font'],
      ['Still the same words. Harder to take quite so seriously.', 'Place it in the sky'],
      ['One faint point of light among many. The thought is still there. What changed: the thought, or your distance from it?', null]
    ];
    let step = -1, thought = '';
    const draw = () => {
      if (step < 0) {
        el.innerHTML = `<label class="field"><span>A mild, recurring thought <span class="muted small">(never saved, gone when you leave this screen)</span></span><input id="defuse-thought" maxlength="80" placeholder="I am running late" autocomplete="off"></label>
          <div class="w-actions"><button class="btn btn-secondary btn-sm" data-go>Use this thought</button><button class="btn btn-ghost btn-sm" data-eg>Use the example</button></div>`;
        const start = v => { thought = (v || '').trim() || 'I am running late'; step = 0; draw(); };
        $('[data-go]', el).onclick = () => start($('input', el).value); $('[data-eg]', el).onclick = () => start('');
        $('input', el).onkeydown = e => { if (e.key === 'Enter') start(e.target.value); };
        return;
      }
      const low = thought.charAt(0).toLowerCase() + thought.slice(1);
      const text = step === 0 ? esc(thought) : `<span class="df-pre">I am having the thought that</span> ${esc(/^I\b/.test(thought) ? thought : low)}`;
      el.innerHTML = `<div class="df-stage df-${step}"><div class="df-stars" aria-hidden="true"></div><p class="df-thought">${text}</p></div>
        <p class="df-say" aria-live="polite">${esc(STEPS[step][0])}</p>
        <div class="w-actions">${STEPS[step][1] ? `<button class="btn btn-secondary btn-sm" data-n>${esc(STEPS[step][1])}</button>` : ''}<button class="btn btn-ghost btn-sm" data-r>Start again</button></div>`;
      const n = $('[data-n]', el); if (n) n.onclick = () => { step++; draw(); };
      $('[data-r]', el).onclick = () => { step = -1; thought = ''; draw(); };
    };
    draw();
  },
  /* quiet timer */
  quiet(el, d) {
    const total = d.secs || 120; let left = total, t = null, end = 0, lock = null;
    el.innerHTML = `${d.label ? `<p class="w-label">${esc(d.label)}</p>` : ''}<div class="quiet"><div class="quiet-dial">${ringSVG()}<span class="quiet-t" role="timer">${mmss(total)}</span></div>
      <div class="w-actions"><button class="btn btn-secondary" data-go>Start</button><button class="btn btn-ghost btn-sm" data-r>Reset</button></div><p class="small muted quiet-msg" aria-live="polite"></p></div>`;
    const fg = $('.ring-fg', el), tx = $('.quiet-t', el), go = $('[data-go]', el), msg = $('.quiet-msg', el);
    const paint = () => { tx.textContent = mmss(left); fg.setAttribute('stroke-dashoffset', (326.7 * (1 - left / total)).toFixed(1)); };
    const stop = () => { clearInterval(t); t = null; go.textContent = left <= 0 ? 'Again' : 'Resume'; if (lock) { try { lock.release(); } catch (e) {} lock = null; } };
    const tick = () => { left = Math.max(0, (end - Date.now()) / 1000); paint(); if (left <= 0) { stop(); chime(); msg.textContent = 'Time. Notice how you feel before you move on.'; } };
    go.onclick = () => {
      if (t) { stop(); return; }
      if (left <= 0) left = total;
      try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume(); } catch (e) {}
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => lock = l).catch(() => {});
      end = Date.now() + left * 1000; msg.textContent = ''; go.textContent = 'Pause'; t = setInterval(tick, 250); timers.push(t);
    };
    $('[data-r]', el).onclick = () => { stop(); left = total; go.textContent = 'Start'; msg.textContent = ''; paint(); };
  },
  /* ten-second silence: estimate it with no clock */
  silence(el) {
    let t0 = 0; const tries = [];
    const verdict = s => s < 8 ? 'Shorter than it felt. That gap is the nerves talking.' : s <= 12.5 ? 'That is the pause. Remember what it felt like in your body.' : 'Longer than ten. Better long than short, as long as you told the group a pause was coming.';
    const draw = () => {
      el.innerHTML = `<p class="w-label">Ask your reflection question out loud. Tap the moment you stop speaking. Tap again when you believe <b>ten seconds</b> have passed. There is no clock.</p>
        <button class="hold" data-hold><span class="hold-star">${I.star}</span><span class="hold-t">I have stopped speaking</span></button>
        <div class="hold-out" aria-live="polite">${tries.length ? `<p class="hold-res"><b>${tries[0].toFixed(1)} s</b></p><p>${verdict(tries[0])}</p>${tries.length > 1 ? `<p class="small muted">Earlier: ${tries.slice(1, 4).map(v => v.toFixed(1) + ' s').join(', ')}</p>` : ''}` : ''}</div>`;
      const b = $('[data-hold]', el);
      b.onclick = () => {
        if (!t0) { t0 = performance.now(); b.classList.add('on'); $('.hold-t', b).textContent = 'Now I would speak'; $('.hold-out', el).innerHTML = '<p class="muted">Hold the silence…</p>'; }
        else { tries.unshift((performance.now() - t0) / 1000); t0 = 0; draw(); $('[data-hold]', el).focus(); }
      };
    };
    draw();
  },
  /* rehearse a phrase aloud while the cue words fade */
  rehearse(el, d) {
    const words = d.phrase.split(' '); const order = shuffled(words, d.phrase); let rep = 0, peek = false;
    const draw = () => {
      const done = rep >= d.reps; const hideN = done ? 0 : Math.round(words.length * (d.reps > 1 ? rep / (d.reps - 1) : 0));
      const hidden = new Set(peek ? [] : order.slice(0, hideN));
      el.innerHTML = `<p class="w-count">${done ? 'Done' : `Time ${rep + 1} of ${d.reps}`} <span class="dots">${Array.from({ length: d.reps }, (v, i) => `<i class="${i < rep ? 'on' : ''}"></i>`).join('')}</span></p>
        <blockquote class="script">${words.map((w, i) => hidden.has(i) ? `<span class="gap" aria-label="hidden word">${'·'.repeat(Math.min(w.length, 6))}</span>` : esc(w)).join(' ')}</blockquote>
        <div class="w-actions">${done ? `<span class="w-score"><b>From memory.</b> It is in Session mode if you ever need it.</span><button class="btn btn-ghost btn-sm" data-r>Again</button>`
          : `<button class="btn btn-secondary btn-sm" data-n>I said it aloud</button>${hideN ? `<button class="btn btn-ghost btn-sm" data-p>${peek ? 'Hide' : 'Peek'}</button>` : ''}`}</div>`;
      const n = $('[data-n]', el); if (n) n.onclick = () => { rep++; peek = false; draw(); const f = $('[data-n],[data-r]', el); f && f.focus(); };
      const p = $('[data-p]', el); if (p) p.onclick = () => { peek = !peek; draw(); };
      const r = $('[data-r]', el); if (r) r.onclick = () => { rep = 0; draw(); };
    };
    draw();
  },
  /* flag outcome-promising words in a listing */
  flag(el, d) {
    const parts = d.listing.split(/(\{[^}]+\})/).filter(Boolean); const chunks = [];
    parts.forEach(p => {
      if (p[0] === '{') chunks.push({ t: p.slice(1, -1), bad: true });
      else p.trim().split(/(?<=[,.])\s+/).forEach(seg => { const w = seg.split(' '); for (let i = 0; i < w.length; i += 4) chunks.push({ t: w.slice(i, i + 4).join(' '), bad: false }); });
    });
    const draw = () => {
      el.innerHTML = `<p class="listing">${chunks.map((c, i) => `<button class="chunk" data-i="${i}" aria-pressed="false">${esc(c.t)}</button>`).join(' ')}</p>
        <div class="w-actions"><button class="btn btn-secondary btn-sm" data-check>Check</button><span class="w-score" aria-live="polite"></span></div><div class="flag-out" hidden><p class="w-count">One honest version</p><p class="listing-clean">${esc(d.rewrite)}</p></div>`;
      $$('.chunk', el).forEach(b => b.onclick = () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'));
      $('[data-check]', el).onclick = e => {
        let found = 0, extra = 0; const bad = chunks.filter(c => c.bad).length;
        $$('.chunk', el).forEach(b => { const c = chunks[+b.dataset.i], on = b.getAttribute('aria-pressed') === 'true'; b.disabled = true;
          if (c.bad) { b.classList.add(on ? 'good' : 'miss'); if (on) found++; } else if (on) { b.classList.add('extra'); extra++; } });
        $('.w-score', el).innerHTML = `<b>${found} of ${bad}</b> promises found${extra ? `, ${extra} harmless phrase${extra > 1 ? 's' : ''} flagged` : ''}. Outlined phrases are the ones that promise an outcome.`;
        $('.flag-out', el).hidden = false; e.target.textContent = 'Reset'; e.target.onclick = draw;
      };
    };
    draw();
  },
  /* walk through steps one at a time */
  walk(el, d) {
    let i = 0;
    const draw = () => {
      const end = i >= d.steps.length;
      el.innerHTML = end ? `<ol class="steps">${d.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><div class="w-actions"><button class="btn btn-ghost btn-sm" data-r>Walk through again</button></div>`
        : `<p class="w-count">Step ${i + 1} of ${d.steps.length} <span class="dots">${d.steps.map((s, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</span></p><p class="walk-step">${esc(d.steps[i])}</p>
           <div class="w-actions">${i ? '<button class="btn btn-ghost btn-sm" data-b>Back</button>' : ''}<button class="btn btn-secondary btn-sm" data-n>${i + 1 < d.steps.length ? 'Next step' : 'See all steps'}</button></div>`;
      const n = $('[data-n]', el); if (n) n.onclick = () => { i++; draw(); const f = $('[data-n],[data-r]', el); f && f.focus(); };
      const b = $('[data-b]', el); if (b) b.onclick = () => { i--; draw(); };
      const r = $('[data-r]', el); if (r) r.onclick = () => { i = 0; draw(); };
    };
    draw();
  },
  /* branching scenario (a check: must reach the end) */
  scenario(el, d) {
    const u = d.u, sc = d.c; const ids = Object.keys(sc.nodes).filter(k => k !== 'end'); let cur = S.flags[u.id + ':sc'] ? 'end' : sc.start; const tried = {};
    const draw = () => {
      const n = sc.nodes[cur];
      if (cur === 'end') {
        el.innerHTML = `<div class="sc-end"><p class="w-count">${I.check} Scenario complete</p><p>${esc(n.text)}</p><button class="btn btn-ghost btn-sm" data-r>Play it again</button></div>`;
        $('[data-r]', el).onclick = () => { cur = sc.start; Object.keys(tried).forEach(k => delete tried[k]); draw(); }; return;
      }
      const order = shuffled(n.options, u.id + cur); tried[cur] = tried[cur] || new Set();
      el.innerHTML = `<p class="w-count">Moment ${ids.indexOf(cur) + 1} of ${ids.length}</p><p class="sc-text">${esc(n.text)}</p>
        <div class="opts">${order.map(j => `<button class="opt ${tried[cur].has(j) ? 'wrong' : ''}" data-j="${j}" ${tried[cur].has(j) ? 'disabled' : ''}>${esc(n.options[j].t)}</button>`).join('')}</div><p class="feedback" aria-live="polite"></p>`;
      $$('.opt', el).forEach(b => b.onclick = () => {
        const o = n.options[+b.dataset.j];
        if (o.to) { cur = o.to; if (cur === 'end') { S.flags[u.id + ':sc'] = true; save(); updateGate(); } draw(); el.scrollIntoView({ block: 'nearest' }); }
        else { tried[cur].add(+b.dataset.j); b.classList.add('wrong'); b.disabled = true; $('.feedback', el).innerHTML = `<b>What happens:</b> ${esc(o.back)} <span class="muted">Choose a different move.</span>`; }
      });
    };
    draw();
  },
  /* put items in order (a check) */
  order(el, d) {
    const u = d.u, c = d.c; const show = shuffled(c.items, u.id + 'order').map(i => c.items[i]); let picked = S.flags[u.id + ':order'] ? c.items.slice() : [];
    const draw = (msg = '') => {
      const solved = !!S.flags[u.id + ':order'];
      el.innerHTML = `<p class="w-label">${esc(c.title)}. Tap them first to last.</p>
        <div class="order">${(solved ? c.items : show).map(id => { const p = picked.indexOf(id); return `<button class="ord ${p >= 0 ? 'on' : ''}" data-id="${id}" ${solved ? 'disabled' : ''}><span class="ord-n">${p >= 0 ? p + 1 : ''}</span>${esc(C.CARDS[id].title)}</button>`; }).join('')}</div>
        <p class="feedback" aria-live="polite">${solved ? `<b>Yes.</b> ${esc(c.why)}` : msg}</p>${solved ? '' : '<div class="w-actions"><button class="btn btn-ghost btn-sm" data-r>Clear</button></div>'}`;
      $$('.ord', el).forEach(b => b.onclick = () => {
        const id = b.dataset.id, p = picked.indexOf(id); if (p >= 0) picked.splice(p, 1); else picked.push(id);
        if (picked.length === c.items.length) {
          if (picked.every((v, i) => v === c.items[i])) { S.flags[u.id + ':order'] = true; save(); updateGate(); draw(); }
          else { const ok = picked.filter((v, i) => v === c.items[i]).length; picked = []; draw(`<b>Not quite.</b> ${ok} of ${c.items.length} were in the right place. Hint: arrive first, values last.`); }
        } else draw();
      });
      const r = $('[data-r]', el); if (r) r.onclick = () => { picked = []; draw(); };
    };
    draw();
  }
};
function mountWidgets() { $$('[data-wi]').forEach(el => { const w = WREG[+el.dataset.wi]; if (w && WIDGETS[w.name]) WIDGETS[w.name](el, w.data); }); }

/* ---------- forms and quiz ---------- */
function fieldHTML(fid, f) {
  const v = esc(form(fid)[f.id] || ''); const id = `f-${fid}-${f.id}`;
  const req = f.required ? '<span class="req" aria-hidden="true">*</span>' : '';
  if (f.type === 'scale') return `<fieldset class="field scale"><legend>${esc(f.label)} ${req}</legend><div>${[1, 2, 3, 4, 5].map(i => `<label><input type="radio" id="${id}-${i}" name="${id}" value="${i}" data-form="${fid}" data-field="${f.id}" ${String(form(fid)[f.id]) === String(i) ? 'checked' : ''}><span>${i}</span></label>`).join('')}</div></fieldset>`;
  const tag = f.type === 'textarea'
    ? `<textarea id="${id}" data-form="${fid}" data-field="${f.id}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'aria-required="true"' : ''}>${v}</textarea>`
    : `<input id="${id}" data-form="${fid}" data-field="${f.id}" value="${v}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'aria-required="true"' : ''}>`;
  return `<div class="field"><label for="${id}">${esc(f.label)} ${req}</label>${tag}</div>`;
}
function formHTML(fid) {
  const F = C.FORMS[fid];
  return `<div class="form-block">${F.workbook ? `<p class="small muted">Same as workbook ${esc(F.workbook)}.</p>` : ''}${F.fields.map(f => fieldHTML(fid, f)).join('')}
    <p class="small muted"><span class="req">*</span> needed to complete this step. Saved on this device as you type.</p></div>`;
}
const TRIED = {}; /* wrong answers tried this visit stay crossed out */
function quizHTML(uid, i, it, label) {
  const a = (S.quiz[uid] || {})[i]; const order = shuffled(it.options, uid + ':' + i); const solved = a != null && it.options[a] && it.options[a].correct;
  return `<fieldset class="quiz"><legend><span class="eyebrow">${esc(label)}</span>${esc(it.q)}</legend>
    <div class="opts">${order.map(j => { const o = it.options[j]; const was = !o.correct && (a === j || (TRIED[uid + ':' + i] || []).includes(j)); return `<button class="opt ${a === j && o.correct ? 'right' : was ? 'wrong' : ''}" data-act="quiz" data-u="${uid}" data-item="${i}" data-opt="${j}" aria-pressed="${a === j}" ${was || solved ? 'disabled' : ''}>${esc(o.t)}</button>`; }).join('')}</div>
    <p class="feedback" aria-live="polite">${a != null && it.options[a] ? `<b>${solved ? 'Yes.' : 'Not quite.'}</b> ${esc(it.options[a].why)}${solved ? '' : ' Try another.'}` : ''}</p></fieldset>`;
}
const scriptHTML = t => `<blockquote class="script"><span class="eyebrow">Say something like</span>${esc(t)}</blockquote>`;

/* ---------- pages ---------- */
function welcome() {
  const core = C.UNITS.filter(u => !u.track).reduce((a, u) => a + u.minutes, 0);
  return shell(`
    <section class="hero">
      <div class="hero-art">${pic(0, { lazy: false, sizes: '100vw' })}</div>
      <div class="hero-copy">
        <p class="eyebrow">A self-guided facilitator course</p>
        <h1>Look up.<span>Learn to guide safe, sky-based reflection.</span></h1>
        <p class="lede">For people who know the sky and want to use it to support wellbeing. Built on ACT (Acceptance and Commitment Therapy) and trauma-informed practice.</p>
      </div>
    </section>
    <section class="facts" aria-label="At a glance">
      <div><b>${fmtMin(core)}</b><span>in ${C.UNITS.filter(u => !u.track).length} short units</span></div>
      <div><b>5</b><span>sky activities you can run</span></div>
      <div><b>Out loud</b><span>you practise, not just read</span></div>
      <div><b>Private</b><span>nothing leaves this device</span></div>
    </section>
    <section class="block">
      <h2>What you will be able to do</h2>
      <ul class="outcomes">
        <li><b>Hold the line.</b> Say what this is and is not, and hand someone on to proper support without flinching.</li>
        <li><b>Keep a group steady.</b> Read the window of tolerance and bring people back to the ground when a moment turns heavy.</li>
        <li><b>Run a session.</b> Open with three steps, guide five activities, and leave the silence alone.</li>
      </ul>
    </section>
    <section class="block">
      <h2>Choose your track</h2>
      <p class="muted">You can switch at any time and keep your progress.</p>
      <div class="tracks">${Object.entries(C.TRACKS).map(([k, t]) => `
        <button class="track" data-act="track" data-track="${k}"><b>${esc(t.label)}</b><span>${esc(t.text)}</span><span class="track-go">Start ${I.arrow}</span></button>`).join('')}</div>
      <p class="muted small">Coming from the in-person training day? Choose Astro-tourism guide. The forms here match the pages of your workbook, so you can copy your self-care plan and session design straight in.</p>
    </section>`, 'welcome', { bare: true });
}

function recallCard() {
  const pool = []; units().filter(isDone).forEach(u => (u.check || []).forEach(c => c.kind === 'quiz' && c.items.forEach(it => pool.push(it))));
  if (pool.length < 3) return '';
  const it = pool[Math.floor(Date.now() / 864e5) % pool.length]; WREG.push({ name: 'recall', data: it });
  return `<section class="recall" data-wi="${WREG.length - 1}"></section>`;
}
WIDGETS.recall = (el, it) => {
  const order = shuffled(it.options, it.q);
  el.innerHTML = `<p class="eyebrow">Quick recall · from a unit you finished</p><p class="recall-q">${esc(it.q)}</p><div class="opts">${order.map(j => `<button class="opt" data-j="${j}">${esc(it.options[j].t)}</button>`).join('')}</div><p class="feedback" aria-live="polite"></p>`;
  $$('.opt', el).forEach(b => b.onclick = () => { const o = it.options[+b.dataset.j]; b.classList.add(o.correct ? 'right' : 'wrong'); $('.feedback', el).innerHTML = `<b>${o.correct ? 'Yes.' : 'Not quite.'}</b> ${esc(o.why)}`; if (o.correct) $$('.opt', el).forEach(x => x.disabled = true); });
};

function home() {
  const n = nextUnit(); const done = allDone(); const p = pct();
  const stages = C.STAGES.map(s => {
    const us = stageUnits(s.id); const unlocked = stageUnlocked(s.id); const complete = stageComplete(s.id); const current = n && n.stage === s.id;
    return `<li class="stage ${complete ? 'complete' : ''} ${current ? 'current' : ''} ${unlocked ? '' : 'locked'}">
      <div class="stage-head">${pic(s.id)}<div class="stage-ht"><span class="stage-k">Stage ${s.id}${complete ? ' · complete' : !unlocked ? ' · locked' : ''}</span><h3>${esc(s.title)}</h3></div>
        <span class="stage-meta">${unlocked ? `${us.filter(isDone).length}/${us.length} · ${fmtMin(us.reduce((a, u) => a + (u.minutes || 0), 0))}` : I.lock}</span></div>
      <p class="stage-blurb">${esc(s.blurb)}${unlocked ? '' : ` <span class="muted">Opens after Stage ${s.id - 1}.</span>`}</p>
      ${unlocked ? `<ol class="units">${us.map(u => {
        const ok = unitUnlocked(u); const st = isDone(u) ? 'done' : (n && n.id === u.id) ? 'now' : ok ? 'open' : 'lock';
        const inner = `<span class="u-star ${st}">${st === 'done' ? I.check : st === 'lock' ? I.lock : ''}</span><span class="u-main"><span class="u-title">${esc(u.title)}</span><span class="u-sub">${esc(u.id)} · ${u.minutes} min${u.track === 'tourism' ? ' · tourism' : ''}${u.checkpoint ? ' · checkpoint' : ''}${st === 'now' ? ' · <b>you are here</b>' : ''}</span></span>`;
        return `<li>${ok ? `<a class="unit-row ${st}" href="${uHash(u)}">${inner}${I.arrow}</a>` : `<span class="unit-row lock">${inner}</span>`}</li>`;
      }).join('')}</ol>` : ''}
    </li>`;
  }).join('');
  return shell(`
    <div class="home-grid">
      <section class="home-main">
        ${done ? `<div class="next done-panel"><p class="eyebrow">${I.check} Course complete</p><h1>You have completed the course.</h1><p>Keep Session mode handy for your next session, and export your plan from My plan.</p><a class="btn btn-primary" href="#record">View completion record</a></div>`
          : `<a class="next" href="${uHash(n)}"><span class="next-art">${pic(n.stage, { lazy: false })}</span><span class="next-copy"><span class="eyebrow">${units().some(isDone) ? 'Continue' : 'Begin'} · Stage ${n.stage} · ${esc(C.STAGES[n.stage].title)}</span><span class="next-title">${esc(n.title)}</span><span class="next-meta">${I.clock} ${n.minutes} min · ${fmtMin(minutesLeft())} left in the course</span><span class="btn btn-primary">${units().some(isDone) ? 'Continue' : 'Begin'} ${I.arrow}</span></span></a>
             <div class="meter" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="Course progress"><span style="width:${p}%"></span></div><p class="small muted meter-t">${p}% complete · ${esc(C.TRACKS[S.track].label)} track${S.review ? ' · review mode' : ''}</p>`}
        ${recallCard()}
        <h2 class="section-h">Your path</h2>
        <ol class="stages">${stages}</ol>
      </section>
      <aside class="side">
        <div class="panel"><h2 class="h3">Your ACT map</h2>${hexaflex()}</div>
        <div class="panel"><h2 class="h3">Session mode</h2>
          ${sessionUnlocked() ? `<p class="small">Activity cards, timers, pivot phrase and your contacts, ready to use during a session.</p><a class="btn btn-secondary" href="#session">Open Session mode</a>`
            : `<p class="small muted">Opens when you reach Stage 3, after Safety, so your contacts and pivot phrase are ready first.</p>`}
        </div>
      </aside>
    </div>`, 'path');
}

function unitView(id) {
  const u = unitById(id);
  if (!u || (u.track && u.track !== S.track)) return shell(`<div class="panel center"><h1>Unit not found</h1><a class="btn btn-primary" href="#path">Back to your path</a></div>`, 'path');
  if (!unitUnlocked(u)) {
    const why = !stageUnlocked(u.stage) ? `Finish Stage ${u.stage - 1} first.` : 'Finish the other units in this stage first.';
    return shell(`<div class="panel center"><p class="eyebrow">${I.lock} Locked</p><h1>${esc(u.title)}</h1><p>${why}</p><a class="btn btn-primary" href="#path">Back to your path</a></div>`, 'path');
  }
  const scr = screensFor(u); const last = scr.length - 1;
  let i = Math.min(Math.max(+S.pos[u.id] || 0, 0), last);
  if (scr[i].k === 'done' && !isDone(u) && !S.review) i = last - 1;
  const sc = scr[i]; const c = u.card && C.CARDS[u.card];
  let body = '';
  if (sc.k === 'intro') {
    const counts = { learn: scr.filter(x => x.g === 'learn').length - 1, try: u.try ? 1 : 0, check: scr.filter(x => x.g === 'check').length };
    body = `<div class="intro-art">${pic(u.stage, { lazy: false })}</div>
      <p class="eyebrow">Stage ${u.stage} · ${esc(C.STAGES[u.stage].title)} · ${esc(u.id)}${u.checkpoint ? ' · checkpoint' : ''}</p><h1>${esc(u.title)}</h1>
      <p class="lede">${esc(u.intro || '')}</p>
      <ul class="intro-meta"><li>${I.clock} ${u.minutes} min${c ? ` to learn · runs ${esc(c.time)}` : ''}</li>${counts.learn > 0 ? `<li>${counts.learn} to read</li>` : ''}${counts.try ? '<li>1 to try out loud</li>' : ''}${counts.check ? `<li>${counts.check} to check</li>` : ''}</ul>
      ${(u.act || []).length ? `<div class="chips">${u.act.map(a => `<span class="chip">ACT · ${esc(C.ACT[a].label)}</span>`).join('')}</div>` : ''}`;
  } else if (sc.k === 'learn') {
    const l = sc.l;
    body = `<h2 class="s-h">${esc(l.h)}</h2>${l.p ? `<p class="s-p">${esc(l.p)}</p>` : ''}
      ${l.list ? `<ul class="s-list ${l.warn ? 'warn' : ''}">${l.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${l.script ? scriptHTML(l.script) : ''}${l.w ? widget(l.w, l) : ''}`;
  } else if (sc.k === 'keys') {
    body = `<p class="eyebrow">Hold on to</p><ul class="keys">${u.keyPoints.map(k => `<li>${I.star}<span>${esc(k)}</span></li>`).join('')}</ul>`;
  } else if (sc.k === 'try') {
    const t = u.try;
    body = `<p class="eyebrow">Try it · out loud where you can</p><h2 class="s-h">${esc(t.title)}</h2>${t.text ? `<p class="s-p">${esc(t.text)}</p>` : ''}${t.steps ? `<ol class="steps">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}${t.w ? widget(t.w, t) : ''}`;
  } else if (sc.k === 'quiz') {
    body = quizHTML(u.id, sc.i, sc.it, sc.n > 1 ? `Scenario ${sc.i + 1} of ${sc.n}` : 'Check');
  } else if (sc.k === 'scenario') {
    body = `<p class="eyebrow">Check · you decide what happens</p><h2 class="s-h">${esc(sc.c.title)}</h2>${widget('scenario', { u, c: sc.c })}`;
  } else if (sc.k === 'order') {
    body = `<p class="eyebrow">Check</p>${widget('order', { u, c: sc.c })}`;
  } else if (sc.k === 'form') {
    body = `<p class="eyebrow">Check · yours to keep</p><h2 class="s-h">${esc(C.FORMS[sc.c.form].title)}</h2>${sc.c.intro ? `<p class="s-p">${esc(sc.c.intro)}</p>` : ''}${formHTML(sc.c.form)}`;
  } else if (sc.k === 'ready') {
    body = `<p class="eyebrow">Check</p><h2 class="s-h">Your safety layer</h2><ul class="ready">${sc.c.requires.map(f => `<li class="${formComplete(f) ? 'ok' : ''}">${formComplete(f) ? I.check : '<i></i>'}<span>${esc(C.FORMS[f].title)}</span>${formComplete(f) ? '' : `<a href="#plan">Complete in My plan</a>`}</li>`).join('')}</ul>`;
  } else if (sc.k === 'confirm') {
    body = `<p class="eyebrow">Check · on your honour</p><label class="confirm big"><input type="checkbox" id="confirm-${esc(u.id)}" data-confirm="${u.id}" ${S.confirms[u.id] ? 'checked' : ''}><span>${esc(sc.c.label)}</span></label>`;
  } else if (sc.k === 'note') {
    body = `<p class="eyebrow">Note · optional and private</p><div class="field"><label class="s-h" for="note-${esc(u.id)}">${esc(u.note)}</label><textarea id="note-${esc(u.id)}" data-note="${u.id}" rows="6">${esc(S.notes[u.id] || '')}</textarea></div><p class="small muted">Your notes collect in My plan.</p>`;
  } else if (sc.k === 'done') {
    const nx = nextUnit(); const stageJust = stageComplete(u.stage) && (!nx || nx.stage !== u.stage);
    body = `<div class="done-screen"><div class="done-star">${I.star}</div><p class="eyebrow">${S.review && !isDone(u) ? 'Review mode · not marked complete' : 'Unit complete'}</p><h1>${esc(u.title)}</h1>
      ${u.keyPoints ? `<ul class="keys small-keys">${u.keyPoints.map(k => `<li>${I.star}<span>${esc(k)}</span></li>`).join('')}</ul>` : ''}
      ${(u.act || []).length ? `<p class="muted">On your ACT map: ${u.act.map(a => `<b>${esc(C.ACT[a].label)}</b>`).join(', ')}.</p>` : ''}
      <div class="row center">${stageJust && isDone(u) ? `<a class="btn btn-primary" href="#stage-${u.stage}">Stage ${u.stage} complete ${I.arrow}</a>` : nx ? `<a class="btn btn-primary" href="${uHash(nx)}">Next: ${esc(nx.title)} ${I.arrow}</a>` : `<a class="btn btn-primary" href="#record">Completion record ${I.arrow}</a>`}<a class="btn btn-ghost" href="#path">Your path</a></div></div>`;
  }
  const free = isDone(u) || S.review;
  const segs = scr.slice(0, last).map((x, j) => `<button class="seg g-${x.g} ${j < i ? 'past' : j === i ? 'now' : ''}" data-act="seg" data-j="${j}" ${free || j <= i ? '' : 'disabled'} aria-label="Screen ${j + 1} of ${last}"></button>`).join('');
  const G = { learn: 'Learn', try: 'Try', check: 'Check', note: 'Note', done: 'Done' };
  const ok = screenOK(u, sc); const toDone = i === last - 1;
  const gateMsg = { quiz: 'Choose the best answer to continue.', scenario: 'Play the scenario through to continue.', order: 'Put all five in order to continue.', form: 'Complete the starred fields to continue.', ready: 'Complete both plans to continue.', confirm: 'Tick the box to continue.' }[sc.k] || '';
  return shell(`
    <article class="player" data-unit="${esc(u.id)}">
      <header class="player-top">
        <a class="player-x" href="#path" aria-label="Close unit and return to your path">${I.close}</a>
        <div class="player-prog"><div class="segs">${segs}</div><p class="player-where"><b>${G[sc.g]}</b>${sc.k !== 'done' ? ` · ${i + 1} of ${last}` : ''} <span class="muted">· ${esc(u.id)} ${esc(u.title)}</span></p></div>
      </header>
      <section class="screen k-${sc.k}" id="screen">${body}</section>
      ${sc.k === 'done' ? '' : `<footer class="player-nav">
        ${i > 0 ? `<button class="btn btn-ghost" data-act="prev">${I.back}<span>Back</span></button>` : '<span></span>'}
        <p class="gate-msg small muted" ${ok ? 'hidden' : ''}>${gateMsg}</p>
        <button class="btn btn-primary" data-act="next" ${ok ? '' : 'disabled'}>${toDone ? (isDone(u) ? 'Finish' : S.review ? 'Finish (review)' : 'Complete unit') : i === 0 ? 'Begin' : 'Next'} ${I.arrow}</button>
      </footer>`}
    </article>`, 'unit', { bare: true });
}

function stagePage(s) {
  if (!C.STAGES[s] || !stageComplete(s)) return home();
  const nextStage = C.STAGES[s + 1]; const n = nextUnit();
  return shell(`<div class="stage-done">
    <div class="stage-done-art">${pic(nextStage ? nextStage.id : 5, { lazy: false })}</div>
    <p class="eyebrow">${I.check} Stage ${s} complete</p>
    <h1>${esc(C.STAGES[s].title)}: done.</h1>
    ${nextStage ? `<p>Stage ${nextStage.id}, <b>${esc(nextStage.title)}</b>, is now open. ${esc(nextStage.blurb)}</p>` : '<p>That was the last stage.</p>'}
    ${s === 2 ? `<p class="box">Session mode is now open: activity cards, timers, pivot phrase and your contacts in one place for use during a session.</p>` : ''}
    ${hexaflex()}
    <div class="row center">${n ? `<a class="btn btn-primary" href="${uHash(n)}">Continue: ${esc(n.title)} ${I.arrow}</a>` : `<a class="btn btn-primary" href="#record">View completion record</a>`}<a class="btn btn-ghost" href="#path">Your path</a></div>
  </div>`, 'stage');
}

function cardDetail(c) {
  return `<ol class="steps">${c.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${scriptHTML(c.prompt)}
    <div class="two"><div class="box box-warn"><h4>Trauma-informed watch-fors</h4><ul>${c.trauma.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
    <div class="box"><h4>Indoor or cloudy version</h4><p>${esc(c.indoor)}</p><h4>Closing</h4><p>${esc(c.after)}</p></div></div>`;
}
function session() {
  if (!sessionUnlocked()) return shell(`<div class="panel center"><p class="eyebrow">${I.lock} Locked</p><h1>Session mode</h1><p>Session mode opens when you reach Stage 3. Finish Safety first so your contacts and pivot phrase are ready.</p><a class="btn btn-primary" href="#path">Back to your path</a></div>`, 'session');
  const ct = form('contacts'); const cl = S.checklist || [];
  return shell(`
    <div class="session">
      <h1>Session mode</h1>
      <p class="muted">Everything you need mid-session. Outdoors, turn on <b>Red night view</b> to protect dark adaptation.</p>
      <section class="pivot"><p class="eyebrow">If the weather turns heavy</p><p class="pivot-text">“${esc(C.PIVOT)}”</p>
        <ol class="pivot-steps"><li>Stay steady</li><li>Ground the group, eyes open</li><li>Offer space to everyone</li><li>Check in privately</li><li>Offer contacts</li><li>Tell your supervisor</li></ol></section>
      <section><h2 class="h3">Run an activity</h2><p class="small muted">Step-by-step view with large text, for use in the dark.</p>
        <div class="runs">${Object.entries(C.CARDS).map(([k, c], i) => `<a class="run-link" href="#run-${k}"><span class="run-n">${i + 1}</span><span><b>${esc(c.title)}</b><small>${esc(c.time)} · ${c.act.map(a => esc(C.ACT[a].label)).join(', ')}</small></span>${I.arrow}</a>`).join('')}</div></section>
      <section class="two tools">
        <div class="panel"><h2 class="h3">Quiet looking</h2>${widget('quiet', { secs: 150, label: 'Two and a half minutes. A soft chime ends it.' })}</div>
        <div class="panel"><h2 class="h3">Opening</h2><ol class="steps"><li><b>Arrive.</b> Ground, air, sounds, then the sky. Ten seconds of quiet first.</li><li><b>Hook.</b> One true image or fact. Then silence.</li><li><b>Reflect.</b> One question. Stop talking.</li></ol></div>
      </section>
      <section class="panel"><h2 class="h3">Your support contacts</h2>
        <dl class="contacts">${C.FORMS.contacts.fields.map(f => `<dt>${esc(f.label)}</dt><dd>${ct[f.id] ? esc(ct[f.id]) : '<span class="muted">Not filled in. Add it in My plan.</span>'}</dd>`).join('')}</dl>
        <p class="small muted">Hand-off: “${esc(C.HANDOFF)}”</p></section>
      <section class="panel"><h2 class="h3">Before you start</h2>
        ${C.CHECKLIST.map((t, i) => `<label class="confirm"><input type="checkbox" id="pre-${i}" data-check="${i}" ${cl[i] ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}
        <button class="btn btn-ghost btn-sm" data-act="clearcheck">Clear checklist</button></section>
      <section><h2 class="h3">Activity cards in full</h2>
        ${Object.values(C.CARDS).map(c => `<details class="card"><summary><span>${esc(c.title)}</span><small>${esc(c.time)}</small></summary><div class="card-in">${cardDetail(c)}</div></details>`).join('')}</section>
      <section class="panel"><h2 class="h3">Care boundaries</h2><dl class="bounds">${C.BOUNDARIES.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></section>
    </div>`, 'session');
}

let runPos = {};
function runView(k) {
  const c = C.CARDS[k]; if (!c || !sessionUnlocked()) return session();
  const steps = c.steps.concat(['Close: ' + c.after]); const i = Math.min(runPos[k] || 0, steps.length - 1);
  return shell(`<div class="run">
    <header class="run-top"><a class="player-x" href="#session" aria-label="Back to Session mode">${I.close}</a><div><b>${esc(c.title)}</b><p class="small muted">Step ${i + 1} of ${steps.length} · ${esc(c.time)}</p></div></header>
    <p class="run-step" aria-live="polite">${esc(steps[i])}</p>
    ${i === 0 ? `<p class="run-say">“${esc(c.prompt)}”</p>` : ''}
    <details class="run-more"><summary>Watch-fors</summary><ul>${c.trauma.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>
    <details class="run-more run-pivot"><summary>Pivot phrase</summary><p class="pivot-text">“${esc(C.PIVOT)}”</p></details>
    <footer class="player-nav"><button class="btn btn-ghost" data-act="runprev" data-k="${k}" ${i ? '' : 'disabled'}>${I.back}<span>Back</span></button><span></span>
      ${i + 1 < steps.length ? `<button class="btn btn-primary" data-act="runnext" data-k="${k}">Next step ${I.arrow}</button>` : `<a class="btn btn-primary" href="#session" data-act="runend" data-k="${k}">Finish</a>`}</footer>
  </div>`, 'run', { bare: true });
}

function planForms() { return ['scope', 'contacts', 'selfcare', ...(S.track === 'tourism' ? ['tourism'] : []), 'segment', 'mission', 'reflection']; }
let confirmReset = false, importErr = '';
function plan() {
  const notes = units().filter(u => S.notes[u.id]);
  return shell(`
    <h1>My plan</h1>
    <p class="muted">Everything you have written, in one place. Edit here or in the units. It stays in this browser until you export it.</p>
    ${storageOK ? '' : '<p class="box box-warn">This browser is blocking storage, so your work will be lost when you close the page. Copy or download your plan before you leave.</p>'}
    <div class="panel row wrap noprint">
      <button class="btn btn-primary" data-act="copy">Copy my plan</button>
      ${PREVIEW ? '' : `<button class="btn btn-secondary" data-act="export" data-kind="md">Download (.md)</button><button class="btn btn-ghost" data-act="print">Print</button><button class="btn btn-ghost" data-act="export" data-kind="json">Back up progress (.json)</button>`}
      <label class="btn btn-ghost" for="import-file">Restore backup<input type="file" id="import-file" accept="application/json,.json" data-import hidden></label>
      ${PREVIEW ? '<p class="small muted grow-full">Preview copy: downloading and printing work on the published course site.</p>' : ''}
      ${importErr ? `<p class="small bad grow-full">${esc(importErr)}</p>` : ''}
    </div>
    <div class="field panel"><label for="name">Your name (used on your completion record)</label><input id="name" data-name value="${esc(S.name)}" autocomplete="name"></div>
    ${planForms().map(f => `<details class="panel plan-form" ${formComplete(f) ? '' : 'open'}><summary><h2 class="h3">${esc(C.FORMS[f].title)}</h2><span class="${formComplete(f) ? 'ok' : 'muted'} small">${formComplete(f) ? 'complete' : 'to do'}</span></summary>${formHTML(f)}</details>`).join('')}
    <section class="panel"><h2 class="h3">Unit notes</h2>${notes.length ? notes.map(u => `<p><b>${esc(u.id)} ${esc(u.title)}</b><br>${esc(S.notes[u.id])}</p>`).join('') : '<p class="muted">No notes yet. Each unit ends with an optional note.</p>'}</section>
    <section class="panel settings noprint"><h2 class="h3">Settings</h2>
      <p><b>Track</b></p><div class="row wrap">${Object.entries(C.TRACKS).map(([k, t]) => `<button class="btn btn-sm ${S.track === k ? 'btn-secondary' : 'btn-ghost'}" data-act="track" data-track="${k}" aria-pressed="${S.track === k}">${esc(t.label)}</button>`).join('')}</div>
      <label class="confirm"><input type="checkbox" id="review-mode" data-review ${S.review ? 'checked' : ''}><span><b>Review mode</b>: open every stage and skip the checks (for trainers and reviewers). Units you browse are not marked complete.</span></label>
      ${confirmReset ? `<div class="box box-warn"><p><b>Delete all progress, forms and notes on this device?</b> This cannot be undone.</p><div class="row wrap"><button class="btn btn-danger" data-act="reset-yes">Yes, delete everything</button><button class="btn btn-ghost" data-act="reset-no">Keep my work</button></div></div>`
        : `<button class="btn btn-ghost btn-danger-t" data-act="reset">Reset all progress and notes</button>`}
    </section>`, 'plan');
}

function library() {
  return shell(`
    <h1>Library</h1>
    <section class="panel"><h2 class="h3">Sky narratives</h2>${C.NARRATIVES.map(n => `<h4>${esc(n.title)}</h4><p>${esc(n.body)}</p>`).join('')}
      <p class="small muted">Using a local or cultural sky story? Ask permission where you can, and credit where it comes from.</p></section>
    <section class="panel"><h2 class="h3">Plain-language glossary</h2>
      <div class="field"><label for="gloss-q" class="small">Filter</label><input id="gloss-q" type="search" data-gloss placeholder="e.g. window, awe, hand-off"></div>
      <dl class="gloss">${C.GLOSSARY.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl><p class="muted gloss-none" hidden>No term matches. Try a shorter word.</p></section>
    <section class="panel"><h2 class="h3">Resources</h2><ul class="res">${C.RESOURCES.map(r => `<li><span class="chip">${esc(r.kind)}</span> <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><br><span class="small muted">${esc(r.text)}</span></li>`).join('')}</ul></section>`, 'library');
}

function record() {
  if (!allDone() && !S.review) return shell(`<div class="panel center"><h1>Completion record</h1><p>Available when every unit on your path is complete. ${fmtMin(minutesLeft())} to go.</p><a class="btn btn-primary" href="#path">Back to your path</a></div>`, 'record');
  const d = new Date(S.completedAt || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return shell(`
    <div class="record">
      <div class="record-art">${pic(5, { lazy: false })}</div>
      <p class="eyebrow">Record of completion</p>
      <h1>${esc(S.name || 'Your name')}</h1>
      <p>completed the self-guided <b>Astronomy for Mental Health Facilitator Course</b> (${esc(C.TRACKS[S.track].label)} track), including trauma-informed practice, ACT foundations, safety and hand-off, five sky activities${S.track === 'tourism' ? ', astro-tourism practice' : ''}, a session design and a first facilitated session with reflection.</p>
      <p class="muted">${d}${allDone() ? '' : ' · review mode preview'}</p>
      <p class="small muted">Self-recorded completion of a self-guided course. Not a clinical qualification.</p>
      <div class="row center wrap noprint">${S.name ? '' : '<a class="btn btn-ghost" href="#plan">Add your name</a>'}${PREVIEW ? '' : '<button class="btn btn-primary" data-act="print">Print or save as PDF</button>'}<a class="btn btn-ghost" href="#path">Your path</a></div>
    </div>`, 'record');
}

/* ---------- export ---------- */
function planMD() {
  const L = ['# My facilitator plan', '', `${S.name ? `Name: ${S.name}  ` : ''}Track: ${(C.TRACKS[S.track] || {}).label || '-'}  `, `Exported: ${new Date().toLocaleString()}`, ''];
  planForms().forEach(fid => {
    const F = C.FORMS[fid]; const v = form(fid);
    if (!F.fields.some(f => v[f.id])) return;
    L.push(`## ${F.title}${F.workbook ? ` (workbook ${F.workbook})` : ''}`, '');
    F.fields.forEach(f => v[f.id] && L.push(`**${f.label}:** ${v[f.id]}`, ''));
  });
  const notes = units().filter(u => S.notes[u.id]);
  if (notes.length) { L.push('## Unit notes', ''); notes.forEach(u => L.push(`**${u.id} ${u.title}:** ${S.notes[u.id]}`, '')); }
  return L.join('\n');
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function copyText(text) {
  const fallback = () => { const t = document.createElement('textarea'); t.value = text; t.className = 'copy-fallback'; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); toast(ok ? 'Plan copied. Paste it into a document or message.' : 'Copying is blocked here. Use Download instead.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast('Plan copied. Paste it into a document or message.'), fallback); else fallback();
}

/* ---------- toast ---------- */
let tt, ft;
function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2800); }
function flash() { clearTimeout(ft); ft = setTimeout(() => { const t = $('#toast'); if (t && !t.classList.contains('show')) toast(storageOK ? 'Saved on this device' : 'Could not save: storage is blocked'); }, 900); }

/* ---------- router ---------- */
function parse() {
  let h = location.hash.replace(/^#/, '');
  if (h.startsWith('/')) { /* v2 links: #/u/1.2/check, #/plan */
    const [, p, a] = h.split('/'); h = p === 'u' && a ? 'u-' + a.replace('.', '-') : (p || 'path');
    try { history.replaceState(null, '', '#' + h); } catch (e) {}
  }
  if (h.startsWith('u-')) return ['unit', h.slice(2).replace('-', '.')];
  if (h.startsWith('stage-')) return ['stage', +h.slice(6)];
  if (h.startsWith('run-')) return ['run', h.slice(4)];
  return [h || 'path'];
}
function render() {
  clearTimers(); WREG = [];
  document.documentElement.classList.toggle('red', !!S.night);
  const [p, a] = parse();
  let html;
  if (!S.track && p !== 'library') html = welcome();
  else if (p === 'unit') html = unitView(a);
  else if (p === 'stage') html = stagePage(a);
  else if (p === 'run') html = runView(a);
  else if (p === 'session') html = session();
  else if (p === 'plan') html = plan();
  else if (p === 'library') html = library();
  else if (p === 'record') html = record();
  else html = home();
  $('#app').innerHTML = html;
  mountWidgets();
  const titleEl = $('#app h1') || $('#app .s-h');
  document.title = (titleEl ? titleEl.textContent.trim() + ' · ' : '') + 'Astronomy for Mental Health';
}
function go(hash) { if (location.hash === hash) { render(); scrollTo(0, 0); } else location.hash = hash; }
function focusMain() { const m = $('#main'); if (m) m.focus({ preventScroll: true }); }
/* Reopening a finished unit starts at its first screen, not on the "complete" screen. */
function enterUnit() { const [p, a] = parse(); const u = p === 'unit' && unitById(a); if (u && isDone(u) && (+S.pos[u.id] || 0) >= screensFor(u).length - 1) S.pos[u.id] = 0; }
window.addEventListener('hashchange', () => { enterUnit(); render(); scrollTo(0, 0); focusMain(); });

/* ---------- unit navigation ---------- */
function currentUnit() { const [p, a] = parse(); return p === 'unit' ? unitById(a) : null; }
function setPos(u, i) { S.pos[u.id] = i; save(); render(); scrollTo(0, 0); focusMain(); }
function updateGate() {
  const u = currentUnit(); if (!u) return;
  const scr = screensFor(u); const sc = scr[Math.min(+S.pos[u.id] || 0, scr.length - 1)]; const ok = screenOK(u, sc);
  const b = $('[data-act="next"]'); if (b) b.disabled = !ok;
  const m = $('.gate-msg'); if (m) m.hidden = ok;
}
function completeUnit(u) {
  if (S.review && !isDone(u)) return;
  if (!isDone(u) && checkSatisfied(u)) {
    S.done[u.id] = true; S.doneAt[u.id] = Date.now();
    if (allDone() && !S.completedAt) S.completedAt = Date.now();
  }
}

/* ---------- events ---------- */
const ACTIONS = {
  skip(t, e) { e.preventDefault(); focusMain(); },
  track(t) { const first = !S.track; S.track = t.dataset.track; save(); if (first) { go('#u-0-1'); } else render(); },
  night() { S.night = !S.night; save(); document.documentElement.classList.toggle('red', S.night); const b = $('.night-toggle'); b.setAttribute('aria-pressed', S.night); $('span', b).textContent = S.night ? 'Normal view' : 'Red night view'; },
  quiz(t) {
    const uid = t.dataset.u, i = +t.dataset.item, q = S.quiz[uid] = S.quiz[uid] || {}, f = S.first[uid] = S.first[uid] || {};
    const it = [].concat(...unitById(uid).check.filter(c => c.kind === 'quiz').map(c => c.items))[i];
    if (f[i] == null) f[i] = !!it.options[+t.dataset.opt].correct;
    q[i] = +t.dataset.opt; (TRIED[uid + ':' + i] = TRIED[uid + ':' + i] || []).push(q[i]); save();
    const y = scrollY; const host = t.closest('.quiz'); const label = $('.eyebrow', host).textContent;
    host.outerHTML = quizHTML(uid, i, it, label); scrollTo(0, y); updateGate();
    const nb = $('[data-act="next"]'); if (nb && !nb.disabled) nb.focus();
  },
  next() {
    const u = currentUnit(); if (!u) return; const scr = screensFor(u); const i = Math.min(+S.pos[u.id] || 0, scr.length - 1);
    if (!screenOK(u, scr[i])) return;
    if (i + 1 === scr.length - 1) completeUnit(u);
    setPos(u, Math.min(i + 1, scr.length - 1));
  },
  prev() { const u = currentUnit(); if (u) setPos(u, Math.max((+S.pos[u.id] || 0) - 1, 0)); },
  seg(t) { const u = currentUnit(); if (u) setPos(u, +t.dataset.j); },
  runnext(t) { runPos[t.dataset.k] = (runPos[t.dataset.k] || 0) + 1; render(); scrollTo(0, 0); },
  runprev(t) { runPos[t.dataset.k] = Math.max((runPos[t.dataset.k] || 0) - 1, 0); render(); scrollTo(0, 0); },
  runend(t) { runPos[t.dataset.k] = 0; },
  copy() { copyText(planMD()); },
  export(t) { if (t.dataset.kind === 'md') download('my-facilitator-plan.md', planMD(), 'text/markdown'); else download('facilitator-course-backup.json', JSON.stringify(S, null, 2), 'application/json'); },
  print() { window.print(); },
  reset() { confirmReset = true; render(); const b = $('[data-act="reset-no"]'); b && b.focus(); },
  'reset-no'() { confirmReset = false; render(); },
  'reset-yes'() { confirmReset = false; S = blank(); S.migrated = true; save(); go('#path'); toast('All progress deleted from this device.'); },
  clearcheck() { S.checklist = []; save(); render(); }
};
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const fn = ACTIONS[t.dataset.act]; if (fn) fn(t, e);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.form) { form(t.dataset.form)[t.dataset.field] = t.value; save(); flash(); updateGate(); }
  else if (t.dataset.note) { S.notes[t.dataset.note] = t.value; save(); flash(); }
  else if ('name' in t.dataset) { S.name = t.value; save(); flash(); }
  else if ('gloss' in t.dataset) {
    const q = t.value.trim().toLowerCase(); let n = 0;
    $$('.gloss > div').forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.hidden = !hit; if (hit) n++; });
    $('.gloss-none').hidden = n > 0;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.confirm) { S.confirms[t.dataset.confirm] = t.checked; save(); updateGate(); }
  else if (t.dataset.check) { S.checklist[+t.dataset.check] = t.checked; save(); }
  else if ('review' in t.dataset) { S.review = t.checked; save(); render(); }
  else if ('import' in t.dataset && t.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try { const d = JSON.parse(reader.result); if (!d || typeof d !== 'object' || Array.isArray(d) || typeof d.done !== 'object') throw 0;
        localStorage.setItem(KEY, JSON.stringify(Object.assign(blank(), d))); load(); S.migrated = true; save(); importErr = ''; render(); toast('Backup restored.');
      } catch (err) { importErr = 'That file is not a course backup. Choose the .json file you saved from "Back up progress".'; render(); }
    };
    reader.readAsText(t.files[0]);
  }
});
document.addEventListener('keydown', e => {
  if (e.target.matches('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
  const u = currentUnit(); if (!u) return;
  if (e.key === 'ArrowRight') { const b = $('[data-act="next"]'); if (b && !b.disabled) b.click(); }
  if (e.key === 'ArrowLeft') { const b = $('[data-act="prev"]'); if (b) b.click(); }
});

load();
migrateV1();
enterUnit();
render();
})();
