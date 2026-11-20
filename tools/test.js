const C = require('../src/core.js');
let fails = 0;
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok', m); };
const pad = d => d.concat(Array(Math.max(0, 6 - d.length)).fill('strike'));
function battle(deck, enemy = 'inkLeech', aug = []) {
  const b = new C.Battle(enemy, 1, deck, 30, aug, 0, 7); b.start(); b.draw(10); b.takeEvents(); return b;
}
const cardOf = (b, id) => b.hand.find(c => c.id === id);
const playId = (b, id) => b.play(cardOf(b, id).uid);
{ const b = new C.Battle('inkLeech', 1, Array(10).fill('strike'), 30, [], 0, 7); b.start(); b.takeEvents();
  check(b.round === 1 && b.energy === 1 && b.hand.length === 4, 'round 1');
  b.endTurn(); b.takeEvents(); check(b.round === 2 && b.energy === 2 && b.hand.length === 5, 'round 2 hand kept'); }
{ const b = battle(pad(['ashling', 'ashling'])); b.energy = 10;
  const a = b.hand.filter(c => c.id === 'ashling'); b.play(a[0].uid); b.play(a[1].uid);
  check(b.ash === 1 && b.allies.player, 'replace creature -> ash'); }
{ const b = battle(pad(['ashling', 'guardUp'])); b.energy = 10;
  playId(b, 'ashling'); playId(b, 'guardUp'); b.hitFront('player', 8);
  check(!b.allies.player && b.block === 0 && b.hp === 28, 'overflow through block'); }
{ const b = battle(['cinderLamp', 'boneAltar', 'ironTotem', 'ashCenser']); b.energy = 20;
  for (const id of ['cinderLamp', 'boneAltar', 'ironTotem', 'ashCenser']) playId(b, id);
  check(b.artifacts.length === 3 && b.artifacts[0].id === 'boneAltar', '4th artifact replaces oldest'); }
{ const b = battle(pad(['emberDart', 'catalyst'])); b.energy = 10;
  playId(b, 'emberDart'); playId(b, 'catalyst');
  const before = b.enemyHP; check(b.scorch === 12, 'scorch 12');
  b.endTurn(); b.takeEvents(); check(b.scorch === 11 && b.enemyHP <= before - 12, 'scorch ticks and fades'); }
{ const b = battle(pad(['turncoat']), 'huskShepherd'); b.energy = 10;
  b.allies.enemy = { id: 99, name: 'Husk', side: 'enemy', power: 3, health: 4, maxHealth: 4, cardID: null, minion: 'husk', fresh: false };
  const before = b.enemyHP; playId(b, 'turncoat');
  check(!b.allies.enemy && b.enemyHP === before - 9, 'turncoat triple'); }
{ const b = battle(pad(['boneWall']), 'ashenKnight'); b.energy = 10; playId(b, 'boneWall');
  b.intent = { kind: 'lunge', amount: 7, hits: 1 }; const hp = b.hp; b.endTurn(); b.takeEvents();
  check(b.hp === hp - 7 && b.allies.player.health === 11, 'lunge skips creature'); }
// Empower
{ check(C.scale(3, 0) === 3 && C.scale(3, 1) === 5 && C.scale(3, 2) === 6 && C.scale(3, 3) === 8, 'star scaling'); check(C.cardText('strike', 2) === 'Deal 6 damage.', 'empowered text');
  const b = battle([{ id: 'emberBolt', lvl: 2 }, 'strike', 'strike', 'strike', 'strike', 'strike']); b.energy = 10;
  const hp = b.enemyHP; playId(b, 'emberBolt'); check(b.enemyHP === hp - 12, 'empowered bolt deals 12');
  const b2 = battle([{ id: 'huskHound', lvl: 1 }, 'strike', 'strike', 'strike', 'strike', 'strike']); b2.energy = 10; playId(b2, 'huskHound');
  check(b2.allies.player.power === 3 && b2.allies.player.health === 5, 'empowered creature stats'); }
// Burn grows
{ const b = battle(pad([])); b.ash = 3; const d1 = b.burnDamage; b.useBurn(); b.ash = 3; check(b.burnDamage === d1 + 6, 'burn grows by 6'); }
// Spellbound
{ const b = battle(['glimmer', 'ritual', 'spellstorm', 'familiar', 'strike', 'strike']); b.energy = 10;
  playId(b, 'familiar'); playId(b, 'glimmer'); playId(b, 'ritual');
  check(b.allies.player.power === 4 && b.energy === 10, 'familiar grows, ritual nets +2');
  const before = b.enemyHP; playId(b, 'spellstorm'); check(before - b.enemyHP === 10, 'spellstorm counts 2 prior spells'); }
{ const b = battle(pad(['echoChamber', 'emberBolt'])); b.energy = 10; playId(b, 'echoChamber');
  const hp = b.enemyHP; playId(b, 'emberBolt'); check(b.enemyHP === hp - 12, 'echo chamber casts twice');
  const hp2 = b.enemyHP; playId(b, 'strike'); check(b.enemyHP === hp2 - 3, 'only the first spell echoes'); }
{ const b = battle(pad(['fireball'])); b.energy = 7; const hp = b.enemyHP; playId(b, 'fireball');
  check(b.enemyHP === hp - 24 && b.energy === 0, 'fireball spends all energy'); }
// Bloodrite
{ const b = battle(pad(['chalice', 'crimsonPact', 'leechBite'])); b.energy = 10; playId(b, 'chalice'); playId(b, 'crimsonPact');
  check(b.hp === 25, 'crimson pact costs 5 HP'); const hp = b.enemyHP; playId(b, 'leechBite');
  check(b.hp === 29 && b.enemyHP === hp - 8, 'lifesteal heals, chalice converts heal to damage'); }
// Echoes
{ const b = battle(pad(['restless', 'kindle', 'boneHarvest', 'recall'])); b.energy = 20; playId(b, 'restless'); playId(b, 'kindle');
  check(cardOf(b, 'restless') && b.ash === 1, 'restless dead returns to hand');
  const n = b.discard.length; const hp = b.enemyHP; playId(b, 'boneHarvest'); check(b.enemyHP === hp - 2 * (n + 1), 'bone harvest counts used pile');
  playId(b, 'recall'); check(cardOf(b, 'boneHarvest'), 'recall returns last spell'); }
// Turn damage tally
{ const b = battle(pad([])); b.energy = 10; playId(b, 'strike'); playId(b, 'strike'); check(b.turnDamage === 6 && b.bestTurn === 6, 'turn damage tallied'); }
// Run flow with empower
{ const meta = C.newMeta(); const r = C.Run.create(meta, 5);
  check(r.opponents.length === 8 && r.stars.length === 10, '8 opponents, stars');
  const b = new C.Battle(C.Run.currentEnemy(r), 1, C.Run.deckCards(r), 30, [], 0, 1);
  C.Run.winFight(r, b, meta); check(r.pendingBundles.length === 3 && r.pendingArtifact, 'bundles + artifact offered');
  check(C.Run.takeBundle(r, r.pendingBundles[0], meta) === 'empower' && r.deck.length === 13 && r.stars.length === 13, 'bundle then empower');
  check(C.Run.takeEmpower(r, 0, meta) === 'preFight' && r.stars[0] === 1 && r.fight === 2, 'empowered and moved on');
  const old = { ...JSON.parse(JSON.stringify(r)) }; delete old.stars; C.Run.fix(old); check(old.stars.length === old.deck.length, 'old save loads');
  const back = JSON.parse(JSON.stringify(r)); check(back.fight === 2 && back.rngState === r.rngState, 'save round trip'); }
console.log(fails ? fails + ' FAILURES' : 'ALL PASS');
