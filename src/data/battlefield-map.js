// Where the game's positions sit on a battlefield painting.
//
// THIS FILE IS ARTWORK, NOT RULES. The rules live in src/lib/battle.js and
// know nothing about pictures: they only know that a lane is a row, some
// ground, and a row. This file says where those positions fall on one
// particular painting, in fractions of its width and height, so the same
// engine can later be given the Grey Wall or the City of Light by writing
// another map beside this one and changing nothing else.
//
// Coordinates are normalised 0 to 1 against the image's own box, never
// pixels, so a phone and a desktop point at the same piece of ground.
//
// The engine's positions map on to these nodes exactly as drawn:
//
//   centre   0 = your Great Gate, 1..3 = the ground, 4 = their Great Gate
//   left     0 = your High Gate,  1..5 = the ground, 6 = their High Gate
//   right    the same
//
// so a node's id is `${lane}:${position}` and nothing needs translating.

export const MAPS = {
  'citadel-wars': {
    id: 'citadel-wars',
    name: 'The Great Gate',
    image: '/images/battlefield/citadel-wars.webp',
    imageSmall: '/images/battlefield/citadel-wars-900.webp',
    width: 1536,
    height: 1024,
    // the bottom of the painting is always the near army; the picture does
    // not turn round between turns, so in a two player game the second
    // player fights from the far end
    nodes: {
      // ── the near keep ───────────────────────────────────────────────
      'citadel:0':   { x: 0.500, y: 0.905, type: 'citadel', side: 0, label: 'Your Citadel' },
      'commander:0': { x: 0.500, y: 0.742, type: 'commander', side: 0, label: 'Commander' },
      'centre:0':    { x: 0.500, y: 0.655, type: 'gate-great', side: 0, label: 'The Great Gate' },
      'left:0':      { x: 0.182, y: 0.645, type: 'gate-high', side: 0, label: 'High Gate' },
      'right:0':     { x: 0.815, y: 0.640, type: 'gate-high', side: 0, label: 'High Gate' },

      // ── the centre: the war zone. Three positions, five a side ──────
      'centre:1': { x: 0.487, y: 0.560, type: 'ground', lane: 'centre', step: 1, capacity: 5 },
      'centre:2': { x: 0.487, y: 0.393, type: 'ground', lane: 'centre', step: 2, capacity: 5 },
      'centre:3': { x: 0.487, y: 0.228, type: 'ground', lane: 'centre', step: 3, capacity: 5 },

      // ── the left road: wild, five positions, three of them held by
      //    something, and the middle one worth taking ──────────────────
      'left:1': { x: 0.156, y: 0.583, type: 'ground', lane: 'left', step: 1, capacity: 3 },
      'left:2': { x: 0.141, y: 0.519, type: 'ground', lane: 'left', step: 2, capacity: 3, monster: true },
      'left:3': { x: 0.190, y: 0.367, type: 'ground', lane: 'left', step: 3, capacity: 3, monster: true, control: true },
      'left:4': { x: 0.196, y: 0.212, type: 'ground', lane: 'left', step: 4, capacity: 3, monster: true },
      'left:5': { x: 0.266, y: 0.172, type: 'ground', lane: 'left', step: 5, capacity: 3 },

      // ── the right road ──────────────────────────────────────────────
      'right:1': { x: 0.845, y: 0.590, type: 'ground', lane: 'right', step: 1, capacity: 3 },
      'right:2': { x: 0.879, y: 0.527, type: 'ground', lane: 'right', step: 2, capacity: 3, monster: true },
      'right:3': { x: 0.841, y: 0.381, type: 'ground', lane: 'right', step: 3, capacity: 3, monster: true, control: true },
      'right:4': { x: 0.807, y: 0.220, type: 'ground', lane: 'right', step: 4, capacity: 3, monster: true },
      'right:5': { x: 0.736, y: 0.175, type: 'ground', lane: 'right', step: 5, capacity: 3 },

      // ── the far keep ────────────────────────────────────────────────
      'centre:4':    { x: 0.485, y: 0.146, type: 'gate-great', side: 1, label: 'The Great Gate' },
      'left:6':      { x: 0.348, y: 0.148, type: 'gate-high', side: 1, label: 'High Gate' },
      'right:6':     { x: 0.651, y: 0.148, type: 'gate-high', side: 1, label: 'High Gate' },
      'commander:1': { x: 0.500, y: 0.075, type: 'commander', side: 1, label: 'Commander' },
      'citadel:1':   { x: 0.500, y: 0.028, type: 'citadel', side: 1, label: 'Their Citadel' },
    },
  },
};

export const DEFAULT_MAP = 'citadel-wars';


/**
 * Where several characters stand when they share one position. Offsets are
 * in node units, scaled with the board, so a formation holds its shape at
 * any zoom. Each figure keeps its own ground: none is ever placed where
 * another already stands, which is what keeps every one of them selectable.
 *
 *   1        2         3          4            5
 *   .        . .       . .       . . .       . . . . .
 *                       .         . .         . . .
 */
export function formation(n) {
  const rows = {
    1: [[0]],
    2: [[-0.55, 0.55]],
    3: [[-0.6, 0.6], [0]],
    4: [[-0.9, 0, 0.9], [-0.45, 0.45]],
    5: [[-1.2, -0.6, 0, 0.6, 1.2], [-0.6, 0, 0.6]],
  }[Math.min(5, Math.max(1, n))];
  const out = [];
  let i = 0;
  for (const [r, row] of rows.entries()) {
    for (const dx of row) {
      if (i >= n) break;
      out.push({ dx, dy: r * 0.62 });
      i++;
    }
  }
  // any beyond the shapes above tuck in behind
  while (out.length < n) out.push({ dx: (out.length % 3 - 1) * 0.7, dy: 1.3 });
  return out;
}

/** How near a pointer must come to a node to count as dropping on it. */
export const DROP_RADIUS = 0.055;     // as a fraction of the board's width

/** The node a lane position stands on. */
export const nodeId = (lane, pos) => `${lane}:${pos}`;

/** Every node of one lane, in marching order from the near end. */
export function laneNodes(map, lane, track) {
  const out = [];
  for (let p = 0; p < track; p++) {
    const id = nodeId(lane, p);
    if (map.nodes[id]) out.push({ id, pos: p, ...map.nodes[id] });
  }
  return out;
}

/**
 * The short name shown on a developer marker: L1 to L5, C1 to C3, and the
 * keeps by what they are. Used only while the geography is being checked.
 */
export function markerLabel(id) {
  const [lane, pos] = id.split(':');
  const n = Number(pos);
  if (lane === 'citadel') return n === 0 ? 'YOUR CITADEL' : 'THEIR CITADEL';
  if (lane === 'commander') return n === 0 ? 'YOUR CMDR' : 'THEIR CMDR';
  if (lane === 'centre') {
    if (n === 0) return 'YOUR GREAT GATE';
    if (n === 4) return 'THEIR GREAT GATE';
    return `C${n}`;
  }
  const side = lane === 'left' ? 'L' : 'R';
  if (n === 0) return `YOUR ${side} HIGH GATE`;
  if (n === 6) return `THEIR ${side} HIGH GATE`;
  return `${side}${n}`;
}
