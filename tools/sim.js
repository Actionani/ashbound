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
    if (a) return d.power + d.health > a.power + a.health + 2 ? 11 + d.cost * 3 : 0;
    return 13 + d.cost * 4;
  }
  if (d.damaging && c.id !== 'shieldBash') return 10 + d.cost * 4;
  switch (c.id) {
    case 'shieldBash': return b.block >= 6 ? 14 + (b.block >> 1) : 0;
    case 'guardUp': case 'brace': case 'secondWind': case 'ironSkin': { const need = incoming(b) - b.block; return need > 0 ? 12 + Math.min(need, 16) + d.cost : 1; }
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
  }
  return 1;
}
function playTurn(b) {
  for (let n = 0; n < 25; n++) {
    if (b.canBurn) { b.useBurn(); b.takeEvents(); if (b.outcome !== 'ongoing') return; }
    const opts = b.hand.filter(c => b.canPlay(c)).map(c => [c, score(b, c)]).filter(x => x[1] > 0);
    if (!opts.length) break;
    opts.sort((x, y) => y[1] - x[1]);
    b.play(opts[0][0].uid); b.takeEvents();
    if (b.outcome !== 'ongoing') return;
  }
  if (b.canStoke) { b.stoke(); b.takeEvents(); }
  if (b.canBurn) { b.useBurn(); b.takeEvents(); if (b.outcome !== 'ongoing') return; }
  b.endTurn(); b.takeEvents();
}
function simulate(runs, unlockAll, fav, seed) {
  const master = new C.RNG(seed);
  let wins = 0, fightSum = 0;
  for (let k = 0; k < runs; k++) {
    const meta = C.newMeta(); if (unlockAll) meta.unlocked = C.UNLOCKS.map(u => u.id);
    const r = C.Run.create(meta, Math.floor(master.next() * 4e9));
    let won = false;
    while (true) {
      const b = new C.Battle(C.Run.currentEnemy(r), r.fight, r.deck, r.maxHP, r.augments, C.Meta.burnBonus(meta), Math.floor(master.next() * 4e9));
      b.start(); b.takeEvents();
      while (b.outcome === 'ongoing' && b.round < 40) playTurn(b);
      if (b.outcome !== 'won') break;
      if (C.Run.isFinal(r)) { won = true; break; }
      C.Run.winFight(r, b, meta);
      let aug;
      if (r.pendingArtifact && master.chance(0.3)) aug = C.Run.takeArtifact(r, meta);
      else {
        const pick = r.pendingBundles.find(x => x.theme === fav) ||
          r.pendingBundles.slice().sort((a, c) => c.cards.reduce((s, i) => s + card(i).cost, 0) - a.cards.reduce((s, i) => s + card(i).cost, 0))[0];
        aug = C.Run.takeBundle(r, pick, meta);
      }
      if (aug) C.Run.takeAugment(r, r.pendingAugments[0]);
    }
    if (won) wins++; fightSum += r.fight;
  }
  return `win ${(100 * wins / runs).toFixed(1)}%  avg fight ${(fightSum / runs).toFixed(2)}`;
}
const n = +process.argv[2] || 600;
console.log('fresh, mixed       ', simulate(n, false, null, 1));
console.log('all unlocks, mixed ', simulate(n, true, null, 2));
for (const t of ['embers', 'bulwark', 'swarm', 'artifice', 'scorch', 'giants', 'pyre', 'hex'])
  console.log(('loves ' + t).padEnd(19), simulate(n, true, t, 3));
