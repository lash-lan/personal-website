// Blood of Icetear: Citadel Wars — the card pool.
//
// Every card is someone who actually speaks somewhere in the stories, so the
// game and the fiction cannot drift apart. Rarity follows how much of the
// world a character carries, not how strong they would be in a fight: Hansall
// and Antharaiel hold whole sagas, the Aerwyn twins supervise the cleaning
// corps. Stats are a game layer laid on top and are not lore.

/** Rarity sets a Guardian's hit points, and a unit's bulk and bite. */
export const RARITY = {
  Common:    { hp: 10, atk: 2, cost: 1 },
  Uncommon:  { hp: 20, atk: 3, cost: 2 },
  Rare:      { hp: 30, atk: 5, cost: 3 },
  Epic:      { hp: 40, atk: 7, cost: 5 },
  Legendary: { hp: 50, atk: 9, cost: 7 },
  Mythical:  { hp: 60, atk: 12, cost: 9 },
};

export const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];

// commander: may be chosen as the Commander, who must be fielded.
const C = (id, name, house, rarity, note, commander = false) =>
  ({ id, name, house, rarity, note, commander });

export const CARDS = [
  // ── Mythical ──
  C('hansall', 'Hansall Whitegrove', 'High King of the Elves', 'Mythical',
    'Dry to the point of cruelty, and tired of being obeyed.', true),
  C('antharaiel', 'Antharaiel Whitewing', 'High Queen of Ellescand', 'Mythical',
    'Closes her book to deliver a verdict, and reopens it to end the conversation.', true),

  // ── Legendary ──
  C('hannarial', 'Hannarial Icetear', 'High-Captain', 'Legendary',
    'The captain everyone is afraid of, and with reason.', true),
  C('adamas', 'Adamas', 'First King of Men', 'Legendary',
    'Steady, unshakeable, and the last to break.', true),
  C('solenyra', 'Solenyra Gravespine', 'The High-Warden', 'Legendary',
    'Standing still, she feels larger than everyone in the room.', true),
  C('lucifial', 'Lucifial', 'Lord of Punishment', 'Legendary',
    'A Titan eroded by his own duty into something barely recognisable.'),
  C('hyperion', 'Hyperion', 'World Titan of Light', 'Legendary',
    'His voice enters the chamber last, and settles across the firmament.'),

  // ── Epic ──
  C('shaedra', 'Shaedra Nyxthorn', 'Ranger', 'Epic', 'Violence given a body.'),
  C('lazarus', 'Lazarus', 'Black robes', 'Epic', 'Silent as a drawn blade.'),
  C('solomon', 'King Solomon', 'Of Humanity', 'Epic', 'Was, all along, opening Hell.', true),
  C('caligula', 'Caligula', 'The tormentor', 'Epic',
    'Taught a girl that love makes you weak, and made her believe it.'),
  C('tiamel', 'Tiamel', 'The Dragon Child', 'Epic', 'Terror of the southern skies.'),
  C('gilgamesh', 'Gilgamesh', 'Prince', 'Epic', 'Breathes the way his father did before a hunt.'),
  C('sederous', 'Sederous Lionheart', 'The King of Scraps', 'Epic', 'Impossible to embarrass.'),
  C('sinbad', 'Sinbad Sinodess', 'Fleets and black powder', 'Epic',
    'Grinning like an idiot with the first flintlock in the world.'),
  C('abel', 'Abel', 'Son of Adamas', 'Epic', 'The human the elves let inside their rites.'),
  C('cainan', 'Cainan', 'The other son', 'Epic', 'Watches from across the firelight, without softness.'),
  C('hadrian', 'Hadrian Sedrick', 'House Sedrick', 'Epic',
    'Considers uncertainty a perfectly respectable career.', true),

  // ── Rare ──
  C('santhur', 'Santhur Nyxthorn', 'Archer', 'Rare', 'Forgets what he was arguing about.'),
  C('caeleira', 'Caeleira Duskfall', 'Archer', 'Rare', 'Calls a rival hit surrender wearing a number.'),
  C('golian', 'Golian Gravespine', 'Inventor', 'Rare', 'A personal vendetta against safety.'),
  C('renaris', 'Renaris Gravespine', 'Soulwork', 'Rare', 'Sits with the dead until they are not afraid.'),
  C('anteira', 'Anteira Nyxthorn', "Nyxthorn's candidate", 'Rare', 'Grows quieter as it goes on.'),
  C('herafel', 'Herafel Duskfall', 'Intelligence', 'Rare',
    'Knows every decision you will make before you make it.'),
  C('syrel', 'Syrel Thorneheart', 'The Medic', 'Rare', 'Hums softly while threading flesh back together.'),
  C('anthuriun', 'Anthuriun Icetear', 'Second to the High-Captain', 'Rare',
    'The one elf whose cruelty is quieter.'),
  C('godrian', 'Godrian Greyhide', 'The eastern choke points', 'Rare', 'Fortifies without confirmation.'),
  C('crowley', 'Lord Cavendish Crowley', 'The brother who waited', 'Rare',
    'His tone never shifts, whatever is being discussed.'),
  C('glorfarsall', 'Glorfarsall Elysium', 'Sword and light', 'Rare', 'Taught the boys to fight.'),
  C('vishraa', 'Vishraa', 'Of the Sacred Order', 'Rare', 'Petitions for mercy where nobody else will.'),
  C('galatrel', 'Galatrel', "Hansall's sister", 'Rare', 'Exhausted, terrified, happy.'),
  C('evalon', 'Evalon', 'Mother of Cainan and Abel', 'Rare', 'Folds her arms at kings.'),

  // ── Uncommon ──
  C('sendarel', 'Sendarel Lothrin', 'Winged', 'Uncommon', 'Woke because a dead man stood beside his bed.'),
  C('revendrinn', 'Revendrinn Nyxthorn', 'Shadow', 'Uncommon', 'Never quite visible. One boot gives him away.'),
  C('nerynolion', 'Nerynolion Shadebloom', 'Poisons', 'Uncommon', 'Not maliciously. According to Nerynolion.'),
  C('selanal', 'Selanal Thorneheart', 'Lady of the Green', 'Uncommon', 'Answers a whole strategy with no.'),
  C('rhonin', 'Rhonin Duskfall', 'Strike group', 'Uncommon', 'Treats a fortified necromancer as an invitation.'),
  C('raastali', 'Raastali', 'Prince', 'Uncommon', 'Slept through an entire council inside his cloak.'),
  C('hansenel', 'Hansenel Icetear', 'House Icetear', 'Uncommon',
    'Taught a camp an obscene marching song and denied writing it.'),
  C('serallion', 'Serallion Lune', 'Of the Moon', 'Uncommon', 'The moon has been speaking to her.'),
  C('thalara', 'Thalara Vintshade', 'The chef', 'Uncommon', 'Directs the defensive line with cold precision.'),
  C('virelyn', 'Virelyn Shadebloom', 'Archer commander', 'Uncommon', 'Short, efficient, unquestioned.'),
  C('marie', 'Marie', 'Part One', 'Uncommon', 'Three inches from your nose when you wake.'),
  C('tashi', 'Tashi', 'Part One', 'Uncommon', 'Always already training.'),
  C('gareth', 'Lord Gareth Sedrick', "Hadrian's father", 'Uncommon', 'Moving before anyone else understands.'),
  C('aeralyn', 'Aeralyn', 'Of the Elu', 'Uncommon', 'Whispers a child’s charm over a dead deer.'),
  C('ascena', 'Ascena Icetear', 'House Icetear', 'Uncommon', 'Has the cold patience the work requires.'),
  C('allani', 'Allani', 'The mother', 'Uncommon', 'Chained where her daughter could see.'),

  // ── Common ──
  C('alfar', 'Alfar Chandralon', 'House Chandralon', 'Common', 'Delivered like livestock, and funny about it.'),
  C('rellien', 'Rellien Aerwyn', 'The Twins', 'Common', 'An executioner who occasionally holds a mop.'),
  C('vessa', 'Vessa Aerwyn', 'The Twins', 'Common', 'Smiles at exactly the same moment as Rellien.'),
  C('ilaren', 'Ilaren', 'Junior cartographer', 'Common', 'Does not believe in coincidence.'),
  C('letharion', 'Letharion', 'Winged', 'Common', 'Adjusting his grip on a spear he is not ready for.'),
  C('rethan', 'Rethan', 'The first fear', 'Common', 'Looks away as though he had not seen.'),
  C('caligular', 'Caligular', 'The First Command', 'Common', 'His mouth curves, in approval rather than amusement.'),
  C('driver', 'The Old Elven Driver', 'The Verdant Gate', 'Common', 'Has said two words since dawn.'),
  C('cassian', 'Cassian Chandralon', "Alfar's uncle", 'Common', 'Led the burning of an elven city.'),
];

/**
 * The neutral things squatting in the side routes. Nobody owns them, they
 * never take a turn, and they are entities held at a position rather than
 * anything painted into the battlefield, so killing one frees the ground.
 * Art comes from Lash's own battlefield sheet.
 */
export const MONSTERS = [
  { id: 'corrupted-angel', name: 'Corrupted Angel', hp: 26, atk: 7 },
  { id: 'golden-angel',    name: 'Golden Angel',    hp: 30, atk: 6 },
  { id: 'serpent-beast',   name: 'Serpent Beast',   hp: 22, atk: 6 },
  { id: 'winged-lich',     name: 'Winged Lich',     hp: 18, atk: 8 },
  { id: 'spider-horror',   name: 'Spider Horror',   hp: 20, atk: 7 },
  { id: 'dark-dragon',     name: 'Dark Dragon',     hp: 34, atk: 5 },
];

/** A monster's portrait. Every one of the six has one. */
export const monsterArt = (mid) => `/images/monsters/${mid}.webp`;

/**
 * The cards Lash has drawn a portrait for. Built from his own character
 * references by scripts/build-card-art.mjs, cropped square and shrunk to a
 * thumbnail. Everyone else shows their initial until there is a picture.
 */
export const ART = new Set([
  'abel', 'adamas', 'anthuriun', 'cainan', 'evalon', 'gilgamesh', 'glorfarsall',
  'hannarial', 'hansall', 'hansenel', 'raastali', 'revendrinn', 'sederous',
  'serallion', 'tiamel',
]);

/** The portrait for a card, or null where none has been drawn yet. */
export const artOf = (id) => (ART.has(id) ? `/images/cards/${id}.webp` : null);

export const byId = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/** A card's fighting numbers, from its rarity. */
export const statsOf = (card) => ({ ...RARITY[card.rarity] });
