const C = require('../src/core.js');
const card = C.card;
function incoming(b) {
  const i = b.intent; if (!i) return 0; let d = 0;
  if (i.kind === 'attack') d = Math.max(0, i.amount + b.enrage - b.weaken) * i.hits;
  if (i.kind === 'lunge') d = Math.max(0, i.amount + b.enrage - b.weaken);
  const m = b.allies.enemy; if (m && !m.fresh) d += m.power;
  if (i.kind !== 'lunge' && b.allies.player) d = Math.max(0, d - b.allies.player.health);
  return d;
}
function score(b, c) {
  const d = card(c.id);
  if (d.type === 'artifact') return b.artifacts.length < 3 ? 12 + d.cost * 3 : 2;
  if (d.type === 'creature') {
    const a = b.allies.player;
    if (a) return c.id !== 'restless' && d.power + d.health > a.power + a.health + 2 ? 11 + d.cost * 3 : 0;
    return 13 + d.cost * 4;
  }
  if (d.damaging && !['shieldBash', 'fireball', 'spellstorm', 'martyrsFury', 'boneHarvest', 'feast', 'scrap'].includes(c.id)) return 10 + d.cost * 4;
  switch (c.id) {
    case 'shieldBash': return b.block >= 6 ? 14 + (b.block >> 1) : 0;
    case 'guardUp': case 'ashWard': case 'parry': case 'spikedShield': case 'brace': case 'secondWind': case 'ironSkin': { const need = incoming(b) - b.block; return need > 0 ? 12 + Math.min(need, 16) + d.cost : 1; }
    case 'kindle': return 5;
    case 'swarmCall': return b.allies.player ? 4 : 8;
    case 'fanFlames': case 'battleCry': return 10 + d.cost * 3;
    case 'stokeSpark': return 7;
    case 'lastRites': return b.ash < b.ashNeeded - 1 ? 14 : 0;
    case 'heatUp': return 6;
    case 'weaken': return incoming(b) >= 6 ? 12 : 1;
    case 'rot': return b.round < 6 ? 14 : 6;
    case 'expose': return b.enemyBlock > 0 ? 13 : 4;
    case 'turncoat': return 15;
    case 'smother': { const i = b.intent; if (!i) return 0; return (incoming(b) >= 10 || ['heal', 'summon', 'shatter'].includes(i.kind)) ? 16 : 0; }
    case 'emberDart': case 'smokeCloud': return 12 + d.cost * 3;
    case 'catalyst': return b.scorch >= 5 ? 14 + b.scorch : 0;
    case 'wildfire': return 14 + b.scorch;
    case 'fireball': return b.energy >= 5 && !b.hand.some(x => x !== c && b.canPlay(x) && card(x.id).cost >= 3) ? 10 + b.energy * 3 : 0;
    case 'glimmer': return 9;
    case 'insight': return 10;
    case 'ritual': return b.hand.some(x => x !== c && card(x.id).cost > b.energy - 1 && card(x.id).cost <= b.energy + 1) ? 13 : 3;
    case 'spellstorm': return b.spellsThisTurn >= 2 ? 10 + b.spellsThisTurn * 5 : (b.hand.filter(x => b.canPlay(x)).length <= 1 && b.spellsThisTurn ? 8 : 0);
    case 'bloodPact': return b.hp > 12 ? 9 : 0;
    case 'martyrsFury': return b.maxHP - b.hp >= 8 ? 10 + (b.maxHP - b.hp) : 0;
    case 'boneHarvest': return b.discard.length >= 4 ? 8 + b.discard.length * 2 : 0;
    case 'feast': { const a = b.allies.player; return a && a.power + a.health >= 7 ? 12 + a.power + a.health : 0; }
    case 'scrap': return b.artifacts.length >= 3 ? 14 : 0;
    case 'shieldWall': { const need = incoming(b) - b.block; return need > 4 && b.allies.player ? 12 + Math.min(need, 14) : 0; }
    case 'tinker': return b.artifacts.length >= 2 ? 8 + b.artifacts.length * 2 : 0;
    case 'fanEmbers': return 11;
    case 'cauterize': { const need = incoming(b) - b.block; return need > 4 && b.scorch >= 6 ? 12 + Math.min(need, b.scorch) : 0; }
    case 'titansGrip': return 11;
    case 'rampage': return b.allies.player && b.allies.player.power >= 4 ? 10 + b.allies.player.power : 0;
    case 'emberShield': { const need = incoming(b) - b.block; return need > 3 && b.ash >= 2 ? 10 + Math.min(need, b.ash * 3) : 0; }
    case 'frailty': return b.round < 5 ? 13 : 5;
    case 'silence': return b.enrage >= 2 ? 10 + b.enrage * 2 : 2;
    case 'mirrorImage': return b.lastSpell && card(b.lastSpell.id).cost >= 2 ? 10 + card(b.lastSpell.id).cost * 4 : 0;
    case 'bloodletting': return b.hp > 14 && b.hand.some(x => x !== c && card(x.id).cost > b.energy - 1 && card(x.id).cost <= b.energy + 1) ? 12 : 0;
    case 'exhume': return b.allies.player ? 0 : 14;
    case 'phaseShift': return incoming(b) >= 6 ? 12 : 0;
    case 'recall': return b.discard.some(x => card(x.id).type === 'spell' && card(x.id).cost >= 2) ? 9 : 0;
  }
  return 1;
}
// How much is it worth to counter the enemy's current action?
function counterWorth(b) {
  const i = b.intent; if (!i || b.smothered) return 0;
  if (i.kind === 'channel') return 20;
  if (i.kind === 'stagger') return 0;
  if (C.ATTACK_KINDS.includes(i.kind)) { const d = Math.max(0, i.amount + b.enrage - b.weaken) * (i.hits || 1); return d >= 7 ? 12 + d : 0; }
  return { heal: 18, summon: 16, shatter: b.artifacts.length ? 18 : 0, enrage: 15, wither: b.allies.player ? 12 : 0, block: 5 }[i.kind] || 0;
}
function reserve(b) {
  // Keep energy for the cheapest counter that answers a move worth countering.
  if (counterWorth(b) < 12) return 0;
  const was = b.phase; b.phase = 'respond';
  const cs = b.hand.filter(c => card(c.id).counter && b.counterFits(card(c.id))).map(c => card(c.id).cost);
  b.phase = was;
  return cs.length ? Math.min(...cs) : 0;
}
function respond(b) {
  for (let n = 0; n < 12 && b.phase === 'respond' && b.outcome === 'ongoing'; n++) {
    const opts = b.hand.filter(c => b.canPlay(c)).map(c => {
      const d = card(c.id);
      let v = d.counter ? counterWorth(b) : d.type === 'creature' ? (!b.allies.player ? 14 : 0) : score(b, c);
      return [c, v];
    }).filter(x => x[1] > 0);
    if (!opts.length) break;
    opts.sort((x, y) => y[1] - x[1]);
    b.play(opts[0][0].uid); b.takeEvents();
  }
  if (b.phase === 'respond') { b.pass(); b.takeEvents(); }
}
function playTurn(b) {
  const keep = reserve(b);
  for (let n = 0; n < 25; n++) {
    if (b.canBurn) { b.useBurn(); b.takeEvents(); if (b.outcome !== 'ongoing') return; }
    const opts = b.hand.filter(c => b.canPlay(c) && b.energy - card(c.id).cost >= keep).map(c => [c, score(b, c)]).filter(x => x[1] > 0);
    if (!opts.length) break;
    opts.sort((x, y) => y[1] - x[1]);
    b.play(opts[0][0].uid); b.takeEvents();
    if (b.outcome !== 'ongoing') return;
  }
  if (b.canStoke) { b.stoke(); b.takeEvents(); }
  if (b.canBurn) { b.useBurn(); b.takeEvents(); if (b.outcome !== 'ongoing') return; }
  b.endTurn(); b.takeEvents();
  if (b.phase === 'respond') respond(b);
}
function simulate(runs, unlockAll, fav, seed, cls = 'pyro') {
  const master = new C.RNG(seed);
  let wins = 0, fightSum = 0, bestSum = 0;
  for (let k = 0; k < runs; k++) {
    const meta = C.newMeta(); if (unlockAll) C.Meta.maxAll(meta);
    const r = C.Run.create(meta, Math.floor(master.next() * 4e9), cls);
    let won = false;
    while (true) {
      const b = new C.Battle(C.Run.currentEnemy(r), r.fight, C.Run.deckCards(r), r.maxHP, r.augments, C.Meta.classBonus(meta, cls), Math.floor(master.next() * 4e9), cls);
      b.startBlock = C.Meta.startBlock(meta); b.start(); b.takeEvents();
      while (b.outcome === 'ongoing' && b.round < 40) playTurn(b);
      r.bestTurn = Math.max(r.bestTurn, b.bestTurn);
      if (b.outcome !== 'won') break;
      if (C.Run.isFinal(r)) { won = true; break; }
      C.Run.winFight(r, b, meta);
      if (r.pendingArtifact && master.chance(0.3)) C.Run.takeArtifact(r, meta);
      else {
        const pick = r.pendingBundles.find(x => x.theme === fav) ||
          r.pendingBundles.slice().sort((a, c) => c.cards.reduce((s, i) => s + card(i).cost, 0) - a.cards.reduce((s, i) => s + card(i).cost, 0))[0];
        C.Run.takeBundle(r, pick, meta);
      }
      let st = 'empower';
      while (st === 'empower') {
        const opts = C.Run.empowerable(r);
        const val = i => { const d = card(r.deck[i]); return (d.theme === fav ? 6 : 0) + d.cost * 2 + (d.damaging ? 3 : 0) + (d.type === 'artifact' ? 3 : 0) - r.stars[i] + master.next(); };
        st = C.Run.takeEmpower(r, opts.length ? opts.sort((a, c) => val(c) - val(a))[0] : null, meta);
      }
      if (st === 'augment') C.Run.takeAugment(r, r.pendingAugments[0]);
    }
    if (won) wins++; fightSum += r.fight; bestSum += r.bestTurn;
  }
  return `win ${(100 * wins / runs).toFixed(1)}%  avg fight ${(fightSum / runs).toFixed(2)}  best turn avg ${(bestSum / runs).toFixed(0)}`;
}
const n = +process.argv[2] || 600;
const only = process.argv[3];
for (const cls of ['pyro', 'arcanist']) {
  if (only && only !== cls) continue;
  console.log(`== ${C.CLASSES[cls].name}`);
  console.log('fresh, mixed       ', simulate(n, false, null, 1, cls));
  console.log('all unlocks, mixed ', simulate(n, true, null, 2, cls));
  for (const t of C.Meta.themes(C.Meta.maxAll(C.newMeta()), cls))
    console.log(('loves ' + t).padEnd(19), simulate(n, true, t, 3, cls));
}
