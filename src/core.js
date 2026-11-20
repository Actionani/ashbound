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
  const THEMES = {
    starter: ['Starter', ''], embers: ['Embers', 'Direct damage spells'], bulwark: ['Bulwark', 'Block and sturdy walls'],
    swarm: ['Swarm', 'Small creatures that die for value'], artifice: ['Artifice', 'Artifacts that keep working'],
    scorch: ['Scorch', 'Damage over time'], giants: ['Giants', 'Big creatures and buffs'], pyre: ['Pyre', 'Ash and Burn'],
    hex: ['Hex', 'Curses that cripple the enemy'], legendary: ['Legendary', ''],
  };
  const C = [];
  const spell = (id, name, cost, theme, text, o = {}) =>
    C.push({ id, name, cost, type: 'spell', theme, text, power: 0, health: 0, needsAlly: !!o.needsAlly, damaging: !!o.damaging, charges: 0 });
  const creature = (id, name, cost, theme, p, h, text = '') =>
    C.push({ id, name, cost, type: 'creature', theme, text, power: p, health: h, needsAlly: false, damaging: false, charges: 0 });
  const artifact = (id, name, cost, theme, text, charges = 0) =>
    C.push({ id, name, cost, type: 'artifact', theme, text, power: 0, health: 0, needsAlly: false, damaging: false, charges });
  const D = { damaging: true }, A = { needsAlly: true };

  spell('strike', 'Strike', 1, 'starter', 'Deal 3 damage.', D);
  spell('guardUp', 'Guard', 1, 'starter', 'Gain 4 Block.');
  creature('ashling', 'Ashling', 1, 'starter', 1, 2);
  spell('emberBolt', 'Ember Bolt', 2, 'starter', 'Deal 6 damage.', D);
  creature('huskHound', 'Husk Hound', 2, 'starter', 2, 3);
  artifact('cinderLamp', 'Cinder Lamp', 2, 'starter', 'End of your turn: deal 3 damage.');

  spell('flameJab', 'Flame Jab', 1, 'embers', 'Deal 2 damage. Draw a card.', D);
  spell('twinFlames', 'Twin Flames', 2, 'embers', 'Deal 5 damage twice.', D);
  spell('searingBolt', 'Searing Bolt', 3, 'embers', 'Deal 11 damage.', D);
  spell('firestorm', 'Firestorm', 5, 'embers', 'Deal 19 damage.', D);
  spell('inferno', 'Inferno', 7, 'embers', 'Deal 26 damage.', D);

  spell('brace', 'Brace', 2, 'bulwark', 'Gain 9 Block.');
  spell('secondWind', 'Second Wind', 2, 'bulwark', 'Gain 5 Block. Draw a card.');
  creature('boneWall', 'Bone Wall', 3, 'bulwark', 1, 11);
  spell('ironSkin', 'Iron Skin', 4, 'bulwark', 'Gain 18 Block.');
  artifact('ironTotem', 'Iron Totem', 3, 'bulwark', 'Start of your turn: gain 4 Block.');
  spell('shieldBash', 'Shield Bash', 1, 'bulwark', 'Deal damage equal to your Block.', D);

  creature('cinderMoth', 'Cinder Moth', 0, 'swarm', 1, 1, 'When it dies, deal 3 damage.');
  creature('emberFox', 'Ember Fox', 1, 'swarm', 2, 1, 'When it dies, draw a card.');
  spell('kindle', 'Kindle', 0, 'swarm', 'Your creature dies. Draw 2 cards.', A);
  spell('swarmCall', 'Swarm Call', 1, 'swarm', 'Your creature dies. Summon a Cinder Moth.');
  creature('broodMother', 'Brood Mother', 4, 'swarm', 4, 5, 'When it dies, summon a Cinder Moth.');

  artifact('boneAltar', 'Bone Altar', 1, 'artifice', 'Whenever your creature dies, deal 5 damage.');
  artifact('ashCenser', 'Ash Censer', 2, 'artifice', 'Start of your turn: gain 1 Ash.');
  artifact('mirrorShard', 'Mirror Shard', 2, 'artifice', 'Enemy attacks deal 4 less. Breaks after 4 attacks.', 4);
  artifact('hourglass', 'Hourglass', 2, 'artifice', 'Gain 1 extra energy each turn.');
  creature('clockworkGolem', 'Clockwork Golem', 3, 'artifice', 3, 5, 'Gets +3/+3 for each artifact you have.');

  spell('emberDart', 'Ember Dart', 1, 'scorch', 'Apply 5 Scorch.');
  spell('smokeCloud', 'Smoke Cloud', 2, 'scorch', 'Apply 9 Scorch.');
  spell('catalyst', 'Catalyst', 2, 'scorch', "Double the enemy's Scorch.");
  creature('scorchImp', 'Scorch Imp', 2, 'scorch', 2, 3, 'When it attacks, apply 3 Scorch.');
  artifact('brazier', 'Brazier', 2, 'scorch', 'End of your turn: apply 3 Scorch.');
  spell('wildfire', 'Wildfire', 4, 'scorch', "Deal damage equal to the enemy's Scorch, then apply 4 Scorch.");

  spell('fanFlames', 'Fan the Flames', 2, 'giants', 'Your creature gets +4 attack.', A);
  creature('hound', 'Hound', 3, 'giants', 4, 5);
  spell('battleCry', 'Battle Cry', 3, 'giants', 'Your creature gets +2/+6.', A);
  creature('stoneWarden', 'Stone Warden', 5, 'giants', 6, 9);
  creature('pyreGiant', 'Pyre Giant', 7, 'giants', 10, 12);

  spell('stokeSpark', 'Spark', 0, 'pyre', 'Gain 1 Ash. Draw a card.');
  spell('ashBlade', 'Ash Blade', 3, 'pyre', 'Deal 7 damage. Gain 1 Ash.', D);
  spell('lastRites', 'Last Rites', 2, 'pyre', 'Your creature dies. Fill your Ash.', A);
  spell('heatUp', 'Heat Up', 2, 'pyre', 'Burn deals 8 more damage this fight.');
  creature('phoenix', 'Phoenix', 5, 'pyre', 5, 6, 'When it dies, gain 2 Ash.');

  spell('weaken', 'Weaken', 1, 'hex', 'This round, enemy attacks deal 5 less.');
  spell('rot', 'Rot', 1, 'hex', 'Start of your turns: the enemy takes 3 damage. Stacks.');
  spell('expose', 'Expose', 1, 'hex', "Remove the enemy's Block. It can't gain Block this round. Draw a card.");
  spell('turncoat', 'Turncoat', 2, 'hex', "The enemy's minion hits the enemy for triple its attack, then dies.");
  spell('smother', 'Smother', 2, 'hex', "The enemy's next action does nothing.");

  artifact('sunForge', 'Sun Forge', 5, 'legendary', 'Start of your turn: deal 4 damage and gain 4 Block.');
  artifact('soulFurnace', 'Soul Furnace', 3, 'legendary', 'Whenever your creature dies, gain 1 energy and draw a card.');
  artifact('ashenCrown', 'Ashen Crown', 5, 'legendary', 'Your creature attacks twice.');
  artifact('graveBell', 'Grave Bell', 3, 'legendary', 'Whenever your creature dies, deal damage equal to its attack.');
  artifact('clockworkHeart', 'Clockwork Heart', 4, 'legendary', 'End of your turn: if you have no creature, summon a 3/4 Cog Hound.');
  artifact('pyreAltar', 'Pyre Altar', 4, 'legendary', 'Whenever you Burn, gain 10 Block and draw 2 cards.');
  artifact('eternalEmber', 'Eternal Ember', 3, 'legendary', 'Scorch on the enemy no longer fades.');

  const CARDS = Object.fromEntries(C.map(c => [c.id, c]));
  const card = id => CARDS[id];
  const cardsOf = theme => C.filter(c => c.theme === theme);
  const STARTER = ['strike', 'strike', 'strike', 'guardUp', 'guardUp', 'ashling', 'ashling', 'emberBolt', 'huskHound', 'cinderLamp'];

  const MAX_ENERGY = 10, STOKE_COST = 2, MAX_ARTIFACTS = 3, TOTAL_FIGHTS = 8;

  // ---------- Augments ----------
  const AUGMENTS = {
    emberHeart: ['Ember Heart', 'Gain 1 extra energy every round.'],
    phoenixFeather: ['Phoenix Feather', 'The first time you would die each fight, survive with 10 HP.'],
    hotCoals: ['Hot Coals', 'Burn only needs 2 Ash.'],
    graveLantern: ['Grave Lantern', 'Your creatures get +2/+2.'],
    whetstone: ['Whetstone', 'Damage spells deal 2 more damage.'],
    ironThimble: ['Iron Thimble', 'Start each fight with 10 Block.'],
    boneDice: ['Bone Dice', 'Start each fight with 2 extra cards.'],
    ashCrown: ['Ash Crown', 'Stoke costs 1 energy instead of 2.'],
    mourningVeil: ['Mourning Veil', 'Whenever your creature dies, gain 5 Block.'],
    brandOfFury: ['Brand of Fury', 'Burn deals double damage.'],
    wellspring: ['Wellspring', 'Draw 2 cards each turn instead of 1.'],
    cinderCloak: ['Cinder Cloak', 'Gain 1 Ash at the start of each of your turns.'],
    bloodFang: ['Blood Fang', 'Your damage spells heal you for 2.'],
    kindledWounds: ['Kindled Wounds', 'Whenever you apply Scorch, apply 2 more.'],
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
  const TUNING = { 1: [0.95, 0.85], 2: [0.92, 1.0], 3: [0.9, 1.25], 4: [0.8, 1.35] };
  const enemiesOfTier = t => Object.keys(ENEMIES).filter(k => ENEMIES[k].tier === t);

  // ---------- Battle ----------
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
      this.ash = 0; this.ashGainedTotal = 0; this.heat = 0;
      this.stokedThisTurn = false; this.featherUsed = false;
      this.nextID = 1;
      this.drawPile = this.rng.shuffle(deck.map(id => this.makeCard(id)));
      this.hand = []; this.discard = []; this.artifacts = [];
      this.round = 0;
      this.enemyMaxHP = Math.round(this.enemy.hp * TUNING[this.enemy.tier][0]);
      this.enemyHP = this.enemyMaxHP;
      this.enemyBlock = 0; this.enrage = 0; this.intent = null; this.patternIndex = 0;
      this.weaken = 0; this.exposed = false; this.smothered = false; this.rotStacks = 0; this.scorch = 0;
      this.allies = { player: null, enemy: null };
      this.events = []; this.outcome = 'ongoing';
    }
    makeCard(id) { return { uid: this.nextID++, id }; }
    ev(type, data = {}) { this.events.push(this.captureSnaps ? { type, ...data, snap: this.snapshot() } : { type, ...data }); }
    snapshot() {
      const cp = a => a ? { ...a } : null;
      return {
        hp: this.hp, maxHP: this.maxHP, block: this.block, energy: this.energy, maxE: this.maxEnergyThisRound,
        ash: this.ash, ashNeeded: this.ashNeeded, canStoke: this.canStoke, canBurn: this.canBurn, burnDamage: this.burnDamage,
        stokePrice: this.stokePrice, stoked: this.stokedThisTurn,
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
    get burnDamage() { return (12 + this.burnBonus + this.heat) * (this.aug.has('brandOfFury') ? 2 : 1); }
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
      if (this.round > 1 && this.block !== 0) { this.block = 0; this.ev('block', { side: 'player', value: 0 }); }
      this.maxEnergyThisRound = Math.min(this.round, MAX_ENERGY) + (this.aug.has('emberHeart') ? 1 : 0) + this.count('hourglass');
      this.energy = this.maxEnergyThisRound;
      this.stokedThisTurn = false;
      this.ev('energy');
      if (this.scorch > 0) {
        this.ev('info', { text: `Scorch burns ${this.enemy.name} for ${this.scorch}.` });
        this.hitFace('enemy', this.scorch, true);
        if (this.outcome !== 'ongoing') return;
        if (!this.has('eternalEmber')) this.scorch--;
        this.ev('status');
      }
      if (this.rotStacks > 0) {
        this.ev('info', { text: `Rot gnaws at ${this.enemy.name}.` });
        this.hitFace('enemy', this.rotStacks * 3, true);
        if (this.outcome !== 'ongoing') return;
      }
      for (const a of this.artifacts.slice()) {
        if (a.id === 'ironTotem') { this.ev('artifactFires', { uid: a.uid }); this.gainBlock(4); }
        else if (a.id === 'ashCenser') { this.ev('artifactFires', { uid: a.uid }); this.gainAsh(1); }
        else if (a.id === 'sunForge') { this.ev('artifactFires', { uid: a.uid }); this.hitFront('enemy', 4); this.gainBlock(4); }
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
        if (this.outcome === 'ongoing') this.summonPlayer(c.id);
      } else {
        this.discard.push(c);
        this.resolve(c);
        if (d.damaging && this.aug.has('bloodFang')) this.healPlayer(2);
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
      this.ev('burn', { amount: d });
      this.hitFace('enemy', d, true);
      for (const a of this.artifacts.slice()) {
        if (a.id === 'pyreAltar' && this.outcome === 'ongoing') {
          this.ev('artifactFires', { uid: a.uid });
          this.gainBlock(10);
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
          this.hitFront('enemy', cur.power);
          if (cur.cardID === 'scorchImp') this.applyScorch(3);
        }
        if (this.outcome !== 'ongoing') return;
      }
      for (const art of this.artifacts.slice()) {
        if (art.id === 'cinderLamp') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', 3); }
        else if (art.id === 'brazier') { this.ev('artifactFires', { uid: art.uid }); this.applyScorch(3); }
        else if (art.id === 'clockworkHeart' && !this.allies.player) {
          this.ev('artifactFires', { uid: art.uid });
          this.summonToken('Cog Hound', 3, 4);
        }
        if (this.outcome !== 'ongoing') return;
      }
      if (this.enemyBlock !== 0) { this.enemyBlock = 0; this.ev('block', { side: 'enemy', value: 0 }); }
      if (this.smothered) {
        this.smothered = false;
        this.ev('enemyActs', { text: `${this.enemy.name} is smothered and does nothing.` });
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

    resolve(c) {
      const sb = this.spellBonus;
      switch (c.id) {
        case 'strike': this.hitFront('enemy', 3 + sb); break;
        case 'emberBolt': this.hitFront('enemy', 6 + sb); break;
        case 'flameJab': this.hitFront('enemy', 2 + sb); this.draw(1); break;
        case 'twinFlames': this.hitFront('enemy', 5 + sb); if (this.outcome === 'ongoing') this.hitFront('enemy', 5 + sb); break;
        case 'searingBolt': this.hitFront('enemy', 11 + sb); break;
        case 'firestorm': this.hitFront('enemy', 19 + sb); break;
        case 'inferno': this.hitFront('enemy', 26 + sb); break;
        case 'ashBlade': this.hitFront('enemy', 7 + sb); this.gainAsh(1); break;
        case 'guardUp': this.gainBlock(4); break;
        case 'brace': this.gainBlock(9); break;
        case 'secondWind': this.gainBlock(5); this.draw(1); break;
        case 'ironSkin': this.gainBlock(18); break;
        case 'shieldBash': this.hitFront('enemy', this.block + sb); break;
        case 'kindle': this.killAlly('player'); if (this.outcome === 'ongoing') this.draw(2); break;
        case 'swarmCall':
          if (this.allies.player) this.killAlly('player');
          if (this.outcome === 'ongoing') this.summonPlayer('cinderMoth');
          break;
        case 'fanFlames': this.buffAlly(4, 0); break;
        case 'battleCry': this.buffAlly(2, 6); break;
        case 'stokeSpark': this.gainAsh(1); this.draw(1); break;
        case 'lastRites': this.killAlly('player'); this.gainAsh(this.ashNeeded); break;
        case 'heatUp': this.heat += 8; this.ev('info', { text: `Burn now deals ${this.burnDamage}.` }); break;
        case 'weaken': this.weaken += 5; this.ev('status'); break;
        case 'rot': this.rotStacks++; this.ev('status'); break;
        case 'expose':
          this.exposed = true;
          if (this.enemyBlock > 0) { this.enemyBlock = 0; this.ev('block', { side: 'enemy', value: 0 }); }
          this.ev('status'); this.draw(1); break;
        case 'turncoat': {
          const m = this.allies.enemy;
          if (m) {
            this.ev('allyAttacks', { side: 'enemy' });
            this.ev('info', { text: `${m.name} turns on its master!` });
            this.hitFace('enemy', m.power * 3);
            this.killAlly('enemy');
          }
          break;
        }
        case 'smother': this.smothered = true; this.ev('status'); break;
        case 'emberDart': this.applyScorch(5); break;
        case 'smokeCloud': this.applyScorch(9); break;
        case 'catalyst': this.applyScorch(this.scorch); break;
        case 'wildfire': if (this.scorch > 0) this.hitFace('enemy', this.scorch + sb, true); this.applyScorch(4); break;
      }
    }

    applyScorch(n) {
      if (n <= 0 || this.outcome !== 'ongoing') return;
      this.scorch += n + (this.aug.has('kindledWounds') ? 2 : 0);
      this.ev('status');
    }

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
      this.artifacts.push({ uid: c.uid, id: c.id, charges: card(c.id).charges });
      this.ev('artifacts');
    }

    summonPlayer(id) {
      const d = card(id);
      let p = d.power, h = d.health;
      if (this.aug.has('graveLantern')) { p += 2; h += 2; }
      if (id === 'clockworkGolem') { p += 3 * this.artifacts.length; h += 3 * this.artifacts.length; }
      this.allies.player = { id: this.nextID++, name: d.name, side: 'player', power: p, health: h, maxHealth: h, cardID: id, minion: null, fresh: false };
      this.ev('allyIn', { side: 'player' });
    }
    summonToken(name, p, h) {
      if (this.aug.has('graveLantern')) { p += 2; h += 2; }
      this.allies.player = { id: this.nextID++, name, side: 'player', power: p, health: h, maxHealth: h, cardID: null, minion: null, fresh: false };
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
    hitAlly(side, amount) {
      const a = this.allies[side];
      if (!a || amount <= 0) return 0;
      if (amount >= a.health) {
        const over = amount - a.health;
        this.ev('allyHit', { side, amount: a.health, newHealth: 0 });
        this.killAlly(side);
        return over;
      }
      a.health -= amount;
      this.ev('allyHit', { side, amount, newHealth: a.health });
      return 0;
    }
    enemyAttack(raw, skipAlly) {
      let dmg = Math.max(0, raw - this.weaken);
      const i = this.artifacts.findIndex(a => a.id === 'mirrorShard');
      if (i >= 0) {
        dmg = Math.max(0, dmg - 4);
        const s = this.artifacts[i];
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
        if (art.id === 'boneAltar') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', 5); }
        else if (art.id === 'graveBell') { this.ev('artifactFires', { uid: art.uid }); this.hitFront('enemy', a.power); }
        else if (art.id === 'soulFurnace') { this.ev('artifactFires', { uid: art.uid }); this.energy++; this.ev('energy'); this.draw(1); }
      }
      if (a.cardID === 'cinderMoth') this.hitFront('enemy', 3);
      else if (a.cardID === 'emberFox') this.draw(1);
      else if (a.cardID === 'phoenix') this.gainAsh(2);
      else if (a.cardID === 'broodMother' && this.outcome === 'ongoing' && !this.allies.player) this.summonPlayer('cinderMoth');
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
      if (a > 0) { this.hp += a; this.ev('healed', { side: 'player', amount: a }); }
    }

    ramp(r, scale = 1) { return Math.floor((r - 1) * TUNING[this.enemy.tier][1] * scale); }
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
      if (this.smothered) return ['Smothered', 'Does nothing next'];
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
      if (this.rotStacks > 0) p.push(`Rot ${this.rotStacks * 3}/turn`);
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

  const newMeta = () => ({ ash: 0, lifetimeAsh: 0, unlocked: [], runs: 0, wins: 0, bestFight: 0, soundOn: true, seenTutorial: false });
  const Meta = {
    vitality: m => ['vitality1', 'vitality2', 'vitality3'].filter(u => m.unlocked.includes(u)).length,
    burnBonus: m => ['hotterBurn', 'hotterBurn2'].filter(u => m.unlocked.includes(u)).length * 2,
    themes: m => {
      const t = ['embers', 'bulwark', 'swarm', 'artifice', 'scorch'];
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
      const r = { rngState: 0, maxHP: 30 + 3 * Meta.vitality(meta), deck: STARTER.slice(), augments: [], fight: 1, opponents: [],
                  stage: 'preFight', ashEarned: 0, pendingBundles: [], pendingAugments: [], pendingArtifact: null };
      r.opponents = [...rng.shuffle(enemiesOfTier(1)).slice(0, 2), ...rng.shuffle(enemiesOfTier(2)).slice(0, 3),
                     ...rng.shuffle(enemiesOfTier(3)).slice(0, 2), rng.shuffle(enemiesOfTier(4))[0]];
      if (meta.unlocked.includes('headStart')) r.augments.push(rng.pick(AUGMENT_IDS));
      r.rngState = rng.s;
      return r;
    },
    rng(r) { const g = new RNG(1); g.s = r.rngState; return g; },
    save(r, g) { r.rngState = g.s; },
    currentEnemy: r => r.opponents[Math.min(r.fight, r.opponents.length) - 1],
    isFinal: r => r.fight >= TOTAL_FIGHTS,
    nextSeed(r) { const g = Run.rng(r); const s = Math.floor(g.next() * 4294967296); Run.save(r, g); return s; },
    winFight(r, b, meta) {
      r.ashEarned += b.ashGainedTotal;
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
    takeArtifact(r, meta) { if (r.pendingArtifact) r.deck.push(r.pendingArtifact); return Run.takeBundle(r, null, meta); },
    takeBundle(r, bundle, meta) {
      if (bundle) r.deck.push(...bundle.cards);
      r.pendingBundles = []; r.pendingArtifact = null;
      if (AUGMENT_AFTER.includes(r.fight)) {
        const g = Run.rng(r);
        const n = meta.unlocked.includes('treasureHunter') ? 4 : 3;
        r.pendingAugments = g.shuffle(AUGMENT_IDS.filter(a => !r.augments.includes(a))).slice(0, n);
        Run.save(r, g);
        r.stage = 'augment';
        return true;
      }
      Run.nextFight(r);
      return false;
    },
    takeAugment(r, a) { if (a) r.augments.push(a); r.pendingAugments = []; Run.nextFight(r); },
    nextFight(r) { r.fight++; r.stage = 'preFight'; },
    ashToBank: (r, won) => r.ashEarned + (r.fight - 1) * 5 + (won ? 40 : 0),
  };

  const GLOSSARY = [
    ['Energy', 'Round 1 gives 1 energy, round 2 gives 2, and so on up to 10.'],
    ['Creature', 'Stands in front of you, one at a time. Hits land on it first. It attacks at the end of your turn.'],
    ['Spell', 'Happens once, then goes to your used pile.'],
    ['Artifact', 'Stays in play and keeps working. You can hold 3; a 4th replaces the oldest.'],
    ['Block', 'Stops damage to you until your next turn.'],
    ['Scorch', 'At the start of your turn the enemy takes damage equal to its Scorch, ignoring Block. Then Scorch drops by 1.'],
    ['Ash', 'Gained whenever your creature dies, or by Stoking. When full, press Burn.'],
    ['Stoke', 'Spend 2 energy to gain 1 Ash. Once per turn.'],
  ];

  return { RNG, CARDS, card, cardsOf, THEMES, STARTER, AUGMENTS, AUGMENT_IDS, ENEMIES, MINIONS, TUNING, Battle,
           UNLOCKS, Meta, newMeta, Run, AUGMENT_AFTER, MAX_ARTIFACTS, TOTAL_FIGHTS, GLOSSARY };
})();
if (typeof module !== 'undefined') module.exports = Core;
