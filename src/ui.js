{
const { card, THEMES, AUGMENTS, ENEMIES, Battle, UNLOCKS, Meta, newMeta, Run, AUGMENT_AFTER, MAX_ARTIFACTS, TOTAL_FIGHTS, GLOSSARY, RNG } = Core;
const $ = s => document.querySelector(s);
const app = $('#app');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COL = { paper: '#eae3d2', ember: '#ff7a3a', blood: '#e0526a', gold: '#e8c26a', frost: '#9ec5e8', ash: '#9e99a6', vow: '#b894f4', heal: '#8dd996' };
const typeCol = t => t === 'spell' ? COL.ember : t === 'artifact' ? COL.gold : COL.paper;

// ---------- code-drawn art ----------
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function sigil(key, color, o = {}) {
  const g = new RNG(hash(key)); const r = 44; const ring = o.ring !== false;
  let main = '', fine = '', glyph = '';
  const f = n => n.toFixed(1);
  if (ring) { main += `M${-r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`; if (g.chance(.5)) { const r2 = r * .88; fine += `M${f(-r2)},0a${f(r2)},${f(r2)} 0 1,0 ${f(2 * r2)},0a${f(r2)},${f(r2)} 0 1,0 ${f(-2 * r2)},0`; } }
  const sides = g.int(3, 8), rot = g.next() * Math.PI * 2, pr = r * (ring ? .74 : .95);
  const pts = [...Array(sides)].map((_, i) => [Math.cos(rot + i * 2 * Math.PI / sides) * pr, Math.sin(rot + i * 2 * Math.PI / sides) * pr]);
  const step = sides >= 5 && g.chance(.45) ? 2 : 1; let idx = 0;
  main += `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < sides; i++) { idx = (idx + step) % sides; main += `L${f(pts[idx][0])},${f(pts[idx][1])}`; }
  main += 'Z';
  if (g.chance(.6)) for (const p of pts) if (g.chance(.7)) fine += `M${f(p[0] * .25)},${f(p[1] * .25)}L${f(p[0])},${f(p[1])}`;
  if (g.chance(.5)) { const br = r * .065; for (const p of pts) fine += `M${f(p[0] - br)},${f(p[1])}a${f(br)},${f(br)} 0 1,0 ${f(2 * br)},0a${f(br)},${f(br)} 0 1,0 ${f(-2 * br)},0`; }
  const q = r * .32; let cx = g.int(-1, 2) * q, cy = g.int(-1, 2) * q;
  glyph = `M${f(cx)},${f(cy)}`;
  const steps = g.int(3, 6);
  for (let i = 0; i < steps; i++) {
    let nx = Math.max(-q, Math.min(q, cx + g.int(-1, 2) * q)), ny = Math.max(-q, Math.min(q, cy + g.int(-1, 2) * q));
    if (nx === cx && ny === cy) ny = -cy;
    cx = nx; cy = ny; glyph += `L${f(cx)},${f(cy)}`;
  }
  if (o.eye) { const w = r * .42, h = r * .2; glyph += `M${f(-w)},0Q0,${f(-h * 2)} ${f(w)},0Q0,${f(h * 2)} ${f(-w)},0`; const pr2 = r * .08; glyph += `M${f(-pr2)},0a${f(pr2)},${f(pr2)} 0 1,0 ${f(2 * pr2)},0a${f(pr2)},${f(pr2)} 0 1,0 ${f(-2 * pr2)},0`; }
  const lw = o.lw || 2.4;
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true" ${o.cls ? `class="${o.cls}"` : ''}><g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">
<path d="${main}" stroke-opacity=".14" stroke-width="${lw * 3.2}"/>
<path d="${main}" stroke-width="${lw}" ${o.glow ? `style="filter:drop-shadow(0 0 3px ${color})"` : ''}/>
<path d="${fine}" stroke-opacity=".6" stroke-width="${Math.max(1, lw * .55)}"/>
<path d="${glyph}" stroke-width="${lw * 1.5}"/></g></svg>`;
}
const ICON = {
  heart: c => `<svg viewBox="-10 -10 20 20"><path d="M0,9C14,0 7,-12 0,-5C-7,-12 -14,0 0,9Z" fill="${c}"/></svg>`,
  shield: c => `<svg viewBox="-10 -10 20 20"><path d="M0,-9L8,-6Q8,4 0,9Q-8,4 -8,-6Z" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="1.5"/></svg>`,
  flame: c => `<svg viewBox="-10 -10 20 20"><path d="M0,-10C11,0 8,9 0,9C-8,9 -11,0 0,-10Z" fill="${c}"/></svg>`,
  ash: c => `<svg viewBox="-10 -10 20 20" fill="${c}">${[[-5, 5], [0, 5], [5, 5], [-2.5, 0], [2.5, 0], [0, -5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2"/>`).join('')}</svg>`,
  crown: c => `<svg viewBox="-12 -12 24 24"><path d="M-10,7V-5L-5,1L0,-9L5,1L10,-5V7Z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/></svg>`,
};

// ---------- sound (synthesized, no files) ----------
const Sound = (() => {
  let ctx = null, buffers = {};
  const V = (f0, f1, dur, wave, noise, attack, vol, delay = 0) => ({ f0, f1, dur, wave, noise, attack, vol, delay });
  const DEF = {
    tap: [V(1400, 900, .035, 1, .1, .002, .25)], card: [V(500, 900, .12, 0, .55, .01, .3)],
    summon: [V(220, 440, .22, 1, .15, .02, .4), V(330, 660, .2, 0, 0, .03, .2, .04)],
    hit: [V(160, 50, .16, 0, .35, .002, .7)], death: [V(400, 80, .38, 1, .6, .005, .45)],
    ash: [V(1320, 1320, .18, 0, 0, .003, .18), V(1760, 1760, .22, 0, 0, .003, .12, .05)],
    shield: [V(900, 1200, .2, 1, .05, .005, .22)], enemy: [V(110, 90, .3, 2, .2, .02, .3)],
    burn: [V(70, 35, .8, 0, .5, .005, .9), V(600, 150, .5, 2, .3, .005, .25)],
    victory: [V(392, 392, .25, 1, 0, .01, .3), V(494, 494, .25, 1, 0, .01, .3, .12), V(587, 587, .5, 1, 0, .01, .3, .24), V(784, 784, .7, 0, 0, .02, .2, .36)],
    defeat: [V(220, 110, 1.2, 1, .25, .02, .4), V(165, 82, 1.2, 0, 0, .05, .3, .1)],
    unlock: [V(523, 523, .2, 0, 0, .005, .25), V(784, 784, .35, 0, 0, .005, .25, .08), V(1046, 1046, .5, 0, 0, .005, .2, .16)],
  };
  function build(voices) {
    const rate = ctx.sampleRate, total = Math.max(...voices.map(v => v.delay + v.dur));
    const buf = ctx.createBuffer(1, Math.ceil(total * rate) + 1, rate), ch = buf.getChannelData(0);
    let seed = 12345;
    for (const v of voices) {
      const start = Math.floor(v.delay * rate), n = Math.floor(v.dur * rate); let ph = 0, lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n, f = v.f0 + (v.f1 - v.f0) * t; ph += f / rate; const p = ph - Math.floor(ph);
        let s = v.wave === 1 ? 4 * Math.abs(p - .5) - 1 : v.wave === 2 ? (p < .5 ? .6 : -.6) : Math.sin(2 * Math.PI * p);
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; lp += ((seed / 4294967296) * 2 - 1 - lp) * .25;
        s = s * (1 - v.noise) + lp * v.noise * 1.6;
        const env = Math.min(1, (i / rate) / Math.max(.001, v.attack)) * Math.pow(1 - t, 2.2);
        if (start + i < ch.length) ch[start + i] += s * env * v.vol;
      }
    }
    return buf;
  }
  return {
    unlock() {
      try {
        if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); for (const k in DEF) buffers[k] = build(DEF[k]); }
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { ctx = null; }
    },
    play(name) {
      if (!ctx || !G.meta.soundOn || !buffers[name]) return;
      try { const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = .55; s.buffer = buffers[name]; s.connect(g).connect(ctx.destination); s.start(); } catch (e) {}
    },
  };
})();
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

// ---------- saving: Claude's per-person storage when available, this browser otherwise ----------
const KEY = 'ashbound.web.v1';
const G = { meta: newMeta(), run: null };
const Store = (() => {
  let doc = null, timer = null, writing = false, dirty = false;
  async function connect() {
    try {
      if (!(window.claude && typeof window.claude.use === 'function')) return null;
      const t = new Promise(r => setTimeout(() => r(null), 4000));
      const db = await Promise.race([window.claude.use('db'), t]);
      const user = await Promise.race([window.claude.use('user'), t]);
      if (!db || !user) return null;
      const id = await user.id();
      return id ? db.doc(`data/users/${id}/ashbound`) : null;
    } catch (e) { return null; }
  }
  const parse = s => { try { const o = typeof s === 'string' ? JSON.parse(s) : s; return o && o.meta ? o : null; } catch (e) { return null; } };
  return {
    async load() {
      let local = null;
      try { local = parse(localStorage.getItem(KEY)); } catch (e) {}
      doc = await connect();
      let remote = null;
      if (doc) {
        try {
          const snap = await Promise.race([doc.get(), sleep(6000).then(() => null)]);
          if (snap && snap.exists) { const d = snap.data(); remote = parse(d && d.save); }
        } catch (e) {}
      }
      const pick = [remote, local].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))[0];
      if (pick) { G.meta = Object.assign(newMeta(), pick.meta); G.run = pick.run || null; }
    },
    save() {
      const data = { meta: G.meta, run: G.run, savedAt: Date.now() };
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
      clearTimeout(timer);
      timer = setTimeout(flush, 500);
    },
  };
  async function flush() {
    if (!doc) return;
    if (writing) { dirty = true; return; }
    writing = true;
    try {
      const data = { meta: G.meta, run: G.run, savedAt: Date.now() };
      await doc.set({ save: JSON.stringify(data), savedAt: data.savedAt });
    } catch (e) {}
    writing = false;
    if (dirty) { dirty = false; flush(); }
  }
})();

// ---------- small UI helpers ----------
function toast(text, color = COL.paper) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.style.setProperty('--tc', color); t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2300);
}
function banner(text, color, yFrac = .5, ms = 900) {
  const b = document.createElement('div'); b.className = 'banner'; b.textContent = text;
  b.style.setProperty('--bc', color); b.style.setProperty('--y', (yFrac * 100) + '%'); b.style.setProperty('--t', ms + 'ms');
  document.body.appendChild(b); setTimeout(() => b.remove(), ms + 50);
}
function floatAt(el, text, color, size = 24) {
  if (!el) return; const r = el.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'float'; f.textContent = text; f.style.color = color; f.style.fontSize = size + 'px';
  f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height * .35) + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 850);
}
function flash(color, a = .2) {
  const f = document.createElement('div'); f.className = 'flash'; f.style.background = color; f.style.setProperty('--a', a);
  document.body.appendChild(f); setTimeout(() => f.remove(), 420);
}
function anim(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function screen(html) { app.innerHTML = `<div class="screen">${html}</div>`; return app.firstElementChild; }
function on(root, sel, fn) { root.querySelectorAll(sel).forEach(el => el.addEventListener('click', e => { Sound.play('tap'); fn(el, e); })); }

function cardHTML(id, o = {}) {
  const d = card(id), c = typeCol(d.type);
  const ty = d.theme === 'starter' ? d.type : `${d.type} · ${THEMES[d.theme][0]}`;
  return `<div class="card ${d.type === 'creature' ? 'cr' : ''} ${o.cls || ''}" style="--c:${c}" ${o.uid != null ? `data-uid="${o.uid}"` : ''} ${o.attr || ''}>
<div class="cost">${d.cost}</div><div class="nm">${esc(d.name)}</div>${sigil(id, c, { cls: 'art', lw: 2.6 })}
<div class="ty">${esc(ty[0].toUpperCase() + ty.slice(1))}</div>${d.text ? `<div class="tx">${esc(d.text)}</div>` : ''}
${d.type === 'creature' ? `<div class="p">${d.power}</div><div class="h">${d.health}</div>` : ''}</div>`;
}
function showDeck(ids, title, sub = '') {
  const m = document.createElement('div'); m.className = 'modal';
  const sorted = ids.slice().sort((a, b) => card(a).cost - card(b).cost || card(a).name.localeCompare(card(b).name));
  m.innerHTML = `<div class="inner"><h2 class="center">${esc(title)}</h2>${sub ? `<div class="center dim small">${esc(sub)}</div>` : ''}
<div class="scroll"><div class="grid">${sorted.map(id => cardHTML(id)).join('') || '<div class="dim">Empty.</div>'}</div></div>
<button class="btn" style="margin:0 auto;min-width:160px">Close</button></div>`;
  m.querySelector('.btn').onclick = () => m.remove();
  document.body.appendChild(m);
}

// ---------- screens ----------
function showMenu() {
  const m = G.meta; let confirmAbandon = false;
  const s = screen(`<div class="menu-hero">${sigil('ashbound-menu', COL.ember, { eye: true, glow: true, lw: 1.6 })}
<div class="t"><h1>ASHBOUND</h1><div class="dim" style="font:600 17px var(--title)">a roguelike of ash and fire</div></div></div>
<div class="stack">
${G.run ? `<button class="btn primary" id="cont">Continue Run · Fight ${G.run.fight}</button><button class="btn danger" id="aband">Abandon Run</button>`
        : `<button class="btn primary" id="begin">Begin a Run</button>`}
<button class="btn" id="shrine">Shrine of Ash</button><button class="btn" id="how">How to Play</button>
<button class="btn quiet" id="snd">Sound: ${m.soundOn ? 'On' : 'Off'}</button></div>
<div class="foot">Ash ${m.ash} · Runs ${m.runs} · Victories ${m.wins}</div>`);
  on(s, '#begin', () => {
    G.meta.runs++; G.run = Run.create(G.meta, (Math.random() * 4294967296) >>> 0); Store.save();
    if (!G.meta.seenTutorial) { G.meta.seenTutorial = true; Store.save(); showHowTo(true); } else showPath();
  });
  on(s, '#cont', () => continueRun());
  on(s, '#aband', el => {
    if (!confirmAbandon) { confirmAbandon = true; el.textContent = 'Tap again to abandon'; return; }
    const banked = endRun(false); toast(`Run abandoned. ${banked} Ash banked.`, COL.ash); showMenu();
  });
  on(s, '#shrine', () => showShrine());
  on(s, '#how', () => showHowTo(false));
  on(s, '#snd', el => { G.meta.soundOn = !G.meta.soundOn; Store.save(); el.textContent = `Sound: ${G.meta.soundOn ? 'On' : 'Off'}`; });
}
function continueRun() {
  const r = G.run; if (!r) return showMenu();
  if (r.stage === 'bundle') showReward(); else if (r.stage === 'augment') showAugment(); else showPath();
}
function endRun(won) {
  const r = G.run; if (!r) return 0;
  const n = Run.ashToBank(r, won);
  Meta.bank(G.meta, n);
  G.meta.bestFight = Math.max(G.meta.bestFight, won ? TOTAL_FIGHTS + 1 : r.fight);
  if (won) G.meta.wins++;
  G.run = null; Store.save();
  return n;
}

function showPath() {
  const r = G.run, e = ENEMIES[Run.currentEnemy(r)];
  const hue = Math.round(e.hue * 360), col = `hsl(${hue} 70% 68%)`;
  const tier = ['', 'An easy start', 'A real threat', 'Deadly', 'The final guardian'][e.tier];
  const dots = [...Array(TOTAL_FIGHTS)].map((_, i) => {
    const f = i + 1;
    if (f === TOTAL_FIGHTS) return `<span style="width:22px;height:22px;position:relative">${ICON.crown(f === r.fight ? COL.ember : COL.ash)}</span>`;
    return `<span class="dot ${f < r.fight ? 'done' : ''} ${f === r.fight ? 'cur' : ''} ${AUGMENT_AFTER.includes(f) ? 'aug' : ''}"></span>`;
  }).join('');
  const s = screen(`<h1 class="center" style="font-size:30px">${Run.isFinal(r) ? 'The Final Pyre' : `Fight ${r.fight} of ${TOTAL_FIGHTS}`}</h1>
<div class="track">${dots}</div><div class="center faint small" style="font-weight:700">Gold dots: an augment after that fight</div>
<div class="foe">${sigil(Run.currentEnemy(r), col, { eye: true, glow: e.tier >= 3, lw: 1.8 })}
<div><div class="tierline">${tier}</div><h2 style="font-size:30px">${esc(e.name)}</h2><div class="dim" style="font:600 16px var(--title)">${esc(e.title)}</div></div>
<button class="btn primary" id="fight" style="min-width:220px;min-height:54px;font-size:19px">Fight</button></div>
<div class="row between"><div class="row" style="font-weight:700"><span style="width:18px">${ICON.heart(COL.blood)}</span>${r.maxHP} HP · full heal each fight</div>
<button class="btn" id="deck" style="min-height:38px;font-size:14px">Deck ${r.deck.length}</button></div>
<div class="label" style="margin-top:8px">Augments</div>
<div class="chips" style="min-height:40px;margin-top:4px">${r.augments.length ? r.augments.map(a => `<div class="medal" data-a="${a}">${sigil(a, COL.gold, { ring: false, lw: 3 })}</div>`).join('') : '<span class="faint small" style="font-weight:700">None yet</span>'}</div>
<button class="btn quiet" id="quit" style="margin:4px auto 0">Save & Quit</button>`);
  on(s, '#fight', () => startBattle());
  on(s, '#deck', () => showDeck(r.deck, 'Your Deck'));
  on(s, '.medal', el => { const a = AUGMENTS[el.dataset.a]; toast(`${a[0]}: ${a[1]}`, COL.gold); });
  on(s, '#quit', () => { Store.save(); showMenu(); });
}

// ---------- battle ----------
let B = null, view = null;
function startBattle() {
  const r = G.run;
  B = new Battle(Run.currentEnemy(r), r.fight, r.deck, r.maxHP, r.augments, Meta.burnBonus(G.meta), Run.nextSeed(r));
  B.captureSnaps = true;
  Store.save();
  view = { sel: null, busy: false, done: false, known: new Set() };
  const e = B.enemy, col = `hsl(${Math.round(e.hue * 360)} 70% 68%)`;
  const s = screen(`<div class="bt" id="bt">
<div class="etop"><div class="round"><span class="label">ROUND</span><b id="rnd">1</b><span class="faint" style="font:700 9px var(--body)">Fight ${B.fight} of ${TOTAL_FIGHTS}</span></div>
<div class="ename"><h2>${esc(e.name)}</h2><div class="dim" style="font:700 10.5px var(--body)">${e.tier === 4 ? 'FINAL · ' : ''}${esc(e.title)}</div></div>
<div class="intent"><div class="label" style="color:var(--blood);font-size:9px">NEXT</div><b id="it"></b><span id="id"></span></div></div>
<div><div class="cmd" id="cmd">${sigil(B.enemyId, col, { eye: true, glow: e.tier >= 3, lw: 2 })}<div class="eblock" id="eb"></div></div>
<div class="hpbar"><i id="ehp"></i><b id="ehpt"></b></div><div class="estatus" id="est"></div></div>
<div class="board">
<div class="lane"><span></span><div class="slot enemy" id="slot-enemy"><span class="empty">its minion</span></div><span></span></div>
<div class="divider"></div>
<div class="lane"><div><button class="side-btn" id="stoke">${ICON.ash(COL.ash)}<b>STOKE</b></button><div class="side-cap" id="stokecap"></div></div>
<div class="slot" id="slot-player"><span class="empty">your creature</span></div>
<div><div class="pips" id="pips"></div><button class="side-btn" id="burn">${ICON.flame(COL.ember)}<b id="burnl">BURN</b></button></div></div>
<div><div class="arts" id="arts"></div><div class="center faint" style="font:700 8px var(--body)">ARTIFACTS</div></div>
</div>
<div class="status"><div class="stat" id="hp"></div><div class="stat" id="blk"></div><div class="stat energy" id="en"></div>
<button class="btn primary endturn" id="end">End Turn</button></div>
<div class="piles"><button id="pd"></button><span class="hint" id="hint"></span><button id="pu"></button></div>
<div class="hand" id="hand"></div></div>`);
  $('#end').onclick = () => { Sound.play('tap'); doEndTurn(); };
  $('#stoke').onclick = () => { Sound.play('tap'); doStoke(); };
  $('#burn').onclick = () => { Sound.play('tap'); doBurn(); };
  $('#pd').onclick = () => showDeck(B.drawPile.map(c => c.id), 'Draw Pile', 'Shown sorted, not in draw order');
  $('#pu').onclick = () => showDeck(B.discard.map(c => c.id), 'Used Pile');
  s.addEventListener('click', e => { if (!e.target.closest('.card') && view.sel != null) { view.sel = null; renderHand(B.snapshot()); } });
  $('#cmd').onclick = () => { const [t, d] = B.intentText(); toast(`${e.name}: ${B.enemyHP}/${B.enemyMaxHP} HP. Next: ${t} (${d}).`, COL.blood); };
  render(B.snapshot());
  B.start();
  play(B.takeEvents());
}

function allyHTML(a) {
  if (!a) return '';
  const col = a.side === 'player' ? COL.paper : COL.blood;
  return `<div class="ally ${a.side}">${a.fresh ? '<span class="fresh">attacks next turn</span>' : ''}${sigil(a.cardID || a.minion || a.name, col, { eye: a.side === 'enemy', lw: 2.4 })}
<div class="an">${esc(a.name)}</div><div class="p">${a.power}</div><div class="h">${Math.max(0, a.health)}</div></div>`;
}
function render(sn) {
  $('#rnd').textContent = sn.round || 1;
  $('#it').textContent = sn.intent[0]; $('#id').textContent = sn.intent[1];
  $('#ehp').style.width = Math.max(0, Math.min(100, 100 * sn.enemyHP / sn.enemyMaxHP)) + '%';
  $('#ehpt').textContent = `${Math.max(0, sn.enemyHP)} / ${sn.enemyMaxHP}`;
  $('#est').textContent = sn.status;
  $('#eb').innerHTML = sn.enemyBlock > 0 ? `<div class="stat" style="font-size:16px"><span style="width:20px">${ICON.shield(COL.frost)}</span>${sn.enemyBlock}</div>` : '';
  for (const side of ['player', 'enemy']) {
    const slot = $('#slot-' + side), a = sn.allies[side];
    const cur = slot.querySelector('.ally');
    if (!a) { if (cur) cur.remove(); slot.querySelector('.empty').style.display = ''; continue; }
    slot.querySelector('.empty').style.display = 'none';
    if (cur && +cur.dataset.id === a.id) {
      cur.querySelector('.p').textContent = a.power; cur.querySelector('.h').textContent = Math.max(0, a.health);
      const fr = cur.querySelector('.fresh'); if (fr && !a.fresh) fr.remove();
    } else {
      if (cur) cur.remove();
      slot.insertAdjacentHTML('beforeend', allyHTML(a));
      const n = slot.querySelector('.ally'); n.dataset.id = a.id; anim(n, 'pop');
    }
  }
  $('#hp').className = 'stat' + (sn.hp / sn.maxHP < .3 ? ' low' : '');
  $('#hp').innerHTML = `<span style="width:18px">${ICON.heart(COL.blood)}</span>${Math.max(0, sn.hp)}/${sn.maxHP}`;
  $('#blk').innerHTML = sn.block > 0 ? `<span style="width:20px">${ICON.shield(COL.frost)}</span>${sn.block}` : '';
  $('#en').innerHTML = `<span style="width:18px">${ICON.flame(COL.ember)}</span>${sn.energy}/${sn.maxE}`;
  $('#pips').innerHTML = [...Array(sn.ashNeeded)].map((_, i) => `<i class="${i < sn.ash ? 'on' : ''}"></i>`).join('');
  const burn = $('#burn'); burn.className = 'side-btn ' + (sn.canBurn ? 'ready' : 'off');
  $('#burnl').textContent = sn.canBurn ? `BURN ${sn.burnDamage}` : 'BURN';
  $('#stoke').className = 'side-btn ' + (sn.canStoke ? '' : 'off');
  $('#stokecap').textContent = `${sn.stokePrice} energy → 1 Ash`;
  $('#arts').innerHTML = [...Array(MAX_ARTIFACTS)].map((_, i) => {
    const a = sn.artifacts[i];
    return a ? `<div class="art-slot has" data-uid="${a.uid}" data-id="${a.id}">${sigil(a.id, COL.gold, { ring: false, lw: 3 })}${a.charges > 0 ? `<span class="ch">${a.charges}</span>` : ''}</div>` : '<div class="art-slot"></div>';
  }).join('');
  document.querySelectorAll('#arts .art-slot.has').forEach(el => el.onclick = () => { const d = card(el.dataset.id); toast(`${d.name}: ${d.text}`, COL.gold); });
  $('#pd').textContent = `Deck ${sn.drawCount}`; $('#pu').textContent = `Used ${sn.discardCount}`;
  renderHand(sn);
}
function renderHand(sn) {
  const h = $('#hand'); if (!h) return;
  const n = sn.hand.length, cw = h.querySelector('.card')?.offsetWidth || Math.min(76, (innerWidth - 18) / 5.15);
  const avail = Math.min(innerWidth, 520) - 20;
  const ov = n > 1 ? Math.min(4, (avail - n * cw) / (n - 1)) : 0;
  h.style.setProperty('--ov', ov + 'px');
  h.innerHTML = sn.hand.map(c => {
    const playable = !view.busy && B.outcome === 'ongoing' && card(c.id).cost <= sn.energy;
    const cls = [view.sel === c.uid ? 'sel' : '', playable ? '' : 'off', view.known.has(c.uid) ? '' : 'new'].join(' ');
    return cardHTML(c.id, { uid: c.uid, cls, attr: 'role="button" tabindex="0"' });
  }).join('');
  sn.hand.forEach(c => view.known.add(c.uid));
  h.querySelectorAll('.card').forEach(el => el.onclick = e => { e.stopPropagation(); tapCard(+el.dataset.uid, el); });
  $('#hint').textContent = view.sel != null ? 'Tap again to play' : '';
}
function tapCard(uid, el) {
  if (view.busy || view.done) return;
  const c = B.hand.find(x => x.uid === uid); if (!c) return;
  const why = B.blockedReason(c);
  if (why) { anim(el, 'shake'); toast(why, COL.blood); buzz(30); view.sel = null; renderHand(B.snapshot()); return; }
  if (view.sel === uid) {
    view.sel = null; buzz(10);
    Sound.play(card(c.id).type === 'creature' ? 'summon' : 'card');
    B.play(uid); play(B.takeEvents());
  } else { view.sel = uid; Sound.play('card'); renderHand(B.snapshot()); }
}
function doEndTurn() { if (view.busy || view.done) return; view.sel = null; buzz(15); B.endTurn(); play(B.takeEvents()); }
function doStoke() {
  if (view.busy || view.done) return;
  if (!B.canStoke) { toast(B.stokedThisTurn ? 'You already stoked this turn.' : B.ash >= B.ashNeeded ? 'Your Ash is full. Burn it!' : `Stoke costs ${B.stokePrice} energy.`, COL.ash); return; }
  B.stoke(); play(B.takeEvents());
}
function doBurn() {
  if (view.busy || view.done) return;
  if (!B.canBurn) { toast(`Burn is ready at ${B.ashNeeded} Ash. Gain Ash when your creature dies, or Stoke.`, COL.ash); return; }
  buzz(40); B.useBurn(); play(B.takeEvents());
}
const DUR = { allyIn: 260, allyAttacks: 220, allyHit: 200, allyChanged: 100, allyDied: 280, faceHit: 240, block: 60, healed: 150, ash: 100,
              energy: 0, hand: 40, artifacts: 150, artifactFires: 200, status: 80, enemyActs: 600, burn: 550, info: 480 };
async function play(events) {
  view.busy = true; $('#end').disabled = true;
  for (const ev of events) {
    const sn = ev.snap;
    switch (ev.type) {
      case 'allyAttacks': anim($(`#slot-${ev.side} .ally`), ev.side === 'player' ? 'lunge-up' : 'lunge-down'); break;
      case 'allyHit': { const n = $(`#slot-${ev.side} .ally`); anim(n, 'shake'); floatAt(n, `-${ev.amount}`, COL.blood); Sound.play('hit'); break; }
      case 'allyDied': {
        const n = $(`#slot-${ev.side} .ally`);
        if (n) { n.classList.add('die'); if (ev.side === 'player') floatAt(n, '+1 Ash', COL.ash, 16); await sleep(240); }
        Sound.play('death'); break;
      }
      case 'faceHit':
        if (ev.side === 'enemy') { anim($('#cmd'), 'shake'); floatAt($('#cmd'), `-${ev.amount}`, COL.blood, 28); }
        else { anim($('#hp'), 'shake'); floatAt($('#hp'), `-${ev.amount}`, COL.blood); flash(COL.blood, .16); buzz(25); }
        Sound.play('hit'); break;
      case 'healed': floatAt(ev.side === 'enemy' ? $('#cmd') : $('#hp'), `+${ev.amount}`, COL.heal); break;
      case 'block': if (ev.value > 0) Sound.play('shield'); break;
      case 'ash': Sound.play('ash'); break;
      case 'allyIn': Sound.play('summon'); break;
      case 'enemyActs': anim($('#cmd'), 'pop'); banner(ev.text, COL.blood, .3, 700); Sound.play('enemy'); break;
      case 'burn': flash(COL.ember, .35); banner(`BURN!  ${ev.amount}`, COL.ember, .55, 700); Sound.play('burn'); break;
      case 'info': banner(ev.text, COL.paper, .45, 650); break;
      case 'artifacts': Sound.play('shield'); break;
    }
    if (sn) render(sn);
    if (ev.type === 'artifactFires') anim($(`#arts [data-uid="${ev.uid}"]`), 'pop');
    if (ev.type === 'allyChanged') anim($('#slot-player .ally .p'), 'pop');
    const d = DUR[ev.type] || 0; if (d) await sleep(d);
  }
  view.busy = false;
  render(B.snapshot());
  $('#end').disabled = B.outcome !== 'ongoing';
  if (B.outcome === 'won') winBattle(); else if (B.outcome === 'lost') loseBattle();
}
async function winBattle() {
  if (view.done) return; view.done = true;
  Sound.play('victory'); buzz(60);
  const final = Run.isFinal(G.run);
  $('#cmd svg').style.transition = 'transform .6s, opacity .6s'; $('#cmd svg').style.transform = 'scale(1.6)'; $('#cmd svg').style.opacity = 0;
  banner(final ? 'The Final Pyre falls!' : 'Victory', COL.ember, .5, 1300);
  if (final) G.run.ashEarned += B.ashGainedTotal; else Run.winFight(G.run, B, G.meta);
  Store.save();
  await sleep(1500);
  if (final) { const fight = G.run.fight; const banked = endRun(true); Sound.play('unlock'); showEnd(true, fight, banked, null); }
  else showReward();
}
async function loseBattle() {
  if (view.done) return; view.done = true;
  Sound.play('defeat'); flash(COL.blood, .4); buzz(200);
  banner('The pyre claims you.', COL.blood, .5, 1600);
  G.run.ashEarned += B.ashGainedTotal;
  const fight = G.run.fight, killer = B.enemy.name;
  await sleep(2000);
  const banked = endRun(false);
  showEnd(false, fight, banked, killer);
}

// ---------- rewards ----------
function showReward() {
  const r = G.run; let chosen = null;
  const bundles = r.pendingBundles.map((b, i) => `<div class="panel" data-i="${i}"><div class="row between"><b style="font:700 15px var(--body)">${THEMES[b.theme][0]}</b><span class="dim small">${THEMES[b.theme][1]}</span></div>
<div class="cards">${b.cards.map(id => cardHTML(id, { cls: 'big' })).join('')}</div></div>`).join('');
  const art = r.pendingArtifact ? `<div class="panel gold" data-i="-1"><div class="label" style="color:var(--gold)">OR ONE LEGENDARY ARTIFACT</div>
<div class="row" style="align-items:flex-start;margin-top:8px">${cardHTML(r.pendingArtifact, { cls: 'big' })}<div class="small" style="font-weight:600">One card instead of three. Artifacts stay in play once cast.<br><br><b>${esc(card(r.pendingArtifact).name)}:</b> ${esc(card(r.pendingArtifact).text)}</div></div></div>` : '';
  const s = screen(`<h1 class="center" style="color:var(--ember);font-size:34px">Victory</h1>
<div class="center dim small" style="font-weight:700;margin:4px 0 8px">Take a bundle of 3 cards, or one Legendary Artifact.</div>
<div class="scroll"><div class="list">${bundles}${art}</div></div>
<div class="stack" style="padding-top:8px"><button class="btn primary" id="take" disabled>Take Bundle</button><button class="btn quiet" id="skip">Skip</button></div>`);
  on(s, '.panel', el => {
    chosen = +el.dataset.i;
    s.querySelectorAll('.panel').forEach(p => p.classList.toggle('sel', p === el));
    const t = $('#take'); t.disabled = false; t.textContent = chosen === -1 ? 'Take Artifact' : 'Take Bundle'; t.className = 'btn ' + (chosen === -1 ? 'gold' : 'primary');
  });
  const finish = take => {
    let aug;
    if (take && chosen === -1) aug = Run.takeArtifact(r, G.meta);
    else aug = Run.takeBundle(r, take ? r.pendingBundles[chosen] : null, G.meta);
    if (take) Sound.play('unlock');
    Store.save();
    aug ? showAugment() : showPath();
  };
  on(s, '#take', () => finish(true));
  on(s, '#skip', () => finish(false));
}
function showAugment() {
  const r = G.run; let chosen = null;
  const s = screen(`<div class="center" style="padding-top:6px"><div style="width:96px;margin:0 auto;animation:spin 40s linear infinite">${sigil('augment-choice', COL.gold, { glow: true, lw: 1.8 })}</div>
<h1 style="color:var(--gold);font-size:30px;margin-top:6px">Choose an Augment</h1><div class="dim small" style="font-weight:700;margin:4px 0 10px">It lasts for the rest of this run.</div></div>
<div class="scroll"><div class="list">${r.pendingAugments.map(a => `<div class="panel gold aug" data-a="${a}"><div class="medal">${sigil(a, COL.gold, { ring: false, lw: 3 })}</div>
<div><b>${AUGMENTS[a][0]}</b><span style="font-weight:600;font-size:14px">${AUGMENTS[a][1]}</span></div></div>`).join('')}</div></div>
<div class="stack" style="padding-top:8px"><button class="btn gold" id="take" disabled>Take Augment</button></div>`);
  on(s, '.panel', el => { chosen = el.dataset.a; s.querySelectorAll('.panel').forEach(p => p.classList.toggle('sel', p === el)); $('#take').disabled = false; });
  on(s, '#take', () => { Run.takeAugment(r, chosen); Sound.play('unlock'); Store.save(); showPath(); });
}

// ---------- end, shrine, how to ----------
function showEnd(won, fight, banked, killer) {
  const s = screen(`<div class="menu-hero">${sigil(won ? 'victory' : 'defeat', won ? COL.ember : COL.blood, { eye: !won, glow: true, lw: 1.6 })}
<div class="t"><h1 style="font-size:40px">${won ? 'Unbound' : 'Ashes to Ashes'}</h1>
<div class="dim" style="font:600 17px var(--title);max-width:280px;margin:6px auto 0">${won ? 'You walked through every fire and came out the other side.' : `Felled by ${esc(killer)} in fight ${fight} of ${TOTAL_FIGHTS}.`}</div></div></div>
<div class="center" style="margin-bottom:16px"><div class="dim">Fights won: <b style="color:var(--paper)">${won ? TOTAL_FIGHTS : fight - 1}</b></div>
<div style="font:700 24px var(--body);color:var(--ash);margin-top:8px">+${banked} Ash banked</div><div class="dim small">Shrine total: ${G.meta.ash}</div></div>
<div class="stack"><button class="btn primary" id="shrine">Visit the Shrine</button><button class="btn" id="menu">Main Menu</button></div>`);
  setTimeout(() => Sound.play('ash'), 400);
  on(s, '#shrine', () => showShrine());
  on(s, '#menu', () => showMenu());
}
function showShrine() {
  const m = G.meta;
  const rows = UNLOCKS.map(u => {
    const owned = m.unlocked.includes(u.id), locked = !owned && u.requires && !m.unlocked.includes(u.requires);
    const req = locked ? UNLOCKS.find(x => x.id === u.requires).name : '';
    return `<div class="panel unlock" style="cursor:default;${owned ? 'border-color:rgba(255,122,58,.5)' : ''}"><div><b style="${owned ? 'color:var(--ember)' : ''}">${u.name}</b>
<span class="dim small" style="font-weight:600">${locked ? `Requires ${req}.` : u.detail}</span></div>
${owned ? '<span class="owned">Offered</span>' : `<button class="btn ${Meta.canBuy(m, u) ? 'primary' : ''}" data-u="${u.id}" ${Meta.canBuy(m, u) ? '' : 'disabled'}>${u.cost} Ash</button>`}</div>`;
  }).join('');
  const s = screen(`<h1 class="center" style="font-size:32px">Shrine of Ash</h1><div class="center" style="font:700 16px var(--body);color:var(--ash);margin:4px 0 10px">${m.ash} Ash to offer</div>
<div class="scroll"><div class="list">${rows}</div><div class="center faint small" style="font-weight:700;padding:8px 0">Runs ${m.runs} · Victories ${m.wins} · Best fight ${Math.min(m.bestFight, TOTAL_FIGHTS)}</div></div>
<div class="stack" style="padding-top:8px"><button class="btn" id="back">Back</button></div>`);
  on(s, '[data-u]', el => { const u = UNLOCKS.find(x => x.id === el.dataset.u); if (Meta.buy(G.meta, u)) { Sound.play('unlock'); buzz(40); Store.save(); showShrine(); } });
  on(s, '#back', () => showMenu());
}
function showHowTo(thenPath) {
  const sections = [
    ['The run', 'Face 8 opponents in a row, each tougher than the last. You fully heal between fights. After each win, take a bundle of 3 cards or one Legendary Artifact. After fights 2, 4 and 6, pick a powerful Augment. When a run ends, your Ash unlocks permanent upgrades at the Shrine.'],
    ['Energy grows', 'Round 1 gives you 1 energy, round 2 gives 2, and so on up to 10. You keep your hand between turns and draw a card each turn.'],
    ['Three kinds of card', 'Creatures stand in front of you, one at a time. Spells happen once. Artifacts stay in play and keep working; you can hold 3, and a 4th replaces the oldest. Tap a card to pick it up, then tap it again to play it.'],
    ['Your creature', 'Enemy hits land on your creature first, and anything left over hits you. At the end of your turn, it attacks. Playing a new creature replaces the old one.'],
    ['Ash, Stoke and Burn', 'You gain 1 Ash whenever your creature dies. You can also Stoke: spend 2 energy for 1 Ash, once per turn. When your Ash is full, tap Burn for a big hit straight to the enemy.'],
    ['Scorch', 'Damage over time: at the start of your turn the enemy takes its Scorch as damage, ignoring Block, then Scorch drops by 1.'],
    ['The enemy', 'The box by the enemy shows exactly what it will do next. Watch for Lunge (skips your creature), Wither (shrinks your creature’s attack) and Shatter (breaks your oldest artifact). Hex spells fight back: Weaken, Rot, Expose, Turncoat and Smother.'],
  ];
  const s = screen(`<h1 class="center" style="font-size:32px">How to Play</h1>
<div class="scroll howto">${sections.map(([h, p]) => `<h3>${h}</h3><p>${p}</p>`).join('')}
<h3>Glossary</h3><div class="gl">${GLOSSARY.map(([k, v]) => `<b>${k}</b><span class="dim">${v}</span>`).join('')}</div><div style="height:12px"></div></div>
<div class="stack" style="padding-top:8px"><button class="btn ${thenPath ? 'primary' : ''}" id="go">${thenPath ? 'Begin' : 'Back'}</button></div>`);
  on(s, '#go', () => thenPath ? showPath() : showMenu());
}

// ---------- ambience ----------
function embers() {
  const box = $('#embers'); if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => {
    if (document.hidden || box.childElementCount > 30) return;
    const m = document.createElement('i'); m.className = 'mote';
    const d = 5 + Math.random() * 4;
    m.style.left = Math.random() * 100 + '%'; m.style.setProperty('--dx', (Math.random() * 80 - 40) + 'px');
    m.style.animationDuration = d + 's'; m.style.background = Math.random() < .5 ? COL.ember : COL.gold;
    const sz = 1.5 + Math.random() * 3; m.style.width = m.style.height = sz + 'px';
    box.appendChild(m); setTimeout(() => m.remove(), d * 1000);
  }, 260);
}

document.addEventListener('pointerdown', () => Sound.unlock(), { passive: true });
(async () => {
  app.innerHTML = '<div class="loading">Kindling…</div>';
  embers();
  await Store.load();
  showMenu();
})();
}
