const C = require('../src/core.js');
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); };
const pad = d => d.concat(Array(Math.max(0, 6 - d.length)).fill('strike'));
function battle(deck, enemy = 'inkLeech', aug = []) {
  const b = new C.Battle(enemy, 1, deck, 30, aug, 0, 7); b.start(); b.draw(10); b.takeEvents(); return b;
}
const cardOf = (b, id) => b.hand.find(c => c.id === id);
{ const b = new C.Battle('inkLeech', 1, Array(10).fill('strike'), 30, [], 0, 7); b.start(); b.takeEvents();
  check(b.round === 1 && b.energy === 1 && b.hand.length === 4, 'round 1');
  b.endTurn(); b.takeEvents(); check(b.round === 2 && b.energy === 2 && b.hand.length === 5, 'round 2 hand kept'); }
{ const b = battle(pad(['ashling', 'ashling'])); b.energy = 10;
  const a = b.hand.filter(c => c.id === 'ashling'); b.play(a[0].uid); b.play(a[1].uid);
  check(b.ash === 1 && b.allies.player, 'replace creature -> ash'); }
{ const b = battle(pad(['ashling', 'guardUp'])); b.energy = 10;
  b.play(cardOf(b, 'ashling').uid); b.play(cardOf(b, 'guardUp').uid); b.hitFront('player', 8);
  check(!b.allies.player && b.block === 0 && b.hp === 28, 'overflow through block'); }
{ const b = battle(['cinderLamp', 'boneAltar', 'ironTotem', 'ashCenser']); b.energy = 20;
  for (const id of ['cinderLamp', 'boneAltar', 'ironTotem', 'ashCenser']) b.play(cardOf(b, id).uid);
  check(b.artifacts.length === 3 && b.artifacts[0].id === 'boneAltar', '4th artifact replaces oldest'); }
{ const b = battle(pad(['emberDart', 'catalyst'])); b.energy = 10;
  b.play(cardOf(b, 'emberDart').uid); b.play(cardOf(b, 'catalyst').uid);
  const before = b.enemyHP; check(b.scorch === 10, 'scorch 10');
  b.endTurn(); b.takeEvents(); check(b.scorch === 9 && b.enemyHP <= before - 10, 'scorch ticks and fades'); }
{ const b = battle(pad(['turncoat']), 'huskShepherd'); b.energy = 10;
  b.allies.enemy = { id: 99, name: 'Husk', side: 'enemy', power: 3, health: 4, maxHealth: 4, cardID: null, minion: 'husk', fresh: false };
  const before = b.enemyHP; b.play(cardOf(b, 'turncoat').uid);
  check(!b.allies.enemy && b.enemyHP === before - 9, 'turncoat triple'); }
{ const b = battle(pad(['boneWall']), 'ashenKnight'); b.energy = 10; b.play(cardOf(b, 'boneWall').uid);
  b.intent = { kind: 'lunge', amount: 7, hits: 1 }; const hp = b.hp; b.endTurn(); b.takeEvents();
  check(b.hp === hp - 7 && b.allies.player.health === 11, 'lunge skips creature'); }
{ const meta = C.newMeta(); const r = C.Run.create(meta, 5);
  check(r.opponents.length === 8, '8 opponents');
  const b = new C.Battle(C.Run.currentEnemy(r), 1, r.deck, 30, [], 0, 1);
  C.Run.winFight(r, b, meta); check(r.pendingBundles.length === 3 && r.pendingArtifact, 'bundles + artifact offered');
  C.Run.takeBundle(r, r.pendingBundles[0], meta); check(r.fight === 2 && r.deck.length === 13, 'bundle taken');
  const back = JSON.parse(JSON.stringify(r)); check(back.fight === 2 && back.rngState === r.rngState, 'save round trip'); }
console.log(fails ? fails + ' FAILURES' : 'ALL PASS');
