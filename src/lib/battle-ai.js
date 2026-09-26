// The Keep: an opponent to practise against.
//
// Lifted out of the page so the board can be redrawn, replaced or painted
// over without touching how the machine plays. It reads the same game state
// a person does and calls the same rules; it has no privileges.
//
// Not clever, and not meant to be. It presses one flank rather than
// dribbling a character into each path, finishes what it can finish, breaks
// the monster on a middle when that takes the position, and swings at the
// wall whenever it is standing in front of one. That is enough to punish
// leaving a lane empty, which is the thing worth learning first.

import {
  LANES, laneOf, middleOf, deploy, canDeploy, move, attack, targetsFor, cardOf,
} from './battle.js';
import { statsOf } from '../data/battle-cards.js';

/** The lane to press: where we already have a foothold and they do not. */
export function favourite(game, side) {
  let best = null;
  for (const lane of LANES) {
    const l = game.lanes[lane.key];
    const mine = l.units.filter((u) => u.owner === side).length;
    const theirs = l.units.filter((u) => u.owner !== side).length;
    if (laneOf(lane.key).slots - mine <= 0) continue;
    const score = mine * 2 - theirs + (lane.key === 'centre' ? 1 : 0);
    if (!best || score > best.score) best = { key: lane.key, score };
  }
  return best ? best.key : 'centre';
}

export function playMain(game, side) {
  const p = game.players[side];
  // free Reinforcements first: they cost nothing and expire with the turn
  for (const id of [...p.reinforcements]) {
    if (p.freeDeploys <= 0) break;
    for (const lane of LANES.filter((l) => l.monsters)) {
      if (!canDeploy(game, lane.key, id, { free: true })) {
        deploy(game, lane.key, id, { free: true });
        break;
      }
    }
  }
  // then the heaviest card that can be paid for, into the one lane
  let guard = 0;
  while (guard++ < 8) {
    const affordable = p.hand
      .filter((id) => statsOf(cardOf(id)).cost <= p.muster)
      .sort((a, b) => statsOf(cardOf(b)).cost - statsOf(cardOf(a)).cost);
    if (!affordable.length) break;
    const lane = favourite(game, side);
    const id = affordable.find((x) => !canDeploy(game, lane, x));
    if (!id) break;
    deploy(game, lane, id);
  }
}

export function playMove(game, side) {
  for (const lane of LANES) {
    for (const u of [...game.lanes[lane.key].units]) {
      if (u.owner !== side) continue;
      move(game, lane.key, u.uid);        // a refused move is simply skipped
    }
  }
}

export function playAction(game, side) {
  for (const lane of LANES) {
    for (const u of [...game.lanes[lane.key].units]) {
      if (u.owner !== side || u.acted) continue;
      const list = targetsFor(game, lane.key, u.uid);
      if (!list.length) continue;
      const mid = middleOf(laneOf(lane.key));
      const monsterAt = (t) => (game.lanes[lane.key].monsters.find((m) => m.uid === t.uid) || {});
      const wants = [
        (t) => t.kind === 'unit' && t.hp <= u.atk,                     // finish someone
        (t) => t.kind === 'monster' && monsterAt(t).pos === mid && t.hp <= u.atk,  // take a middle
        (t) => ['gate', 'commander', 'citadel'].includes(t.kind),      // this is how it is won
        (t) => t.kind === 'monster' && (t.hp <= u.atk || monsterAt(t).atk < u.hp),
        () => true,
      ];
      let chosen = null;
      for (const test of wants) { chosen = list.find(test); if (chosen) break; }
      if (chosen) attack(game, lane.key, u.uid, { uid: chosen.uid });
    }
  }
}

/** One phase of the Keep's turn, whichever phase it happens to be. */
export function playPhase(game, side) {
  if (game.phase === 'main') playMain(game, side);
  else if (game.phase === 'move') playMove(game, side);
  else if (game.phase === 'action') playAction(game, side);
}
