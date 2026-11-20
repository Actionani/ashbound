// Ashbound rules, ported from the Swift version (Core/*.swift). No DOM here.
const Core = (() => {
  // ---------- RNG (mulberry32; state is a plain number so it saves easily) ----------
  class RNG {
    constructor(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    int(lo, hiExclusive) { return lo + Math.floor(this.next() * (hiExclusive - lo)); }
    chance(p) { return this.next() < p; }
    pick(a) { return a.length ? a[Math.floor(this.next() * a.length)] : undefined; }
    shuffle(a) {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
      return b;
    }
  }

  // ---------- Cards ----------
  // Numbers in {braces} are the card's power numbers: Empower (stars) scales them by +50% per star.
  const THEMES = {
    starter: ['Starter', ''], embers: ['Embers', 'Direct damage spells'], bulwark: ['Bulwark', 'Block and sturdy walls'],
    swarm: ['Swarm', 'Small creatures that die for value'], artifice: ['Artifice', 'Artifacts that keep working'],
    scorch: ['Scorch', 'Damage over time'], giants: ['Giants', 'Big creatures and buffs'], pyre: ['Pyre', 'Ash and Burn'],
    hex: ['Hex', 'Curses that cripple the enemy'], spellbound: ['Spellbound', 'Chain spells for one huge turn'],
    bloodrite: ['Bloodrite', 'Spend HP for power, drain it back'], echoes: ['Echoes', 'Your used pile comes back'],
    legendary: ['Legendary', ''],
  };
  const C = [];
  const nums = text => (text.match(/\{\d+\}/g) || []).map(x => +x.slice(1, -1));
  const spell = (id, name, cost, theme, text, o = {}) =>
    C.push({ id, name, cost, type: 'spell', theme, text, nums: nums(text), power: 0, health: 0, needsAlly: !!o.needsAlly, damaging: !!o.damaging, charges: 0 });
  const creature = (id, name, cost, theme, p, h, text = '') =>
    C.push({ id, name, cost, type: 'creature', theme, text, nums: nums(text), power: p, health: h, needsAlly: false, damaging: false, charges: 0 });
  const artifact = (id, name, cost, theme, text, charges = 0) =>
    C.push({ id, name, cost, type: 'artifact', theme, text, nums: nums(text), power: 0, health: 0, needsAlly: false, damaging: false, charges });
  const D = { damaging: true }, A = { needsAlly: true };

  spell('strike', 'Strike', 1, 'starter', 'Deal {3} damage.', D);
  spell('guardUp', 'Guard', 1, 'starter', 'Gain {4} Block.');
  creature('ashling', 'Ashling', 1, 'starter', 1, 2);
  spell('emberBolt', 'Ember Bolt', 2, 'starter', 'Deal {6} damage.', D);
  creature('huskHound', 'Husk Hound', 2, 'starter', 2, 3);
  artifact('cinderLamp', 'Cinder Lamp', 2, 'starter', 'End of turn: Deal {3} damage.');

  spell('flameJab', 'Flame Jab', 1, 'embers', 'Deal {3} damage. Draw a card.', D);
  spell('twinFlames', 'Twin Flames', 2, 'embers', 'Deal {6} damage twice.', D);
  spell('searingBolt', 'Searing Bolt', 3, 'embers', 'Deal {12} damage.', D);
  spell('firestorm', 'Firestorm', 5, 'embers', 'Deal {19} damage.', D);
  spell('inferno', 'Inferno', 6, 'embers', 'Deal {26} damage.', D);
  spell('fireball', 'Fireball', 1, 'embers', 'Spend all your energy. Deal {4} damage per energy spent.', D);

  spell('brace', 'Brace', 2, 'bulwark', 'Gain {9} Block.');
  spell('secondWind', 'Second Wind', 2, 'bulwark', 'Gain {5} Block. Draw a card.');
  creature('boneWall', 'Bone Wall', 3, 'bulwark', 1, 11);
  spell('ironSkin', 'Iron Skin', 4, 'bulwark', 'Gain {18} Block.');
  artifact('ironTotem', 'Iron Totem', 3, 'bulwark', 'Start of turn: Gain {4} Block.');
  spell('shieldBash', 'Shield Bash', 1, 'bulwark', 'Deal damage equal to your Block.', D);

  creature('cinderMoth', 'Cinder Moth', 0, 'swarm', 1, 1, 'Deathrattle: Deal {3} damage.');
  creature('emberFox', 'Ember Fox', 1, 'swarm', 2, 1, 'Deathrattle: Draw a card.');
  spell('kindle', 'Kindle', 0, 'swarm', 'Sacrifice your creature. Draw 2 cards.', A);
  spell('swarmCall', 'Swarm Call', 1, 'swarm', 'Sacrifice your creature. Summon a Cinder Moth.');
  creature('broodMother', 'Brood Mother', 4, 'swarm', 4, 5, 'Deathrattle: Summon a Cinder Moth.');

  artifact('boneAltar', 'Bone Altar', 1, 'artifice', 'After your creature dies, deal {5} damage.');
  artifact('ashCenser', 'Ash Censer', 2, 'artifice', 'Start of turn: Gain 1 Ash.');
  artifact('mirrorShard', 'Mirror Shard', 2, 'artifice', 'Enemy attacks deal {4} less. Lasts 4 attacks.', 4);
  artifact('hourglass', 'Hourglass', 2, 'artifice', 'Gain +1 energy each turn.');
  creature('clockworkGolem', 'Clockwork Golem', 3, 'artifice', 3, 5, '+{3}/+{3} for each artifact you have.');

  spell('emberDart', 'Ember Dart', 1, 'scorch', 'Apply {6} Scorch.');
  spell('smokeCloud', 'Smoke Cloud', 2, 'scorch', 'Apply {10} Scorch.');
  spell('catalyst', 'Catalyst', 2, 'scorch', "Double the enemy's Scorch.");
  creature('scorchImp', 'Scorch Imp', 2, 'scorch', 2, 3, 'After this attacks, apply {3} Scorch.');
  artifact('brazier', 'Brazier', 2, 'scorch', 'End of turn: Apply {3} Scorch.');
  spell('wildfire', 'Wildfire', 4, 'scorch', 'Deal damage equal to Scorch. Apply {4} Scorch.');

  spell('fanFlames', 'Fan the Flames', 2, 'giants', 'Give your creature +{4} attack.', A);
  creature('hound', 'Hound', 3, 'giants', 4, 5);
  spell('battleCry', 'Battle Cry', 3, 'giants', 'Give your creature +{2}/+{6}.', A);
  creature('stoneWarden', 'Stone Warden', 5, 'giants', 6, 9);
  creature('pyreGiant', 'Pyre Giant', 7, 'giants', 10, 12);

  spell('stokeSpark', 'Spark', 0, 'pyre', 'Gain 1 Ash. Draw a card.');
  spell('ashBlade', 'Ash Blade', 3, 'pyre', 'Deal {7} damage. Gain 1 Ash.', D);
  spell('lastRites', 'Last Rites', 2, 'pyre', 'Sacrifice your creature. Fill your Ash.', A);
  spell('heatUp', 'Heat Up', 2, 'pyre', 'Your Burn deals +{8} damage this fight.');
  creature('phoenix', 'Phoenix', 5, 'pyre', 5, 6, 'Deathrattle: Gain 2 Ash.');

  spell('weaken', 'Weaken', 1, 'hex', 'Enemy attacks deal {6} less this round.');
  spell('rot', 'Rot', 1, 'hex', 'Start of turn: Deal {3} damage to the enemy. Stacks.');
  spell('expose', 'Expose', 1, 'hex', "Destroy the enemy's Block. It can't Block this round. Draw a card.");
  spell('turncoat', 'Turncoat', 2, 'hex', "The enemy's minion hits its master for {3}× its attack, then dies.");
  spell('smother', 'Smother', 2, 'hex', "Counter the enemy's next action.");

  creature('familiar', 'Arcane Familiar', 2, 'spellbound', 2, 3, 'After you cast a spell, gain +{1}/+{1}.');
  spell('glimmer', 'Glimmer', 0, 'spellbound', 'Draw a card.');
  spell('ritual', 'Ember Ritual', 1, 'spellbound', 'Gain 3 energy.');
  spell('spellstorm', 'Spellstorm', 1, 'spellbound', 'Deal {5} damage for each other spell you cast this turn.', D);
  artifact('echoChamber', 'Echo Chamber', 2, 'spellbound', 'Your first spell each turn is cast twice.');

  spell('leechBite', 'Leech Bite', 1, 'bloodrite', 'Lifesteal. Deal {4} damage.', D);
  spell('bloodPact', 'Blood Pact', 0, 'bloodrite', 'Lose 3 HP. Draw 2 cards.');
  spell('crimsonPact', 'Crimson Pact', 2, 'bloodrite', 'Lose 5 HP. Deal {16} damage.', D);
  creature('vampire', 'Vampire', 3, 'bloodrite', 3, 4, 'Lifesteal.');
  artifact('chalice', 'Sanguine Chalice', 2, 'bloodrite', 'Whenever you heal, deal that much damage.');
  spell('martyrsFury', "Martyr's Fury", 2, 'bloodrite', 'Deal damage equal to your missing HP.', D);

  spell('boneHarvest', 'Bone Harvest', 2, 'echoes', 'Deal {2} damage per card in your used pile.', D);
  spell('recall', 'Recall', 1, 'echoes', 'Return the last spell from your used pile to your hand.');
  creature('restless', 'Restless Dead', 2, 'echoes', 2, 3, 'Deathrattle: Return this to your hand.');
  creature('ghoul', 'Grave Ghoul', 3, 'echoes', 1, 1, '+{1}/+{1} for each card in your used pile.');
  artifact('ossuary', 'Ossuary', 2, 'echoes', 'Start of turn: Return a random used card to your hand.');

  artifact('sunForge', 'Sun Forge', 5, 'legendary', 'Start of turn: Deal {4} damage. Gain {4} Block.');
  artifact('soulFurnace', 'Soul Furnace', 3, 'legendary', 'After your creature dies, gain 1 energy and draw a card.');
  artifact('ashenCrown', 'Ashen Crown', 5, 'legendary', 'Your creature attacks twice.');
  artifact('graveBell', 'Grave Bell', 3, 'legendary', 'After your creature dies, deal damage equal to its attack.');
  artifact('clockworkHeart', 'Clockwork Heart', 4, 'legendary', 'End of turn: If you have no creature, summon a {3}/{4} Cog Hound.');
  artifact('pyreAltar', 'Pyre Altar', 4, 'legendary', 'After you Burn, gain {10} Block and draw 2 cards.');
  artifact('eternalEmber', 'Eternal Ember', 3, 'legendary', 'Scorch no longer fades.');

  const CARDS = Object.fromEntries(C.map(c => [c.id, c]));
  const card = id => CARDS[id];
  const cardsOf = theme => C.filter(c => c.theme === theme);
  const STARTER = ['strike', 'strike', 'strike', 'guardUp', 'guardUp', 'ashling', 'ashling', 'emberBolt', 'huskHound', 'cinderLamp'];

  // ---------- Empower (stars) ----------
  const MAX_STARS = 3;
  const scale = (n, lvl) => Math.round(n * (1 + 0.5 * (lvl || 0)));
  const canEmpower = id => { const d = card(id); return d.nums.length > 0 || d.type === 'creature'; };
  const stats = (id, lvl) => { const d = card(id); return [scale(d.power, lvl), scale(d.health, lvl)]; };
  // Card text as segments so screens can highlight grown numbers: [{t}, {n, up}].
  const textParts = (id, lvl) => card(id).text.split(/(\{\d+\})/).filter(Boolean)
    .map(x => /^\{\d+\}$/.test(x) ? { n: scale(+x.slice(1, -1), lvl), up: (lvl || 0) > 0 } : { t: x });
  const cardText = (id, lvl) => textParts(id, lvl).map(p => p.t != null ? p.t : p.n).join('');

  const MAX_ENERGY = 10, STOKE_COST = 2, MAX_ARTIFACTS = 3, TOTAL_FIGHTS = 8;

  // ---------- Augments ----------
  const AUGMENTS = {
    emberHeart: ['Ember Heart', '+1 energy every turn.'],
    phoenixFeather: ['Phoenix Feather', 'Once per fight, survive a lethal hit with 10 HP.'],
    hotCoals: ['Hot Coals', 'Burn needs only 2 Ash.'],
    graveLantern: ['Grave Lantern', 'Your creatures have +2/+2.'],
    whetstone: ['Whetstone', 'Your damage spells deal +2 damage.'],
    ironThimble: ['Iron Thimble', 'Start each fight with 10 Block.'],
    boneDice: ['Bone Dice', 'Start each fight with 2 extra cards.'],
    ashCrown: ['Ash Crown', 'Stoke costs 1.'],
    mourningVeil: ['Mourning Veil', 'After your creature dies, gain 5 Block.'],
    brandOfFury: ['Brand of Fury', 'Burn deals double damage.'],
    wellspring: ['Wellspring', 'Draw 2 cards each turn.'],
    cinderCloak: ['Cinder Cloak', 'Start of turn: Gain 1 Ash.'],
    bloodFang: ['Blood Fang', 'Your damage spells have Lifesteal 2.'],
    kindledWounds: ['Kindled Wounds', 'Your Scorch applies +2.'],
    forgeMaster: ['Forgemaster', 'Empower 2 cards after each fight.'],
  };
  const AUGMENT_IDS = Object.keys(AUGMENTS);

  // ---------- Enemies ----------
  const MINIONS = {
    husk: ['Husk', 2, 2], bonewall: ['Bonewall', 2, 7], wisp: ['Wisp', 3, 2], grub: ['Grub', 3, 4],
    pyreguard: ['Pyreguard', 6, 10], shade: ['Shade', 5, 8], abbeyGuard: ['Abbey Guard', 4, 12],
  };
  const at = (n, hits = 1) => ({ kind: 'attack', amount: n, hits });
  const bl = n => ({ kind: 'block', amount: n });
  const en = n => ({ kind: 'enrage', amount: n });
  const he = n => ({ kind: 'heal', amount: n });
  const su = m => ({ kind: 'summon', amount: 0, minion: m });
  const lu = n => ({ kind: 'lunge', amount: n });
  const wi = n => ({ kind: 'wither', amount: n });
  const sh = () => ({ kind: 'shatter', amount: 0 });
  const ENEMIES = {
    huskShepherd: { name: 'Husk Shepherd', title: 'Herder of the Hollow', tier: 1, hp: 34, hue: 0.08, pattern: [su('husk'), at(3), at(4), en(1)] },
    cinderWraith: { name: 'Cinder Wraith', title: 'Smoke Given Hunger', tier: 1, hp: 30, hue: 0.03, pattern: [at(2, 2), bl(5), at(5)] },
    inkLeech: { name: 'Ink Leech', title: 'That Which Drinks Names', tier: 1, hp: 34, hue: 0.75, pattern: [at(4), he(5), at(5)] },
    graveWarden: { name: 'Grave Warden', title: 'Keeper of Quiet Stones', tier: 2, hp: 62, hue: 0.6, pattern: [bl(7), at(6), su('bonewall'), lu(6), at(8)] },
    paleChoir: { name: 'Pale Chorister', title: 'A Hymn Without Throat', tier: 2, hp: 56, hue: 0.5, pattern: [su('wisp'), lu(5), at(6), en(2)] },
    hollowMatron: { name: 'Hollow Matron', title: 'Mother of Grubs', tier: 2, hp: 60, hue: 0.3, pattern: [su('grub'), at(6), wi(3), he(8), at(8)] },
    ashenKnight: { name: 'Ashen Knight', title: 'Oathless Blade', tier: 2, hp: 64, hue: 0.0, pattern: [at(7), sh(), lu(7), at(4, 2), en(2)] },
    boneOracle: { name: 'Bone Oracle', title: 'Reader of Marrow', tier: 3, hp: 92, hue: 0.85, pattern: [wi(3), at(8), lu(9), bl(12), at(10)] },
    ironAbbot: { name: 'The Iron Abbot', title: 'Who Prays With Hammers', tier: 3, hp: 100, hue: 0.12, pattern: [bl(12), at(10), sh(), su('abbeyGuard'), wi(4), at(6, 2), en(3)] },
    wardenOfPyres: { name: 'Warden of Pyres', title: 'Last Keeper of the Flame', tier: 4, hp: 140, hue: 0.06, pattern: [su('pyreguard'), at(10), lu(10), sh(), at(7, 2), wi(3), en(3), at(13)] },
    silentChoir: { name: 'The Silent Choir', title: 'Many Mouths, No Voice', tier: 4, hp: 120, hue: 0.55, pattern: [at(5, 3), wi(4), su('shade'), lu(11), he(15), at(12), en(3)] },
  };
  const TUNING = { 1: [1.0, 0.9], 2: [1.1, 1.1], 3: [1.2, 1.4], 4: [1.15, 1.5] };
  const enemiesOfTier = t => Object.keys(ENEMIES).filter(k => ENEMIES[k].tier === t);

  // ---------- Battle ----------
  const BURN_GROWTH = 6;
  class Battle {
    constructor(enemyId, fight, deck, maxHP, augments, burnBonus, seed) {
      this.enemyId = enemyId;
      this.enemy = ENEMIES[enemyId];
      this.fight = fight;
      this.aug = new Set(augments);
      this.burnBonus = burnBonus;
      this.rng = new RNG(seed);
      this.hp = maxHP; this.maxHP = maxHP;
      this.block = 0; this.energy = 0; this.maxEnergyThisRound = 0;
      this.ash = 0; this.ashGainedTotal = 0; this.heat = 0; this.burns = 0;
      this.stokedThisTurn = false; this.featherUsed = false;
      this.spellsThisTurn = 0; this.echoUsed = false; this.turnDamage = 0; this.bestTurn = 0;
      this.nextID = 1;
      this.drawPile = this.rng.shuffle(deck.map(e => this.makeCard(e)));
      this.hand = []; this.discard = []; this.artifacts = [];
      this.round = 0;
      this.enemyMaxHP = Math.round(this.enemy.hp * TUNING[this.enemy.tier][0]);
      this.enemyHP = this.enemyMaxHP;
      this.enemyBlock = 0; this.enrage = 0; this.intent = null; this.patternIndex = 0;
      this.weaken = 0; this.exposed = false; this.smothered = false; this.rotDmg = 0; this.scorch = 0;
      this.allies = { player: null, enemy: null };
      this.events = []; this.outcome = 'ongoing';
    }
    makeCard(e) { return typeof e === 'string' ? { uid: this.nextID++, id: e, lvl: 0 } : { uid: this.nextID++, id: e.id, lvl: e.lvl || 0 }; }
    // The i-th {number} of a card, artifact or creature, grown by its stars.
    N(o, i = 0) { return scale(card(o.cardID || o.id).nums[i], o.lvl); }
    ev(type, data = {}) { this.events.push(this.captureSnaps ? { type, ...data, snap: this.snapshot() } : { type, ...data }); }
    snapshot() {
      const cp = a => a ? { ...a } : null;
      return {
        hp: this.hp, maxHP: this.maxHP, block: this.block, energy: this.energy, maxE: this.maxEnergyThisRound,
        ash: this.ash, ashNeeded: this.ashNeeded, canStoke: this.canStoke, canBurn: this.canBurn, burnDamage: this.burnDamage,
        stokePrice: this.stokePrice, stoked: this.stokedThisTurn, turnDamage: this.turnDamage,
        enemyHP: this.enemyHP, enemyMaxHP: this.enemyMaxHP, enemyBlock: this.enemyBlock,
        allies: { player: cp(this.allies.player), enemy: cp(this.allies.enemy) },
        artifacts: this.artifacts.map(a => ({ ...a })), hand: this.hand.map(c => ({ ...c })),
        drawCount: this.drawPile.length, discardCount: this.discard.length, round: this.round,
        status: this.enemyStatus, intent: this.intentText(),
      };
    }
    has(id) { return this.artifacts.some(a => a.id === id); }
    count(id) { return this.artifacts.filter(a => a.id === id).length; }

    get ashNeeded() { return this.aug.has('hotCoals') ? 2 : 3; }
    get canBurn() { return this.outcome === 'ongoing' && this.ash >= this.ashNeeded; }
    get burnDamage() { return (12 + this.burnBonus + this.heat + BURN_GROWTH * this.burns) * (this.aug.has('brandOfFury') ? 2 : 1); }
    get stokePrice() { return this.aug.has('ashCrown') ? 1 : STOKE_COST; }
    get canStoke() { return this.outcome === 'ongoing' && !this.stokedThisTurn && this.energy >= this.stokePrice && this.ash < this.ashNeeded; }
    get spellBonus() { return this.aug.has('whetstone') ? 2 : 0; }

    canPlay(c) {
      const d = card(c.id);
      if (this.outcome !== 'ongoing' || d.cost > this.energy) return false;
      if (d.needsAlly && !this.allies.player) return false;
      if (c.id === 'turncoat' && !this.allies.enemy) return false;
      return true;
    }
    blockedReason(c) {
      const d = card(c.id);
      if (d.cost > this.energy) return 'Not enough energy. You get 1 more each round.';
      if (d.needsAlly && !this.allies.player) return 'You need a creature in front of you.';
      if (c.id === 'turncoat' && !this.allies.enemy) return 'The enemy has no minion.';
      return null;
    }

    start() {
      if (this.aug.has('ironThimble')) this.gainBlock(10);
      this.draw(3 + (this.aug.has('boneDice') ? 2 : 0));
      this.rollIntent(1);
      this.beginTurn();
    }

    beginTurn() {
      this.round++;
      this.turnDamage = 0; this.spellsThisTurn = 0; this.echoUsed = false;
      if (this.round > 1 && this.block !== 0) { this.block = 0; this.ev('block', { side: 'player', value: 0 }); }
      this.maxEnergyThisRound = Math.min(this.round, MAX_ENERGY) + (this.aug.has('emberHeart') ? 1 : 0) + this.count('hourglass');
      this.energy = this.maxEnergyThisRound;
      this.stokedThisTurn = false;
      this.ev('energy');
      if (this.scorch > 0) {
        this.ev('info', { text: `Scorch burns for ${this.scorch}.` });
        this.hitFace('enemy', this.scorch, true);
        if (this.outcome !== 'ongoing') return;
        if (!this.has('eternalEmber')) this.scorch--;
        this.ev('status');
      }
      if (this.rotDmg > 0) {
        this.ev('info', { text: `Rot gnaws for ${this.rotDmg}.` });
        this.hitFace('enemy', this.rotDmg, true);
        if (this.outcome !== 'ongoing') return;
      }
      for (const a of this.artifacts.slice()) {
        if (a.id === 'ironTotem') { this.ev('artifactFires', { uid: a.uid }); this.gainBlock(this.N(a)); }
        else if (a.id === 'ashCenser') { this.ev('artifactFires', { uid: a.uid }); this.gainAsh(1); }
        else if (a.id === 'sunForge') { this.ev('artifactFires', { uid: a.uid }); this.hitFront('enemy', this.N(a, 0)); this.gainBlock(this.N(a, 1)); }
        else if (a.id === 'ossuary' && this.discard.length && this.hand.length < 10) {
          this.ev('artifactFires', { uid: a.uid });
          const i = this.rng.int(0, this.discard.length);
          this.hand.push(this.discard.splice(i, 1)[0]); this.ev('hand');
        }
        if (this.outcome !== 'ongoing') return;
      }
      if (this.aug.has('cinderCloak')) this.gainAsh(1);
      this.draw(this.aug.has('wellspring') ? 2 : 1);
    }

    draw(n) {
      let drew = false;
      for (let i = 0; i < n; i++) {
        if (this.hand.length >= 10) break;
        if (!this.drawPile.length) {
          if (!this.discard.length) break;
          this.drawPile = this.rng.shuffle(this.discard);
          this.discard = [];
        }
        this.hand.push(this.drawPile.pop());
        drew = true;
      }
      if (drew) this.ev('hand');
    }

    play(uid) {
      if (this.outcome !== 'ongoing') return false;
      const idx = this.hand.findIndex(c => c.uid === uid);
      if (idx < 0) return false;
      const c = this.hand[idx], d = card(c.id);
      if (!this.canPlay(c)) return false;
      this.energy -= d.cost;
      this.ev('energy');
      this.hand.splice(idx, 1);
      this.ev('hand');
      if (d.type === 'artifact') this.placeArtifact(c);
      else if (d.type === 'creature') {
        this.discard.push(c);
        if (this.allies.player) this.killAlly('player');
        if (this.outcome === 'ongoing') this.summonPlayer(c.id, c.lvl, c.uid);
      } else {
        this.discard.push(c);
        const before = this.spellsThisTurn++;
        const times = this.has('echoChamber') && !this.echoUsed ? 2 : 1;
        if (times === 2) { this.echoUsed = true; this.ev('artifactFires', { uid: this.artifacts.find(a => a.id === 'echoChamber').uid }); }
        for (let k = 0; k < times && this.outcome === 'ongoing'; k++) {
          if (k === 1) this.ev('info', { text: `${d.name} echoes!` });
          this.resolve(c, before);
          if (d.damaging && this.aug.has('bloodFang')) this.healPlayer(2);
        }
        const f = this.allies.player;
        if (f && f.cardID === 'familiar' && this.outcome === 'ongoing') this.buffAlly(this.N(f, 0), this.N(f, 1));
      }
      this.checkOutcome();
      return true;
    }

    stoke() {
      if (!this.canStoke) return;
      this.energy -= this.stokePrice;
      this.stokedThisTurn = true;
      this.ev('energy');
      this.gainAsh(1);
    }

    useBurn() {
      if (!this.canBurn) return;
      this.ash = 0;
      this.ev('ash');
      const d = this.burnDamage;
      this.burns++;
      this.ev('burn', { amount: d });
      this.hitFace('enemy', d, true);
      for (const a of this.artifacts.slice()) {
        if (a.id === 'pyreAltar' && this.outcome === 'ongoing') {
          this.ev('artifactFires', { uid: a.uid });
          this.gainBlock(this.N(a));
          this.draw(2);
        }
      }
    }

    endTurn() {
      if (this.outcome !== 'ongoing') return;
      const a = this.allies.player;
      if (a && a.power > 0) {
        const swings = 1 + this.count('ashenCrown');
        for (let i = 0; i < swings; i++) {
          const cur = this.allies.player;
          if (!cur || cur.id !== a.id || this.outcome !== 'ongoing') break;
          this.ev('allyAttacks', { side: 'player' });
          const pw = cur.power;
          this.hitFront('enemy', pw);
          if (cur.cardID === 'scorchImp') this.applyScorch(this.N(cur));
          if (cur.cardID === 'vampire') this.healPlayer(pw);
        }
        if (this.outcome !== 'ongoing') return;
      }
      for (const art of this.artifacts.slice()) {
        if (art.id === 'cinderLamp') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', this.N(art)); }
        else if (art.id === 'brazier') { this.ev('artifactFires', { uid: art.uid }); this.applyScorch(this.N(art)); }
        else if (art.id === 'clockworkHeart' && !this.allies.player) {
          this.ev('artifactFires', { uid: art.uid });
          this.summonToken('Cog Hound', this.N(art, 0), this.N(art, 1));
        }
        if (this.outcome !== 'ongoing') return;
      }
      if (this.enemyBlock !== 0) { this.enemyBlock = 0; this.ev('block', { side: 'enemy', value: 0 }); }
      if (this.smothered) {
        this.smothered = false;
        this.ev('enemyActs', { text: `${this.enemy.name}'s action is countered.` });
        this.ev('status');
      } else if (this.intent) this.execute(this.intent);
      if (this.outcome !== 'ongoing') return;
      const m = this.allies.enemy;
      if (m && !m.fresh && m.power > 0) {
        this.ev('allyAttacks', { side: 'enemy' });
        this.enemyAttack(m.power, false);
        if (this.outcome !== 'ongoing') return;
      }
      if (this.allies.enemy && this.allies.enemy.fresh) this.allies.enemy.fresh = false;
      if (this.weaken !== 0 || this.exposed) { this.weaken = 0; this.exposed = false; this.ev('status'); }
      this.rollIntent(this.round + 1);
      this.beginTurn();
    }

    resolve(c, spellsBefore = 0) {
      const sb = this.spellBonus, n = i => this.N(c, i);
      switch (c.id) {
        case 'strike': case 'emberBolt': case 'searingBolt': case 'firestorm': case 'inferno': this.hitFront('enemy', n(0) + sb); break;
        case 'flameJab': this.hitFront('enemy', n(0) + sb); this.draw(1); break;
        case 'twinFlames': this.hitFront('enemy', n(0) + sb); if (this.outcome === 'ongoing') this.hitFront('enemy', n(0) + sb); break;
        case 'fireball': { const e = this.energy; this.energy = 0; this.ev('energy'); if (e > 0) this.hitFront('enemy', n(0) * e + sb); break; }
        case 'ashBlade': this.hitFront('enemy', n(0) + sb); this.gainAsh(1); break;
        case 'guardUp': case 'brace': case 'ironSkin': this.gainBlock(n(0)); break;
        case 'secondWind': this.gainBlock(n(0)); this.draw(1); break;
        case 'shieldBash': this.hitFront('enemy', this.block + sb); break;
        case 'kindle': this.killAlly('player'); if (this.outcome === 'ongoing') this.draw(2); break;
        case 'swarmCall':
          if (this.allies.player) this.killAlly('player');
          if (this.outcome === 'ongoing') this.summonPlayer('cinderMoth', c.lvl);
          break;
        case 'fanFlames': this.buffAlly(n(0), 0); break;
        case 'battleCry': this.buffAlly(n(0), n(1)); break;
        case 'stokeSpark': this.gainAsh(1); this.draw(1); break;
        case 'lastRites': this.killAlly('player'); this.gainAsh(this.ashNeeded); break;
        case 'heatUp': this.heat += n(0); this.ev('info', { text: `Burn now deals ${this.burnDamage}.` }); break;
        case 'weaken': this.weaken += n(0); this.ev('status'); break;
        case 'rot': this.rotDmg += n(0); this.ev('status'); break;
        case 'expose':
          this.exposed = true;
          if (this.enemyBlock > 0) { this.enemyBlock = 0; this.ev('block', { side: 'enemy', value: 0 }); }
          this.ev('status'); this.draw(1); break;
        case 'turncoat': {
          const m = this.allies.enemy;
          if (m) {
            this.ev('allyAttacks', { side: 'enemy' });
            this.ev('info', { text: `${m.name} turns on its master!` });
            this.hitFace('enemy', m.power * n(0));
            this.killAlly('enemy');
          }
          break;
        }
        case 'smother': this.smothered = true; this.ev('status'); break;
        case 'emberDart': case 'smokeCloud': this.applyScorch(n(0)); break;
        case 'catalyst': this.applyScorch(this.scorch); break;
        case 'wildfire': if (this.scorch > 0) this.hitFace('enemy', this.scorch + sb, true); this.applyScorch(n(0)); break;
        case 'glimmer': this.draw(1); break;
        case 'ritual': this.energy += 3; this.ev('energy'); break;
        case 'spellstorm': if (spellsBefore > 0) this.hitFront('enemy', n(0) * spellsBefore + sb); else this.ev('info', { text: 'No other spells this turn.' }); break;
        case 'leechBite': this.hitFront('enemy', n(0) + sb); this.healPlayer(n(0) + sb); break;
        case 'bloodPact': this.loseHP(3); if (this.outcome === 'ongoing') this.draw(2); break;
        case 'crimsonPact': this.loseHP(5); this.hitFront('enemy', n(0) + sb); break;
        case 'martyrsFury': this.hitFront('enemy', this.maxHP - this.hp + sb); break;
        case 'boneHarvest': this.hitFront('enemy', n(0) * this.discard.length + sb); break;
        case 'recall': {
          for (let i = this.discard.length - 1; i >= 0; i--) {
            const x = this.discard[i];
            if (x.uid !== c.uid && x.id !== 'recall' && card(x.id).type === 'spell') {
              if (this.hand.length < 10) { this.hand.push(this.discard.splice(i, 1)[0]); this.ev('hand'); }
              break;
            }
          }
          break;
        }
      }
    }

    applyScorch(n) {
      if (n <= 0 || this.outcome !== 'ongoing') return;
      this.scorch += n + (this.aug.has('kindledWounds') ? 2 : 0);
      this.ev('status');
    }
    loseHP(n) { this.hitFace('player', n, true); }

    buffAlly(p, h) {
      const a = this.allies.player;
      if (!a) return;
      a.power += p; a.health += h; a.maxHealth += h;
      this.ev('allyChanged', { side: 'player' });
    }

    placeArtifact(c) {
      if (this.artifacts.length >= MAX_ARTIFACTS) {
        const old = this.artifacts.shift();
        this.ev('info', { text: `${card(old.id).name} crumbles to make room.` });
      }
      this.artifacts.push({ uid: c.uid, id: c.id, lvl: c.lvl || 0, charges: card(c.id).charges });
      this.ev('artifacts');
    }

    summonPlayer(id, lvl = 0, srcUid = null) {
      const d = card(id);
      let [p, h] = stats(id, lvl);
      if (this.aug.has('graveLantern')) { p += 2; h += 2; }
      const o = { cardID: id, lvl };
      if (id === 'clockworkGolem') { p += this.N(o, 0) * this.artifacts.length; h += this.N(o, 1) * this.artifacts.length; }
      if (id === 'ghoul') { p += this.N(o, 0) * this.discard.length; h += this.N(o, 1) * this.discard.length; }
      this.allies.player = { id: this.nextID++, name: d.name, side: 'player', power: p, health: h, maxHealth: h, cardID: id, lvl, srcUid, minion: null, fresh: false };
      this.ev('allyIn', { side: 'player' });
    }
    summonToken(name, p, h) {
      if (this.aug.has('graveLantern')) { p += 2; h += 2; }
      this.allies.player = { id: this.nextID++, name, side: 'player', power: p, health: h, maxHealth: h, cardID: null, lvl: 0, minion: null, fresh: false };
      this.ev('allyIn', { side: 'player' });
    }
    summonMinion(m) {
      const [name, bp, bh] = MINIONS[m];
      const p = bp + Math.floor((this.round - 1) / 3), h = bh + Math.floor((this.round - 1) / 2);
      this.allies.enemy = { id: this.nextID++, name, side: 'enemy', power: p, health: h, maxHealth: h, cardID: null, minion: m, fresh: true };
      this.ev('allyIn', { side: 'enemy' });
    }

    hitFront(side, amount) {
      if (amount <= 0 || this.outcome !== 'ongoing') return;
      if (this.allies[side]) {
        const over = this.hitAlly(side, amount);
        if (over > 0) this.hitFace(side, over);
      } else this.hitFace(side, amount);
    }
    tally(side, n) { if (side === 'enemy' && n > 0) { this.turnDamage += n; this.bestTurn = Math.max(this.bestTurn, this.turnDamage); } }
    hitAlly(side, amount) {
      const a = this.allies[side];
      if (!a || amount <= 0) return 0;
      if (amount >= a.health) {
        const over = amount - a.health;
        this.tally(side, a.health);
        this.ev('allyHit', { side, amount: a.health, newHealth: 0 });
        this.killAlly(side);
        return over;
      }
      a.health -= amount;
      this.tally(side, amount);
      this.ev('allyHit', { side, amount, newHealth: a.health });
      return 0;
    }
    enemyAttack(raw, skipAlly) {
      let dmg = Math.max(0, raw - this.weaken);
      const i = this.artifacts.findIndex(a => a.id === 'mirrorShard');
      if (i >= 0) {
        const s = this.artifacts[i];
        dmg = Math.max(0, dmg - this.N(s));
        s.charges--;
        this.ev('artifactFires', { uid: s.uid });
        if (s.charges <= 0) { this.artifacts.splice(i, 1); this.ev('info', { text: 'The Mirror Shard breaks.' }); }
        this.ev('artifacts');
      }
      if (skipAlly) this.hitFace('player', dmg); else this.hitFront('player', dmg);
    }
    hitFace(side, amount, ignoreBlock = false) {
      if (amount <= 0 || this.outcome !== 'ongoing') return;
      let a = amount;
      if (!ignoreBlock) {
        const key = side === 'player' ? 'block' : 'enemyBlock';
        if (this[key] > 0) {
          const ab = Math.min(this[key], a);
          a -= ab; this[key] -= ab;
          this.ev('block', { side, value: this[key] });
        }
      }
      if (a > 0) {
        if (side === 'player') this.hp -= a; else this.enemyHP -= a;
        this.tally(side, a);
        this.ev('faceHit', { side, amount: a });
      }
      if (side === 'player' && this.hp <= 0 && this.aug.has('phoenixFeather') && !this.featherUsed) {
        this.featherUsed = true;
        const back = 10 - this.hp;
        this.hp = 10;
        this.ev('healed', { side: 'player', amount: back });
        this.ev('info', { text: 'The Phoenix Feather burns. You rise again!' });
      }
      this.checkOutcome();
    }
    killAlly(side) {
      const a = this.allies[side];
      if (!a) return;
      this.allies[side] = null;
      this.ev('allyDied', { side });
      if (side !== 'player') return;
      this.gainAsh(1);
      if (this.aug.has('mourningVeil')) this.gainBlock(5);
      for (const art of this.artifacts.slice()) {
        if (this.outcome !== 'ongoing') break;
        if (art.id === 'boneAltar') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', this.N(art)); }
        else if (art.id === 'graveBell') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', a.power); }
        else if (art.id === 'soulFurnace') { this.ev('artifactFires', { uid: art.uid }); this.energy++; this.ev('energy'); this.draw(1); }
      }
      if (a.cardID === 'cinderMoth') this.hitFront('enemy', this.N(a));
      else if (a.cardID === 'emberFox') this.draw(1);
      else if (a.cardID === 'phoenix') this.gainAsh(2);
      else if (a.cardID === 'broodMother' && this.outcome === 'ongoing' && !this.allies.player) this.summonPlayer('cinderMoth', a.lvl);
      else if (a.cardID === 'restless' && a.srcUid != null && this.hand.length < 10) {
        const i = this.discard.findIndex(x => x.uid === a.srcUid);
        if (i >= 0) { this.hand.push(this.discard.splice(i, 1)[0]); this.ev('hand'); }
      }
      this.checkOutcome();
    }
    gainAsh(n) {
      if (n <= 0) return;
      this.ashGainedTotal += n;
      const before = this.ash;
      this.ash = Math.min(this.ashNeeded, this.ash + n);
      if (this.ash !== before) this.ev('ash');
    }
    gainBlock(n) { if (n > 0) { this.block += n; this.ev('block', { side: 'player', value: this.block }); } }
    healPlayer(n) {
      const a = Math.min(n, this.maxHP - this.hp);
      if (a <= 0) return;
      this.hp += a; this.ev('healed', { side: 'player', amount: a });
      for (const art of this.artifacts.slice()) {
        if (art.id === 'chalice' && this.outcome === 'ongoing') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', a); }
      }
    }

    ramp(r, k = 1) { return Math.floor((r - 1) * TUNING[this.enemy.tier][1] * k); }
    rollIntent(r) {
      const t = this.enemy.pattern[this.patternIndex % this.enemy.pattern.length];
      this.patternIndex++;
      switch (t.kind) {
        case 'attack': this.intent = { kind: 'attack', amount: t.amount + (t.hits > 1 ? this.ramp(r, 0.5) : this.ramp(r)), hits: t.hits || 1 }; break;
        case 'lunge': this.intent = { kind: 'lunge', amount: t.amount + this.ramp(r, 0.8), hits: 1 }; break;
        case 'block': case 'heal': this.intent = { kind: t.kind, amount: t.amount + this.ramp(r, 1.5), hits: 1 }; break;
        case 'enrage': case 'wither': this.intent = { kind: t.kind, amount: t.amount, hits: 1 }; break;
        case 'shatter': this.intent = { kind: 'shatter', amount: 0, hits: 1 }; break;
        case 'summon':
          this.intent = !this.allies.enemy ? { kind: 'summon', amount: 0, hits: 1, minion: t.minion }
                                           : { kind: 'attack', amount: 3 + this.ramp(r), hits: 1 };
          break;
      }
    }
    execute(i) {
      const n = this.enemy.name;
      switch (i.kind) {
        case 'attack':
          this.ev('enemyActs', { text: `${n} attacks!` });
          for (let k = 0; k < i.hits && this.outcome === 'ongoing'; k++) this.enemyAttack(i.amount + this.enrage, false);
          break;
        case 'lunge':
          this.ev('enemyActs', { text: `${n} lunges past your creature!` });
          this.enemyAttack(i.amount + this.enrage, true);
          break;
        case 'block':
          if (this.exposed) this.ev('enemyActs', { text: `${n} tries to brace, but is Exposed.` });
          else { this.ev('enemyActs', { text: `${n} braces.` }); this.enemyBlock += i.amount; this.ev('block', { side: 'enemy', value: this.enemyBlock }); }
          break;
        case 'heal': {
          this.ev('enemyActs', { text: `${n} heals.` });
          const a = Math.min(i.amount, this.enemyMaxHP - this.enemyHP);
          if (a > 0) { this.enemyHP += a; this.ev('healed', { side: 'enemy', amount: a }); }
          break;
        }
        case 'enrage': this.ev('enemyActs', { text: `${n} grows angrier.` }); this.enrage += i.amount; this.ev('status'); break;
        case 'wither':
          this.ev('enemyActs', { text: `${n} withers your creature.` });
          if (this.allies.player) { this.allies.player.power = Math.max(0, this.allies.player.power - i.amount); this.ev('allyChanged', { side: 'player' }); }
          break;
        case 'shatter':
          if (!this.artifacts.length) this.ev('enemyActs', { text: `${n} swings at nothing.` });
          else { const old = this.artifacts.shift(); this.ev('enemyActs', { text: `${n} shatters your ${card(old.id).name}!` }); this.ev('artifacts'); }
          break;
        case 'summon':
          if (!this.allies.enemy && i.minion) { this.ev('enemyActs', { text: `${n} summons a ${MINIONS[i.minion][0]}.` }); this.summonMinion(i.minion); }
          break;
      }
    }
    intentText() {
      const i = this.intent;
      if (!i) return ['', ''];
      if (this.smothered) return ['Countered', 'Its next action fails'];
      const w = this.weaken > 0 ? ` (−${this.weaken})` : '';
      switch (i.kind) {
        case 'attack': { const n = Math.max(0, i.amount + this.enrage - this.weaken); return [i.hits > 1 ? `Attack ${n}×${i.hits}` : `Attack ${n}`, 'Hits your creature first' + w]; }
        case 'lunge': return [`Lunge ${Math.max(0, i.amount + this.enrage - this.weaken)}`, 'Skips your creature' + w];
        case 'block': return [`Block ${i.amount}`, this.exposed ? 'Blocked by Expose' : 'Shields itself'];
        case 'heal': return [`Heal ${i.amount}`, 'Restores its HP'];
        case 'enrage': return [`Enrage +${i.amount}`, 'Its attacks get stronger'];
        case 'wither': return [`Wither ${i.amount}`, "Your creature loses attack"];
        case 'shatter': return ['Shatter', this.artifacts.length ? 'Breaks your oldest artifact' : 'No artifact to break'];
        case 'summon': {
          const [name, bp, bh] = MINIONS[i.minion];
          return ['Summon', `${name} ${bp + Math.floor((this.round - 1) / 3)}/${bh + Math.floor((this.round - 1) / 2)}`];
        }
      }
      return ['', ''];
    }
    get enemyStatus() {
      const p = [];
      if (this.enrage > 0) p.push(`Enraged +${this.enrage}`);
      if (this.scorch > 0) p.push(`Scorch ${this.scorch}`);
      if (this.rotDmg > 0) p.push(`Rot ${this.rotDmg}/turn`);
      if (this.weaken > 0) p.push(`Weak −${this.weaken}`);
      if (this.exposed) p.push('Exposed');
      return p.join(' · ');
    }
    checkOutcome() {
      if (this.outcome !== 'ongoing') return;
      if (this.enemyHP <= 0) { this.enemyHP = 0; this.outcome = 'won'; }
      else if (this.hp <= 0) { this.hp = 0; this.outcome = 'lost'; }
    }
    takeEvents() { const e = this.events; this.events = []; return e; }
  }

  // ---------- Meta (permanent unlocks) ----------
  const UNLOCKS = [
    ['vitality1', 'Vitality I', 'Start every run with +3 max HP.', 40, null],
    ['themeGiants', 'Giants Bundles', 'Giants bundles can be offered: big creatures and buffs.', 50, null],
    ['hotterBurn', 'Hotter Burn I', 'Burn deals 2 more damage.', 60, null],
    ['themeHex', 'Hex Bundles', 'Hex bundles can be offered: Weaken, Rot, Smother and more.', 70, null],
    ['widerChoice', 'Wider Choice', 'See 4 card bundles after each fight instead of 3.', 80, null],
    ['vitality2', 'Vitality II', 'Start every run with +3 max HP.', 100, 'vitality1'],
    ['themePyre', 'Pyre Bundles', 'Pyre bundles can be offered: Ash and Burn.', 90, null],
    ['treasureHunter', 'Treasure Hunter', 'See 4 augments instead of 3.', 110, null],
    ['headStart', 'Head Start', 'Start every run with a random augment.', 150, null],
    ['hotterBurn2', 'Hotter Burn II', 'Burn deals 2 more damage.', 120, 'hotterBurn'],
    ['vitality3', 'Vitality III', 'Start every run with +3 max HP.', 160, 'vitality2'],
  ].map(([id, name, detail, cost, requires]) => ({ id, name, detail, cost, requires }));

  const newMeta = () => ({ ash: 0, lifetimeAsh: 0, unlocked: [], runs: 0, wins: 0, bestFight: 0, bestTurn: 0, soundOn: true, seenTutorial: false });
  const Meta = {
    vitality: m => ['vitality1', 'vitality2', 'vitality3'].filter(u => m.unlocked.includes(u)).length,
    burnBonus: m => ['hotterBurn', 'hotterBurn2'].filter(u => m.unlocked.includes(u)).length * 2,
    themes: m => {
      const t = ['embers', 'bulwark', 'swarm', 'artifice', 'scorch', 'spellbound', 'bloodrite', 'echoes'];
      if (m.unlocked.includes('themeHex')) t.push('hex');
      if (m.unlocked.includes('themeGiants')) t.push('giants');
      if (m.unlocked.includes('themePyre')) t.push('pyre');
      return t;
    },
    canBuy: (m, u) => !m.unlocked.includes(u.id) && m.ash >= u.cost && (!u.requires || m.unlocked.includes(u.requires)),
    buy: (m, u) => { if (!Meta.canBuy(m, u)) return false; m.ash -= u.cost; m.unlocked.push(u.id); return true; },
    bank: (m, n) => { m.ash += n; m.lifetimeAsh += n; },
  };

  // ---------- Run ----------
  const AUGMENT_AFTER = [2, 4, 6];
  const Run = {
    create(meta, seed) {
      const rng = new RNG(seed);
      const r = { rngState: 0, maxHP: 30 + 3 * Meta.vitality(meta), deck: STARTER.slice(), stars: STARTER.map(() => 0), augments: [], fight: 1, opponents: [],
                  stage: 'preFight', ashEarned: 0, pendingBundles: [], pendingAugments: [], pendingArtifact: null, empowersLeft: 0, bestTurn: 0 };
      r.opponents = [...rng.shuffle(enemiesOfTier(1)).slice(0, 2), ...rng.shuffle(enemiesOfTier(2)).slice(0, 3),
                     ...rng.shuffle(enemiesOfTier(3)).slice(0, 2), rng.shuffle(enemiesOfTier(4))[0]];
      if (meta.unlocked.includes('headStart')) r.augments.push(rng.pick(AUGMENT_IDS));
      r.rngState = rng.s;
      return r;
    },
    // Older saves have no stars: fill them in.
    fix(r) { if (!r) return r; r.stars = r.stars || []; while (r.stars.length < r.deck.length) r.stars.push(0); r.bestTurn = r.bestTurn || 0; r.empowersLeft = r.empowersLeft || 0; return r; },
    deckCards: r => r.deck.map((id, i) => ({ id, lvl: (r.stars && r.stars[i]) || 0 })),
    empowerable: r => r.deck.map((id, i) => i).filter(i => canEmpower(r.deck[i]) && (r.stars[i] || 0) < MAX_STARS),
    rng(r) { const g = new RNG(1); g.s = r.rngState; return g; },
    save(r, g) { r.rngState = g.s; },
    currentEnemy: r => r.opponents[Math.min(r.fight, r.opponents.length) - 1],
    isFinal: r => r.fight >= TOTAL_FIGHTS,
    nextSeed(r) { const g = Run.rng(r); const s = Math.floor(g.next() * 4294967296); Run.save(r, g); return s; },
    winFight(r, b, meta) {
      r.ashEarned += b.ashGainedTotal;
      r.bestTurn = Math.max(r.bestTurn || 0, b.bestTurn || 0);
      const g = Run.rng(r);
      const themes = g.shuffle(Meta.themes(meta)).slice(0, meta.unlocked.includes('widerChoice') ? 4 : 3);
      r.pendingBundles = themes.map(t => {
        const pool = cardsOf(t);
        const picks = [];
        let tries = 0;
        while (picks.length < 3 && tries < 40) {
          tries++;
          const c = g.pick(pool);
          if (c.cost >= 5 && r.fight < 3 && g.chance(0.7)) continue;
          if (picks.includes(c.id) && g.chance(0.6)) continue;
          picks.push(c.id);
        }
        return { theme: t, cards: picks.sort((a, b) => card(a).cost - card(b).cost) };
      });
      const owned = new Set(r.deck);
      r.pendingArtifact = g.pick(cardsOf('legendary').map(c => c.id).filter(id => !owned.has(id))) || null;
      r.stage = 'bundle';
      Run.save(r, g);
    },

    takeArtifact(r, meta) { Run.fix(r); if (r.pendingArtifact) { r.deck.push(r.pendingArtifact); r.stars.push(0); } return Run.takeBundle(r, null, meta); },
    takeBundle(r, bundle, meta) {
      Run.fix(r);
      if (bundle) { r.deck.push(...bundle.cards); r.stars.push(...bundle.cards.map(() => 0)); }
      r.pendingBundles = []; r.pendingArtifact = null;
      r.empowersLeft = r.augments.includes('forgeMaster') ? 2 : 1;
      r.stage = 'empower';
      return 'empower';
    },
    // Empower one card (deck index), or null to skip. Returns the next stage.
    takeEmpower(r, idx, meta) {
      Run.fix(r);
      if (idx != null && Run.empowerable(r).includes(idx)) r.stars[idx]++;
      r.empowersLeft = idx == null ? 0 : r.empowersLeft - 1;
      if (r.empowersLeft > 0 && Run.empowerable(r).length) return 'empower';
      r.empowersLeft = 0;
      if (AUGMENT_AFTER.includes(r.fight)) {
        const g = Run.rng(r);
        const n = meta.unlocked.includes('treasureHunter') ? 4 : 3;
        r.pendingAugments = g.shuffle(AUGMENT_IDS.filter(a => !r.augments.includes(a))).slice(0, n);
        Run.save(r, g);
        r.stage = 'augment';
        return 'augment';
      }
      Run.nextFight(r);
      return 'preFight';
    },
    takeAugment(r, a) { if (a) r.augments.push(a); r.pendingAugments = []; Run.nextFight(r); },
    nextFight(r) { r.fight++; r.stage = 'preFight'; },
    ashToBank: (r, won) => r.ashEarned + (r.fight - 1) * 5 + (won ? 40 : 0),
  };

  const GLOSSARY = [
    ['Energy', 'Round 1 gives 1, round 2 gives 2, up to 10.'],
    ['Creature', 'One at a time, in front of you. Takes hits first. Attacks at end of turn.'],
    ['Spell', 'Happens once, then goes to your used pile.'],
    ['Artifact', 'Stays in play. Hold up to 3; a 4th replaces the oldest.'],
    ['Block', 'Stops damage until your next turn.'],
    ['Scorch', 'Start of your turn: the enemy takes damage equal to its Scorch, then Scorch drops by 1.'],
    ['Ash', 'Gain 1 when your creature dies, or Stoke. Full Ash lets you Burn.'],
    ['Burn', 'A big hit that ignores Block. Grows by 6 each time you Burn in a fight.'],
    ['Stoke', 'Pay 2 energy: Gain 1 Ash. Once per turn.'],
    ['Deathrattle', 'Happens when this creature dies.'],
    ['Lifesteal', 'Damage dealt also heals you.'],
    ['Sacrifice', 'Your creature dies (you still gain its Ash).'],
    ['Empower', 'After each win, star a card: its gold numbers grow 50% per star (max 3).'],
  ];

  return { RNG, CARDS, card, cardsOf, THEMES, MAX_STARS, scale, canEmpower, stats, textParts, cardText, STARTER, AUGMENTS, AUGMENT_IDS, ENEMIES, MINIONS, TUNING, Battle,
           UNLOCKS, Meta, newMeta, Run, AUGMENT_AFTER, MAX_ARTIFACTS, TOTAL_FIGHTS, GLOSSARY };
})();
if (typeof module !== 'undefined') module.exports = Core;
