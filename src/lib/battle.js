// Blood of Icetear: Citadel Wars — the rules, with no interface attached.
//
// Everything the game knows how to do lives here as plain functions over a
// plain state object, so the board can be redrawn, replaced or tested without
// touching a rule. Nothing here reads the document.
//
// THE BOARD, as drawn:
//
//   Each player holds a Citadel of 100, a Commander in front of it, a Great
//   Gate across the centre and a High Gate at each corner. Three lanes run
//   between the two halves. The centre is short and open, five units a side
//   across three spaces. The two side lanes are long, three units a side
//   across five spaces, with three randomly spawned monsters squatting in the
//   middle of each. The middle space of a side lane is the prize: hold it and
//   your Reinforcements come free.
//
// A gate's hit points come from the Guardians drafted on to it, so the wall
// is made of cards you could otherwise have played.

import { RARITY, CARDS, MONSTERS, byId, statsOf } from '../data/battle-cards.js';

export const CITADEL_HP = 100;
// The five Guardians on the three gates are bought out of one pool of 200,
// each costing what their rarity is worth in hit points. Three Mythicals on
// the Great Gate costs 180 and leaves 20 for both High Gates, so a solid
// centre is paid for with thin corners.
export const GUARDIAN_BUDGET = 200;
export const MUSTER_START = 3;
export const MUSTER_MAX = 10;
export const REINFORCE_PER_HOLD = 2;   // free deployments while you hold a middle
export const HAND_START = 5;

export const PHASES = ['draw', 'main', 'move', 'action', 'end'];
export const PHASE_NAME = {
  draw: 'Draw', main: 'Main', move: 'Movement', action: 'Action', end: 'End',
};

// On the drawing the swords are a row of their own at each end, and the
// rectangles between them are the ground to be crossed. So a lane is:
//
//   [ my row ] [ movement space ] ... [ movement space ] [ their row ]
//
// `spaces` counts only the ground between, as written on the sketch: three
// down the centre, five down each side. The two rows are the extra positions
// at either end, which is what stops both armies deploying on top of one
// another and grinding for ever without either gate being reached.
export const LANES = [
  { key: 'left',   name: 'The Left Path',  spaces: 5, slots: 3, monsters: true },
  { key: 'centre', name: 'The Great Gate', spaces: 3, slots: 5, monsters: false },
  { key: 'right',  name: 'The Right Path', spaces: 5, slots: 3, monsters: true },
];
export const laneOf = (key) => LANES.find((l) => l.key === key);

/** Every position in a lane: both rows, and the ground between them. */
export const trackOf = (lane) => lane.spaces + 2;

/** Where a lane's middle sits. Only the side lanes have a prize worth holding. */
export const middleOf = (lane) => (lane.monsters ? Math.floor(trackOf(lane) / 2) : null);

/** A player's own row. Player 0 pushes up the track, player 1 pushes down. */
export const homeOf = (lane, owner) => (owner === 0 ? 0 : trackOf(lane) - 1);
export const stepOf = (owner) => (owner === 0 ? 1 : -1);

// ── a small seeded generator, so a game can be replayed and tested ──
export function rngFrom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

let nextUid = 1;
const uid = () => `u${nextUid++}`;

// ── setting up ───────────────────────────────────────────────────────────

/**
 * A legal army drafted from the pool: a Commander, three Great Gate
 * Guardians, one Guardian for each High Gate, four Reinforcements and the
 * rest as the deck. Every one of those choices spends a card you could have
 * played, which is the point.
 */
export function quickArmy(rng, pool = CARDS) {
  const left = pool.slice();
  const take = (test) => {
    const i = left.findIndex(test);
    const at = i === -1 ? Math.floor(rng() * left.length) : i;
    return left.splice(at, 1)[0];
  };
  const byRarity = (r) => (c) => c.rarity === r;
  const commander = take((c) => c.commander && rng() > 0.5) || take((c) => c.commander);
  // 40 + 30 + 30 on the Great Gate and 30 + 20 on the corners spends 150 of
  // the 200, which leaves a player room to upgrade a post rather than
  // starting already at the ceiling.
  const great = [take(byRarity('Epic')), take(byRarity('Rare')), take(byRarity('Rare'))];
  const high = [take(byRarity('Rare')), take(byRarity('Uncommon'))];
  const reinforcements = [take(byRarity('Rare')), take(byRarity('Uncommon')),
    take(byRarity('Uncommon')), take(byRarity('Common'))];
  // shuffle what is left and keep a workable deck
  for (let i = left.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [left[i], left[j]] = [left[j], left[i]];
  }
  return {
    commander: commander.id,
    great: great.map((c) => c.id),
    high: high.map((c) => c.id),
    reinforcements: reinforcements.map((c) => c.id),
    deck: left.slice(0, 20).map((c) => c.id),
  };
}

/** What a Guardian costs out of the 200: its rarity, in hit points. */
export const guardianCost = (cardId) => RARITY[byId[cardId].rarity].hp;

/** What an army has spent on its five Guardians, and whether that is legal. */
export function guardianSpend(army) {
  const ids = [...army.great, ...army.high];
  const spent = ids.reduce((n, id) => n + guardianCost(id), 0);
  return { spent, left: GUARDIAN_BUDGET - spent, legal: spent <= GUARDIAN_BUDGET, ids };
}

/** Everything wrong with an army, so a player is not told one fault at a time. */
export function armyProblems(army) {
  if (!army) return ['No army.'];
  const out = [];
  if (!army.commander) out.push('A Commander is required.');
  if (army.great.length !== 3) out.push('The Great Gate takes three Guardians.');
  if (army.high.length !== 2) out.push('Each High Gate takes one Guardian.');
  const posts = [...army.great, ...army.high, army.commander].filter(Boolean);
  if (new Set(posts).size !== posts.length) out.push('A card cannot hold two posts at once.');
  const s = guardianSpend(army);
  if (!s.legal) out.push(`Guardians cost ${s.spent} of ${GUARDIAN_BUDGET}: ${-s.left} over.`);
  return out;
}

export function validateArmy(army) {
  const out = armyProblems(army);
  return out.length ? out.join(' ') : null;
}

const gate = (ids, doubled) => {
  const total = ids.reduce((n, id) => n + RARITY[byId[id].rarity].hp, 0);
  const hp = doubled ? total * 2 : total;
  return { guardians: ids, hp, maxHp: hp };
};

function makePlayer(name, army) {
  return {
    name,
    citadel: CITADEL_HP,
    commander: (() => {
      const card = byId[army.commander];
      const s = statsOf(card);
      return { cardId: card.id, hp: s.hp * 2, maxHp: s.hp * 2, atk: s.atk };
    })(),
    // the Great Gate takes the three Guardians added together; a High Gate
    // has one Guardian and counts it twice
    greatGate: gate(army.great, false),
    highGates: [gate([army.high[0]], true), gate([army.high[1]], true)],
    deck: army.deck.slice(),
    hand: [],
    discard: [],
    reinforcements: army.reinforcements.slice(),
    muster: MUSTER_START,
    freeDeploys: 0,
  };
}

export function newGame({ seed = 1, armies = null, names = ['You', 'Opponent'] } = {}) {
  nextUid = 1;
  const rng = rngFrom(seed);
  const built = armies || [quickArmy(rng), quickArmy(rng)];
  const state = {
    seed,
    turn: 1,
    current: 0,
    phase: 'main',           // the first player does not draw on turn one
    winner: null,
    players: [makePlayer(names[0], built[0]), makePlayer(names[1], built[1])],
    lanes: {},
    log: [],
  };
  for (const lane of LANES) {
    const l = { key: lane.key, units: [], monsters: [], holder: null };
    if (lane.monsters) {
      // M on the sketch: three random monsters, spawned into the middle
      const middle = middleOf(lane);
      for (const pos of [middle - 1, middle, middle + 1]) {
        const m = pick(rng, MONSTERS);
        l.monsters.push({ uid: uid(), mid: m.id, name: m.name, hp: m.hp, maxHp: m.hp, atk: m.atk, pos });
      }
    }
    state.lanes[lane.key] = l;
  }
  for (const p of state.players) {
    for (let i = 0; i < HAND_START; i++) drawOne(state, p);
  }
  say(state, `The gates are set. ${state.players[0].name} moves first.`);
  return state;
}

// ── small helpers ────────────────────────────────────────────────────────
const say = (s, text) => { s.log.push({ turn: s.turn, text }); if (s.log.length > 200) s.log.shift(); };
export const cardOf = (id) => byId[id];
export const me = (s) => s.players[s.current];
export const foeIndex = (s) => (s.current === 1 ? 0 : 1);
export const foe = (s) => s.players[foeIndex(s)];

function drawOne(state, player) {
  if (!player.deck.length) return null;
  const id = player.deck.shift();
  player.hand.push(id);
  return id;
}

/** Every unit in a lane, on both sides. */
export const unitsIn = (s, laneKey) => s.lanes[laneKey].units;
export const livingMonsters = (s, laneKey) => s.lanes[laneKey].monsters.filter((m) => m.hp > 0);

/** What stands in this lane between an attacker and the enemy citadel. */
export function wallFor(s, laneKey, defenderIndex) {
  const d = s.players[defenderIndex];
  if (laneKey === 'centre') {
    if (d.greatGate.hp > 0) return { kind: 'gate', label: 'The Great Gate', ref: d.greatGate };
  } else {
    const g = d.highGates[laneKey === 'left' ? 0 : 1];
    if (g.hp > 0) return { kind: 'gate', label: 'The High Gate', ref: g };
  }
  if (d.commander.hp > 0) {
    return { kind: 'commander', label: cardOf(d.commander.cardId).name, ref: d.commander };
  }
  return { kind: 'citadel', label: 'The Citadel', ref: d };
}

// ── deploying ────────────────────────────────────────────────────────────

export function canDeploy(s, laneKey, cardId, { free = false } = {}) {
  if (s.phase !== 'main' || s.winner !== null) return 'Not the Main phase.';
  const p = me(s);
  const lane = laneOf(laneKey);
  const card = cardOf(cardId);
  if (!card) return 'No such card.';
  const mine = s.lanes[laneKey].units.filter((u) => u.owner === s.current);
  if (mine.length >= lane.slots) return `That lane holds only ${lane.slots}.`;
  if (free) {
    if (!p.reinforcements.includes(cardId)) return 'Not in your Reinforcements.';
    if (p.freeDeploys <= 0) return 'No free deployments left this turn.';
    if (!lane.monsters) return 'Reinforcements arrive on the side paths.';
    if (s.lanes[laneKey].holder !== s.current) return 'You do not hold that middle.';
    return null;
  }
  if (!p.hand.includes(cardId)) return 'Not in your hand.';
  if (statsOf(card).cost > p.muster) return 'Not enough muster.';
  return null;
}

export function deploy(s, laneKey, cardId, { free = false } = {}) {
  const why = canDeploy(s, laneKey, cardId, { free });
  if (why) return why;
  const p = me(s);
  const lane = laneOf(laneKey);
  const card = cardOf(cardId);
  const st = statsOf(card);
  if (free) {
    p.reinforcements.splice(p.reinforcements.indexOf(cardId), 1);
    p.freeDeploys--;
  } else {
    p.hand.splice(p.hand.indexOf(cardId), 1);
    p.muster -= st.cost;
  }
  s.lanes[laneKey].units.push({
    uid: uid(), owner: s.current, cardId, hp: st.hp, maxHp: st.hp, atk: st.atk,
    pos: homeOf(lane, s.current), moved: false, acted: false, summoned: true,
  });
  say(s, `${p.name} fields ${card.name}${free ? ' as a Reinforcement' : ''} on ${lane.name}.`);
  return null;
}

// ── moving ───────────────────────────────────────────────────────────────

const occupantsAt = (s, laneKey, pos) => ({
  units: s.lanes[laneKey].units.filter((u) => u.pos === pos),
  monsters: livingMonsters(s, laneKey).filter((m) => m.pos === pos),
});

export function canMove(s, laneKey, unitUid) {
  if (s.phase !== 'move' || s.winner !== null) return 'Not the Movement phase.';
  const lane = laneOf(laneKey);
  const u = s.lanes[laneKey].units.find((x) => x.uid === unitUid);
  if (!u) return 'No such unit.';
  if (u.owner !== s.current) return 'Not yours.';
  if (u.moved) return 'Already moved this turn.';
  const to = u.pos + stepOf(u.owner);
  if (to < 0 || to > trackOf(lane) - 1) return 'Already at the enemy wall.';
  const there = occupantsAt(s, laneKey, to);
  if (there.monsters.length) return 'A monster blocks the way.';
  if (there.units.some((x) => x.owner !== u.owner)) return 'Enemies hold that space.';
  return null;
}

export function move(s, laneKey, unitUid) {
  const why = canMove(s, laneKey, unitUid);
  if (why) return why;
  const u = s.lanes[laneKey].units.find((x) => x.uid === unitUid);
  u.pos += stepOf(u.owner);
  u.moved = true;
  return null;
}

// ── fighting ─────────────────────────────────────────────────────────────

/** Everything this unit could hit right now. */
export function targetsFor(s, laneKey, unitUid) {
  const lane = laneOf(laneKey);
  const u = s.lanes[laneKey].units.find((x) => x.uid === unitUid);
  if (!u || u.owner !== s.current || u.acted) return [];
  const out = [];
  for (const m of livingMonsters(s, laneKey)) {
    if (Math.abs(m.pos - u.pos) <= 1) out.push({ kind: 'monster', uid: m.uid, label: m.name, hp: m.hp });
  }
  for (const e of s.lanes[laneKey].units) {
    if (e.owner === u.owner || e.hp <= 0) continue;
    if (Math.abs(e.pos - u.pos) <= 1) {
      out.push({ kind: 'unit', uid: e.uid, label: cardOf(e.cardId).name, hp: e.hp });
    }
  }
  // Standing in the enemy's own row, the wall is always a choice. An earlier
  // version only offered it when nothing else was in reach, which meant a
  // defender who kept feeding bodies into the line could never be broken
  // through at all: a hundred turns would pass with the gate untouched.
  // Whether to swing at the wall or at the soldier beside you is the
  // player's decision, not the engine's.
  if (u.pos === homeOf(lane, u.owner === 0 ? 1 : 0)) {
    const w = wallFor(s, laneKey, u.owner === 0 ? 1 : 0);
    out.push({ kind: w.kind, uid: w.kind, label: w.label, hp: w.kind === 'citadel' ? w.ref.citadel : w.ref.hp });
  }
  return out;
}

export function attack(s, laneKey, unitUid, target) {
  if (s.phase !== 'action' || s.winner !== null) return 'Not the Action phase.';
  const u = s.lanes[laneKey].units.find((x) => x.uid === unitUid);
  if (!u || u.owner !== s.current) return 'Not yours.';
  if (u.acted) return 'Already acted this turn.';
  const legal = targetsFor(s, laneKey, unitUid);
  const hit = legal.find((t) => t.uid === (target.uid ?? target));
  if (!hit) return 'Not in range.';
  const name = cardOf(u.cardId).name;
  const d = u.owner === 0 ? 1 : 0;

  if (hit.kind === 'monster') {
    const m = s.lanes[laneKey].monsters.find((x) => x.uid === hit.uid);
    m.hp -= u.atk;
    // a monster never gets a turn of its own, so it answers when struck
    u.hp -= m.hp > 0 ? m.atk : Math.ceil(m.atk / 2);
    say(s, `${name} strikes ${m.name} for ${u.atk}. It answers.`);
    if (m.hp <= 0) {
      say(s, `${m.name} falls.`);
      // Breaking the thing squatting on the middle is the turning point of a
      // side path: the enemy is shoved back a space and two more of your own
      // come up behind you.
      if (m.pos === middleOf(laneOf(laneKey))) claimMiddle(s, laneKey, u.owner);
    }
  } else if (hit.kind === 'unit') {
    const e = s.lanes[laneKey].units.find((x) => x.uid === hit.uid);
    e.hp -= u.atk;
    say(s, `${name} strikes ${cardOf(e.cardId).name} for ${u.atk}.`);
    if (e.hp <= 0) say(s, `${cardOf(e.cardId).name} falls.`);
  } else if (hit.kind === 'gate') {
    const w = wallFor(s, laneKey, d);
    w.ref.hp -= u.atk;
    say(s, `${name} batters ${w.label} for ${u.atk}.`);
    if (w.ref.hp <= 0) say(s, `${w.label} is broken.`);
  } else if (hit.kind === 'commander') {
    const c = s.players[d].commander;
    c.hp -= u.atk;
    say(s, `${name} strikes ${cardOf(c.cardId).name} for ${u.atk}.`);
    if (c.hp <= 0) say(s, `${cardOf(c.cardId).name} has fallen.`);
  } else {
    s.players[d].citadel -= u.atk;
    say(s, `${name} strikes the Citadel for ${u.atk}.`);
  }
  u.acted = true;
  clearDead(s);
  checkWin(s);
  return null;
}

function clearDead(s) {
  for (const lane of LANES) {
    const l = s.lanes[lane.key];
    for (const u of l.units.filter((x) => x.hp <= 0)) {
      s.players[u.owner].discard.push(u.cardId);
    }
    l.units = l.units.filter((u) => u.hp > 0);
    l.monsters = l.monsters.filter((m) => m.hp > 0);
  }
}

function checkWin(s) {
  for (let i = 0; i < 2; i++) {
    if (s.players[i].citadel <= 0) {
      s.players[i].citadel = 0;
      s.winner = i === 0 ? 1 : 0;
      s.phase = 'over';
      say(s, `${s.players[s.winner].name} has taken the Citadel.`);
    }
  }
}

// ── holding the middle ───────────────────────────────────────────────────

/**
 * Breaking the monster in the centre of a side path takes the position.
 * Everyone on the other side is driven back one space, and the winner may
 * bring two more up that path at once. If they are later cleared out of the
 * lane entirely, the position is open again and the other player can walk
 * their own characters up to it.
 */
export function claimMiddle(s, laneKey, owner) {
  const lane = laneOf(laneKey);
  const l = s.lanes[laneKey];
  l.holder = owner;
  const other = owner === 0 ? 1 : 0;
  let pushed = 0;
  for (const e of l.units) {
    if (e.owner !== other) continue;
    const back = e.pos - stepOf(other);            // back the way they came
    const home = homeOf(lane, other);
    const limited = other === 0 ? Math.max(home, back) : Math.min(home, back);
    if (limited !== e.pos) { e.pos = limited; pushed++; }
  }
  s.players[owner].freeDeploys += REINFORCE_PER_HOLD;
  say(s, `${s.players[owner].name} takes the middle of ${lane.name}` +
    (pushed ? `, driving ${pushed} back a space` : '') +
    `, and may call ${REINFORCE_PER_HOLD} more.`);
}

/**
 * The middle of a side path belongs to whoever is standing on it. If the
 * holder is swept out of the lane entirely and does not replace them, it
 * passes to the other side, which is the rule as written on the sketch.
 */
export function updateHolders(s) {
  for (const lane of LANES.filter((l) => l.monsters)) {
    const l = s.lanes[lane.key];
    const mid = middleOf(lane);
    if (livingMonsters(s, lane.key).some((m) => m.pos === mid)) { l.holder = null; continue; }
    const on = [0, 1].map((o) => l.units.some((u) => u.owner === o && u.pos === mid));
    if (on[0] && !on[1]) l.holder = 0;
    else if (on[1] && !on[0]) l.holder = 1;
    else if (l.holder !== null) {
      const stillThere = l.units.some((u) => u.owner === l.holder);
      const other = l.holder === 0 ? 1 : 0;
      if (!stillThere && l.units.some((u) => u.owner === other)) l.holder = other;
    }
  }
}

/** How many free Reinforcement deployments the current player has earned. */
export function heldMiddles(s, owner) {
  return LANES.filter((l) => l.monsters && s.lanes[l.key].holder === owner).length;
}

// ── the turn ─────────────────────────────────────────────────────────────

export function advance(s) {
  if (s.winner !== null) return s;
  const i = PHASES.indexOf(s.phase);
  if (i === -1) return s;
  if (s.phase === 'end') return endTurn(s);
  s.phase = PHASES[i + 1];
  if (s.phase === 'main') startMain(s);
  return s;
}

function startMain(s) {
  const p = me(s);
  updateHolders(s);
  p.freeDeploys = heldMiddles(s, s.current) * REINFORCE_PER_HOLD;
  if (p.freeDeploys) {
    say(s, `${p.name} holds the middle and may call ${p.freeDeploys} Reinforcement${p.freeDeploys > 1 ? 's' : ''}.`);
  }
}

function endTurn(s) {
  updateHolders(s);
  const p = me(s);
  p.freeDeploys = 0;
  for (const lane of LANES) {
    for (const u of s.lanes[lane.key].units) {
      if (u.owner === s.current) { u.moved = false; u.acted = false; u.summoned = false; }
    }
  }
  s.current = s.current === 0 ? 1 : 0;
  if (s.current === 0) s.turn++;
  const n = me(s);
  n.muster = Math.min(MUSTER_MAX, MUSTER_START + s.turn - 1);
  s.phase = 'draw';
  const drew = drawOne(s, n);
  say(s, drew ? `${n.name} draws.` : `${n.name}'s deck is empty.`);
  s.phase = 'main';
  startMain(s);
  return s;
}

/** A compact read of the board, for the interface and for tests. */
export function summary(s) {
  return {
    turn: s.turn, phase: s.phase, current: s.current, winner: s.winner,
    citadels: s.players.map((p) => p.citadel),
    gates: s.players.map((p) => ({
      great: p.greatGate.hp, high: p.highGates.map((g) => g.hp), commander: p.commander.hp,
    })),
    holders: LANES.filter((l) => l.monsters).map((l) => s.lanes[l.key].holder),
  };
}
