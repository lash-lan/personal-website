// Checks the rules of Citadel Wars against the board as drawn.
//   node scripts/battle-selftest.mjs
import {
  newGame, quickArmy, rngFrom, LANES, laneOf, middleOf, homeOf, deploy, move, attack,
  targetsFor, advance, summary, wallFor, updateHolders, heldMiddles, guardianSpend, claimMiddle, trackOf,
  validateArmy, guardianCost, GUARDIAN_BUDGET, CITADEL_HP, cardOf,
} from '../src/lib/battle.js';
import { CARDS, RARITY, MONSTERS, byId } from '../src/data/battle-cards.js';

let fail = 0;
const ok = (name, good, detail = '') => {
  if (!good) fail++;
  console.log(`${good ? '  ok  ' : ' FAIL '} ${name}${detail ? '   ' + detail : ''}`);
};

console.log('\n── THE BOARD, AS DRAWN ──');
ok('three lanes', LANES.length === 3);
ok('the centre is 5 units a side across 3 spaces',
  laneOf('centre').slots === 5 && laneOf('centre').spaces === 3);
ok('each side path is 3 units a side across 5 spaces',
  ['left', 'right'].every((k) => laneOf(k).slots === 3 && laneOf(k).spaces === 5));
ok('only the side paths spawn monsters',
  laneOf('left').monsters && laneOf('right').monsters && !laneOf('centre').monsters);
ok('a lane is a row, the ground between, and a row',
  trackOf(laneOf('centre')) === 5 && trackOf(laneOf('left')) === 7);
ok('the two rows face each other across that ground',
  homeOf(laneOf('centre'), 0) === 0 && homeOf(laneOf('centre'), 1) === 4);
ok('the middle of a side path is the centre of its five spaces',
  middleOf(laneOf('left')) === 3);
ok('the centre has no middle to hold', middleOf(laneOf('centre')) === null);

console.log('\n── GUARDIAN HP ACCUMULATION ──');
const want = { Common: 10, Uncommon: 20, Rare: 30, Epic: 40, Legendary: 50, Mythical: 60 };
ok('rarity gives 10 through 60',
  Object.entries(want).every(([r, hp]) => RARITY[r].hp === hp));

let g = newGame({ seed: 7 });
const p0 = g.players[0];
const greatWant = p0.greatGate.guardians.reduce((n, id) => n + RARITY[byId[id].rarity].hp, 0);
ok('the Great Gate is its three Guardians added together',
  p0.greatGate.hp === greatWant, `${p0.greatGate.hp}`);
ok('a High Gate is its one Guardian counted twice',
  p0.highGates.every((gate) => gate.hp === RARITY[byId[gate.guardians[0]].rarity].hp * 2));
ok('the citadel starts at 100', p0.citadel === CITADEL_HP);
ok('a Commander is required and fielded', !!p0.commander.cardId && p0.commander.hp > 0);

console.log('\n── THE 200 POINT GUARDIAN BUDGET ──');
const rng = rngFrom(3);
let overspent = 0;
for (let i = 0; i < 200; i++) {
  const army = quickArmy(rng);
  if (!guardianSpend(army).legal) overspent++;
  if (validateArmy(army)) { fail++; console.log(' FAIL  drafted army is illegal: ' + validateArmy(army)); }
}
ok('200 drafted armies all stay inside the budget', overspent === 0);
ok('a Guardian costs its rarity in hit points',
  guardianCost(CARDS.find((c) => c.rarity === 'Mythical').id) === 60);

const greedy = { commander: 'hadrian', great: ['hansall', 'antharaiel', 'hannarial'],
  high: ['adamas', 'solenyra'], reinforcements: [], deck: [] };
const spend = guardianSpend(greedy);
ok('five of the best costs more than the pool allows',
  spend.spent === 60 + 60 + 50 + 50 + 50 && !spend.legal, `${spend.spent} of ${GUARDIAN_BUDGET}`);
ok('an over-budget army is refused', /Guardians cost/.test(validateArmy(greedy) || ''));

// 60 + 60 + 50 on the Great Gate, then 10 and 20 on the corners
const exact = { commander: 'hadrian', great: ['hansall', 'antharaiel', 'hannarial'],
  high: ['alfar', 'marie'], reinforcements: [], deck: [] };
ok('exactly 200 is allowed',
  guardianSpend(exact).spent === 200 && validateArmy(exact) === null,
  `${guardianSpend(exact).spent}`);
// swapping the 10 point corner for a 30 point one spends 220
const over = { ...exact, high: ['santhur', 'marie'] };
ok('going past the pool is refused',
  guardianSpend(over).spent === 220 && !guardianSpend(over).legal,
  `${guardianSpend(over).spent} of ${GUARDIAN_BUDGET}`);
ok('a card cannot hold two posts', /two posts/.test(
  validateArmy({ ...exact, high: ['hansall', 'rellien'] }) || ''));

console.log('\n── MONSTERS ──');
g = newGame({ seed: 11 });
for (const key of ['left', 'right']) {
  const ms = g.lanes[key].monsters;
  ok(`${key} spawns three monsters`, ms.length === 3, ms.map((m) => m.name).join(', '));
  ok(`${key} monsters sit across the middle`,
    ms.map((m) => m.pos).sort().join(',') === '2,3,4');
  ok(`${key} monsters are drawn from the pool`,
    ms.every((m) => MONSTERS.some((x) => x.id === m.mid)));
}
ok('the centre has no monsters', g.lanes.centre.monsters.length === 0);

console.log('\n── THE FIVE PHASES ──');
g = newGame({ seed: 5 });
ok('the first player does not draw on turn one', g.phase === 'main' && g.turn === 1);
const seen = [];
for (let i = 0; i < 4; i++) { advance(g); seen.push(g.phase); }
ok('main leads to movement, action, end and then the next turn',
  seen.join(' ') === 'move action end main', seen.join(' '));
ok('the turn passed to the other player', g.current === 1);

console.log('\n── DEPLOYING COSTS MUSTER AND SLOTS ──');
g = newGame({ seed: 5 });
const cheap = g.players[0].hand.find((id) => RARITY[byId[id].rarity].cost <= 3);
const before = g.players[0].muster;
ok('a card can be fielded in the Main phase', deploy(g, 'centre', cheap) === null);
ok('it cost muster', g.players[0].muster === before - RARITY[byId[cheap].rarity].cost);
ok('it stands at its own edge', g.lanes.centre.units[0].pos === homeOf(laneOf('centre'), 0));
ok('it left the hand', !g.players[0].hand.includes(cheap));
ok('the same card cannot be fielded twice', typeof deploy(g, 'centre', cheap) === 'string');

g = newGame({ seed: 5 });
g.players[0].muster = 99;
let filled = 0;
for (const id of [...g.players[0].hand]) { if (deploy(g, 'left', id) === null) filled++; }
ok('a side path holds only three', filled === 3 && g.lanes.left.units.length === 3);

console.log('\n── MOVEMENT ──');
g = newGame({ seed: 5 });
g.players[0].muster = 99;
deploy(g, 'centre', g.players[0].hand[0]);
let u = g.lanes.centre.units[0];
ok('no movement during the Main phase', typeof move(g, 'centre', u.uid) === 'string');
advance(g);
ok('one space per unit per turn', move(g, 'centre', u.uid) === null && u.pos === 1);
ok('and only one', typeof move(g, 'centre', u.uid) === 'string');

// the first space is open ground; the monsters start one further in
g = newGame({ seed: 5 });
g.players[0].muster = 99;
deploy(g, 'left', g.players[0].hand[0]);
u = g.lanes.left.units[0];
advance(g);
ok('a unit walks out of its row onto open ground', move(g, 'left', u.uid) === null && u.pos === 1);
u.moved = false;
ok('and then a monster blocks the path', /monster/i.test(move(g, 'left', u.uid) || ''));

console.log('\n── FIGHTING ──');
g = newGame({ seed: 5 });
g.players[0].muster = 99;
deploy(g, 'left', g.players[0].hand[0]);
u = g.lanes.left.units[0];
advance(g);                       // movement: step on to the open space
move(g, 'left', u.uid);
advance(g);                       // action
let list = targetsFor(g, 'left', u.uid);
ok('the monster in front is a target', list.some((t) => t.kind === 'monster'), JSON.stringify(list.map((t) => t.label)));
const mon = g.lanes.left.monsters.find((m) => m.pos === 2);
const monHpBefore = mon.hp, myHpBefore = u.hp;
attack(g, 'left', u.uid, { uid: mon.uid });
ok('the monster takes the hit', mon.hp === monHpBefore - u.atk);
ok('and answers, because it never gets a turn of its own', u.hp < myHpBefore);
ok('a unit acts once', typeof attack(g, 'left', u.uid, { uid: mon.uid }) === 'string');

console.log('\n── THE WALL STANDS BETWEEN YOU AND THE CITADEL ──');
g = newGame({ seed: 5 });
ok('the centre is barred by the Great Gate', wallFor(g, 'centre', 1).kind === 'gate');
g.players[1].greatGate.hp = 0;
ok('behind it stands the Commander', wallFor(g, 'centre', 1).kind === 'commander');
g.players[1].commander.hp = 0;
ok('and behind the Commander, the Citadel', wallFor(g, 'centre', 1).kind === 'citadel');
ok('a side path is barred by its own High Gate',
  wallFor(newGame({ seed: 5 }), 'left', 1).kind === 'gate');

// walk a unit all the way to the enemy edge and knock the gate down
g = newGame({ seed: 5 });
g.players[0].muster = 99;
deploy(g, 'centre', g.players[0].hand.find((id) => byId[id].rarity !== 'Common'));
u = g.lanes.centre.units[0];
u.pos = homeOf(laneOf('centre'), 1);
g.phase = 'action'; u.acted = false;
list = targetsFor(g, 'centre', u.uid);
ok('at the enemy edge the gate becomes the target', list.some((t) => t.kind === 'gate'));
const gateHp = g.players[1].greatGate.hp;
attack(g, 'centre', u.uid, { uid: 'gate' });
ok('the gate takes damage', g.players[1].greatGate.hp === gateHp - u.atk);

console.log('\n── WINNING ──');
g = newGame({ seed: 5 });
g.players[1].greatGate.hp = 0; g.players[1].commander.hp = 0; g.players[1].citadel = 5;
g.players[0].muster = 99;
deploy(g, 'centre', g.players[0].hand.find((id) => RARITY[byId[id].rarity].atk >= 5));
u = g.lanes.centre.units[0];
u.pos = homeOf(laneOf('centre'), 1);
g.phase = 'action'; u.acted = false;
attack(g, 'centre', u.uid, { uid: 'citadel' });
ok('the citadel falling ends it', g.winner === 0 && g.phase === 'over',
  `winner ${g.winner}, citadel ${g.players[1].citadel}`);
ok('the citadel never reads below zero', g.players[1].citadel === 0);

console.log('\n── HOLDING THE MIDDLE ──');
g = newGame({ seed: 5 });
g.lanes.left.monsters = [];                       // cleared the path
g.players[0].muster = 99;
deploy(g, 'left', g.players[0].hand[0]);
u = g.lanes.left.units[0];
u.pos = middleOf(laneOf('left'));
updateHolders(g);
ok('standing on the middle takes it', g.lanes.left.holder === 0);
ok('which is worth two free Reinforcements', heldMiddles(g, 0) === 1);
// and the free deployment really is free
g.phase = 'end'; advance(g);                       // pass to the opponent
g.phase = 'end'; advance(g);                       // and back to us
ok('the holder is granted its free deployments', g.players[0].freeDeploys === 2,
  String(g.players[0].freeDeploys));
const rid = g.players[0].reinforcements[0];
const musterBefore = g.players[0].muster;
ok('a Reinforcement can be called', deploy(g, 'left', rid, { free: true }) === null);
ok('and costs no muster', g.players[0].muster === musterBefore);
ok('but it does spend the Reinforcement', !g.players[0].reinforcements.includes(rid));
ok('Reinforcements do not arrive down the centre',
  typeof deploy(g, 'centre', g.players[0].reinforcements[0], { free: true }) === 'string');

// swept out of the lane, the position changes hands
g = newGame({ seed: 5 });
g.lanes.left.monsters = [];
g.lanes.left.holder = 0;
g.lanes.left.units = [{ uid: 'x', owner: 1, cardId: 'alfar', hp: 10, maxHp: 10, atk: 2, pos: 4 }];
updateHolders(g);
ok('losing every unit in the lane hands the position over', g.lanes.left.holder === 1);
ok('a monster sitting on the middle means nobody holds it', (() => {
  const h = newGame({ seed: 5 });
  updateHolders(h);
  return h.lanes.left.holder === null;
})());

console.log('\n── BREAKING THE MONSTER IN THE MIDDLE ──');
g = newGame({ seed: 5 });
{
  const lane = laneOf('left');
  const mid = middleOf(lane);
  // clear the two outer monsters so only the middle one is left standing
  g.lanes.left.monsters = g.lanes.left.monsters.filter((m) => m.pos === mid);
  g.lanes.left.monsters[0].hp = 1;                 // one blow will do it
  g.players[0].muster = 99;
  deploy(g, 'left', g.players[0].hand[0]);
  const mine = g.lanes.left.units[0];
  mine.pos = mid - 1;
  // an enemy standing further up the path, who should be shoved back
  g.lanes.left.units.push({ uid: 'enemy1', owner: 1, cardId: 'alfar',
    hp: 10, maxHp: 10, atk: 2, pos: mid + 1, moved: false, acted: false });
  const enemyBefore = mid + 1;
  g.phase = 'action'; mine.acted = false;
  const freeBefore = g.players[0].freeDeploys;
  attack(g, 'left', mine.uid, { uid: g.lanes.left.monsters[0].uid });
  const enemy = g.lanes.left.units.find((x) => x.uid === 'enemy1');
  ok('the middle monster dies and the position is taken', g.lanes.left.holder === 0);
  ok('the enemy is driven back one space',
    enemy && enemy.pos === enemyBefore + 1, enemy ? `${enemyBefore} to ${enemy.pos}` : 'gone');
  ok('and two more may be called up that path',
    g.players[0].freeDeploys === freeBefore + 2, String(g.players[0].freeDeploys));
  ok('a pushed unit is never driven past its own edge', (() => {
    const h = newGame({ seed: 5 });
    h.lanes.right.units.push({ uid: 'e', owner: 1, cardId: 'alfar', hp: 10, maxHp: 10,
      atk: 2, pos: homeOf(laneOf('right'), 1) });
    claimMiddle(h, 'right', 0);
    return h.lanes.right.units.find((x) => x.uid === 'e').pos === homeOf(laneOf('right'), 1);
  })());
}

console.log('\n── A WHOLE GAME, PLAYED BADLY BUT LEGALLY ──');
g = newGame({ seed: 21 });
let guard = 0;
while (g.winner === null && guard++ < 600) {
  const p = g.players[g.current];
  if (g.phase === 'main') {
    for (const id of [...p.hand]) deploy(g, ['left', 'centre', 'right'][guard % 3], id);
  }
  if (g.phase === 'move') {
    for (const lane of LANES) for (const un of [...g.lanes[lane.key].units]) move(g, lane.key, un.uid);
  }
  if (g.phase === 'action') {
    for (const lane of LANES) {
      for (const un of [...g.lanes[lane.key].units]) {
        if (un.owner !== g.current) continue;
        const t = targetsFor(g, lane.key, un.uid)[0];
        if (t) attack(g, lane.key, un.uid, t);
      }
    }
  }
  advance(g);
}
const end = summary(g);
ok('a full game runs to a winner without throwing', g.winner !== null,
  `${guard} steps, turn ${end.turn}, citadels ${end.citadels.join(' / ')}`);
ok('no unit ever survives at zero or less',
  LANES.every((l) => g.lanes[l.key].units.every((un) => un.hp > 0)));

console.log('\n── THE CARD POOL ──');
ok('every card is a named speaker with a rarity',
  CARDS.every((c) => c.name && RARITY[c.rarity]));
ok('card ids are unique', new Set(CARDS.map((c) => c.id)).size === CARDS.length);
ok('there are Commanders to choose from', CARDS.filter((c) => c.commander).length >= 4);
ok('every rarity is represented',
  Object.keys(RARITY).every((r) => CARDS.some((c) => c.rarity === r)));

console.log(fail ? `\n${fail} FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
