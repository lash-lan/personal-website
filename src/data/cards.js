// Blood of Icetear - the card set.
//
// Every card is defined here as data. Nothing about a card lives in a page or
// a component, so adding one never means touching the game.
//
// Sources, in order of authority:
//   1. Lash's Canva prototype "Prototype: Card Design" - 58 designed cards,
//      their names, rarities, lineages, abilities and card numbers. Those
//      cards keep their printed numbers as ids, e.g. 'LAH.09'.
//   2. The Foundation Age codex on this site - the World Titans, the avatars,
//      the mortal progenitors, the elven kings and the artifacts.
//   3. The bestiary, races, factions and relics in the lore database.
//   4. The stories: The Squire, The Red Rangers, Last Days of Legends.
//
// The World Titans are deliberately NOT cards. The Law of Divine Distance
// forbids celestial beings intervening in mortal affairs, and permits them
// only to send Avatars. So the Avatars are the cards, and the gods behind
// them are not. Their deeds appear as spells instead.
//
// The rules for Power, Cost and rarity are in docs/card-standards.md. In
// short: a character has one number, Power. When two characters fight, each
// takes the other's Power off its own. Cost is Power divided by three,
// rounded up, plus one or two for a strong ability.

/**
 * Rarity as stable ids. The display names are the prototype's and may be
 * replaced with lore-friendly ones later; nothing in the game may ever test
 * for the name, only the tier.
 */
export const TIERS = {
  tier_1: { id: 'tier_1', name: 'Common',    letter: 'C', power: [2, 4],   copies: 3, weight: 100 },
  tier_2: { id: 'tier_2', name: 'Uncommon',  letter: 'U', power: [5, 7],   copies: 3, weight: 52 },
  tier_3: { id: 'tier_3', name: 'Rare',      letter: 'R', power: [8, 12],  copies: 3, weight: 26 },
  tier_4: { id: 'tier_4', name: 'Epic',      letter: 'E', power: [13, 18], copies: 2, weight: 10 },
  tier_5: { id: 'tier_5', name: 'Ascendant',  letter: 'A', power: [19, 24], copies: 1, weight: 3.5 },
  tier_6: { id: 'tier_6', name: 'Mythical',  letter: 'M', power: [25, 30], copies: 1, weight: 1 },
};
export const TIER_ORDER = ['tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5', 'tier_6'];

/** The highest Muster a player ever reaches, and so the highest a card may cost. */
export const MUSTER_CEILING = 10;

/**
 * Cost follows from Power. `bump` is the price of a strong ability, and the
 * total is capped at the Muster ceiling - a card nobody can ever afford is not
 * a card. At the very top the ability is effectively free, which is the whole
 * reason Mythicals feel like Mythicals.
 */
export const costOf = (power, bump = 0) =>
  Math.min(MUSTER_CEILING, Math.ceil(power / 3) + bump);

/**
 * The keywords, and nothing beyond them. Every keyword is a thing a new player
 * must learn before they can read a card, so the list is closed on purpose.
 */
export const KEYWORDS = {
  'Quick Attack': 'May strike the turn it arrives.',
  'Summon': 'Put a token character into the arena. Tokens are never drawn.',
  'Destroy': 'Kill it. It goes to the graveyard.',
  'Exile': 'Remove it from the game entirely. It never returns.',
  'Graveyard': 'Where dead cards rest, and can be reached.',
};

// c() builds a character, s() a spell. Kept terse so the set reads as a list
// of cards rather than a wall of punctuation.
//   id     the printed card number where there is one, otherwise a slug
//   name   as printed
//   line   the lineage in brackets on the prototype: High Elf, World Titan…
//   tags   affiliations cards can check for: Red Rangers, Undead, Beast…
//   power  the one number
//   bump   added to the derived cost, the price of a strong ability
//   text   the ability, as printed, or null for a plain fighter
const c = (id, name, tier, power, line, tags, text = null, bump = 0) =>
  ({ id, name, type: 'character', tier, power, cost: costOf(power, bump), line, tags, text });
const s = (id, name, tier, cost, text, tags = [], instant = false) =>
  ({ id, name, type: 'spell', tier, cost, text, tags, instant });

export const CARDS = [
  // ───────────────────────── THE RED RANGERS ─────────────────────────
  // The best-developed faction, and the one the prototype leans on. Their
  // theme is numbers: they summon, they come back, they fight as a squad.
  c('LAH.17', 'Moon Warrior', 'tier_2', 5, 'High Elf', ['Red Rangers']),
  c('LAH.05', 'Red Rangers Archer', 'tier_2', 5, 'High Elf', ['Red Rangers'],
    'Strikes with +2 Power against a Rare or higher character.'),
  c('LAH.14', 'Red Rangers Warrior', 'tier_2', 6, 'High Elf', ['Red Rangers'],
    'When Red Rangers Warrior dies, she returns to your side of the arena with 1 Power at the start of your opponent’s turn. If she dies again, exile her.', 1),
  c('rr-ranger', 'Red Ranger', 'tier_1', 3, 'High Elf', ['Red Rangers', 'Token']),
  c('LAH.03', 'Red Rangers Squad Leader', 'tier_3', 9, 'High Elf', ['Red Rangers'],
    'When Red Rangers Squad Leader enters the arena, summon 2 Red Rangers to your side of the arena.', 1),
  c('LAH.12', 'Rellien & Vessa Aerwyn', 'tier_3', 8, 'High Elf', ['Red Rangers', 'Twins'],
    'May strike twice in the same turn.', 1),
  c('rr-syrel', 'Syrel Thorneheart', 'tier_3', 10, 'High Elf', ['Red Rangers'],
    'Strikes with +3 Power while you have another Red Ranger in the arena.'),
  c('LAH.13', 'Elarien Thornwither', 'tier_3', 11, 'High Elf', ['Red Rangers', 'Traitor'],
    'When Elarien Thornwither enters the arena, destroy 2 Rare or lower characters.', 1),
  c('LAH.15', 'Amvala Nyxthorn', 'tier_4', 16, 'High Elf', ['Red Rangers', 'Nyxthorn'],
    'Counts as a Red Ranger. When Amvala Nyxthorn dies, return her to your side of the arena at the start of your opponent’s turn. If she dies again, exile her.', 1),
  c('LAH.09', 'Shaedra Nyxthorn', 'tier_4', 17, 'High Elf', ['Red Rangers', 'Nyxthorn'],
    'When Shaedra Nyxthorn enters the arena, summon 2 Red Rangers to your side of the arena.'),
  c('LAH.08', 'Solenyra Gravespine, High-Warden of the Red Rangers', 'tier_5', 20, 'High Elf', ['Red Rangers', 'Gravespine'],
    'When Solenyra Gravespine enters the arena, exile 2 Rare or lower characters, or exile 1 Epic or higher character.', 1),
  c('LAH.16', 'Anthurian Icetear, Vice Captain of the Red Rangers', 'tier_5', 21, 'High Elf', ['Red Rangers', 'Icetear'],
    'When Anthurian Icetear enters the arena, summon 2 Red Rangers Squad Leaders to your side of the arena.'),
  c('ice-hannarial-young', 'Hannarial Icetear', 'tier_3', 12, 'High Elf', ['Red Rangers', 'Icetear'],
    'When Hannarial Icetear enters the arena, summon a Red Ranger to your side of the arena.'),
  c('LAH.06', 'Hannarial Icetear, Captain of the Red Rangers', 'tier_5', 22, 'High Elf', ['Red Rangers', 'Icetear'],
    'When Hannarial Icetear enters the arena, summon 2 Red Rangers Squad Leaders to your side of the arena.', 1),

  // ───────────────────────── HOUSE ICETEAR ─────────────────────────
  c('ice-ascena', 'Ascena Icetear', 'tier_3', 9, 'High Elf', ['Icetear'],
    'Cannot be destroyed by a spell.'),
  c('ice-hansenel', 'Hansenel Icetear', 'tier_3', 10, 'High Elf', ['Icetear'],
    'When Hansenel Icetear enters the arena, draw a card.'),
  c('LAH.26', 'Seneal Icetear, Witch Queen of the North', 'tier_5', 24, 'High Elf', ['Icetear', 'Witch'],
    'Halve the Power of every enemy character for two of your opponent’s turns.', 1),
  c('ice-child-of-winter', 'Icetear, Child of Winter', 'tier_6', 28, 'Prime God', ['Icetear', 'Divine'],
    'When Icetear enters the arena, no enemy character may strike for their next two turns.', 1),

  // ───────────────────────── THE ELU ─────────────────────────
  // The elven realms, one card per house so the lineages teach themselves.
  c('elu-fiarra', 'Fiarra Starsterling', 'tier_3', 9, 'High Elf', ['Elu Primus'],
    'When Fiarra enters the arena, give a friendly character +3 Power.'),
  c('elu-mayra', 'Mayra Padukindel', 'tier_3', 8, 'High Elf', ['Elu Primus'],
    'When Mayra Padukindel enters the arena, draw a card.'),
  c('elu-numaya', 'Numaya Steamrose', 'tier_3', 9, 'High Elf', ['Elu Primus', 'Artificer'],
    'Your spells cost 1 less.', 1),
  c('elu-serallion', 'Serallion, Matron of the Moon', 'tier_4', 13, 'Moon Elf', ['Elu-Chandra', 'Crown'],
    'When Serallion enters the arena, look at the top 3 cards of your deck and take one.'),
  c('elu-revendrinn', 'Revendrinn Nyxthorn', 'tier_4', 13, 'High Elf', ['Nyxthorn', 'Shadow'],
    'Cannot be struck the turn she enters the arena.'),
  c('elu-glorfarsall', 'Glorfarsall Elysium', 'tier_4', 14, 'High Elf', ['Sacred Order'],
    'Your other characters strike with +1 Power.'),
  c('LAH.11', 'Edmonta Lothrin', 'tier_4', 13, 'Soul Elf', ['Elu-Hsal', 'Soul Defiler'],
    'When Edmonta Lothrin enters the arena, summon 2 Rare or lower Undead characters, or 1 Epic Undead character.', 1),
  c('elu-hsal-eraklah', 'The Hsal Eraklah', 'tier_4', 14, 'Soul Elf', ['Elu-Hsal', 'Soul Defiler'],
    'When The Hsal Eraklah enters the arena, return a character from either graveyard to your side of the arena.', 1),
  c('LAH.02', 'Nyrial Dagrhan, Princess of the Elu-Draghar', 'tier_4', 15, 'Dragon Elf Lord', ['Elu-Dragar'],
    'May strike twice in the same turn. Loses 5 Power if she strikes a second time.', 1),
  c('elu-sederous', 'Sederous Lionheart, King of Scraps', 'tier_4', 16, 'Half Elf Lord', ['Lionheart', 'Crown'],
    'Costs 1 less for each character in your graveyard, to a minimum of 3.'),
  c('elu-anna', 'Anna, the White Witch', 'tier_4', 15, 'Half Elf', ['Elu-Dues', 'Witch'],
    'When Anna enters the arena, an enemy character cannot strike for two turns.', 1),
  c('elu-raastali', 'Prince Raastali', 'tier_3', 10, 'Half Elf Lord', ['Elu-Dues'],
    'Quick Attack.'),
  c('elu-avalon', 'Avalon, Queen of Elu-Hsal', 'tier_5', 20, 'Soul Elf Lord', ['Elu-Hsal', 'Crown'],
    'Quick Attack. When Avalon enters the arena, return a character from your graveyard to your hand.', 1),
  c('elu-karscyll', 'Karscyll, 3rd Queen of Elu-Dragar', 'tier_5', 21, 'Dragon Elf Lord', ['Elu-Dragar', 'Crown'],
    'Quick Attack.'),
  c('elu-gilgamesh', 'King Gilgamesh', 'tier_5', 22, 'Half Elf Lord', ['Elu-Dues', 'Crown'],
    'Quick Attack. When Gilgamesh dies, deal his Power to the enemy Citadel.', 1),
  c('elu-darklord', 'Darklord Anthurian Bloodwing', 'tier_5', 23, 'Half Elf Lord', ['Elu-Dues', 'Fallen'],
    'When Darklord Anthurian enters the arena, destroy your own weakest character and add its Power to his.', 1),
  c('elu-tiamel', 'Tiamel, First Queen of the Elu-Dragar', 'tier_6', 26, 'Dragon Elf Lord', ['Elu-Dragar', 'Crown'],
    'When Tiamel enters the arena, deal 6 damage to every enemy character.', 1),
  c('elu-hansall', 'Hansall, First High King of Elves', 'tier_6', 27, 'High Elf Lord', ['Whitegrove', 'Crown'],
    'While Hansall is in the arena, your other characters cannot be exiled.', 1),
  c('elu-antharaiel', 'Antharaiel Whitewing', 'tier_6', 26, 'High Elf Lord', ['Ellescand', 'Crown'],
    'When Antharaiel Whitewing enters the arena, return a spell from your graveyard to your hand.', 1),

  // ───────────────────────── THE FIRST FAMILY ─────────────────────────
  c('fa-evalon', 'Evalon, Mother of Humanity', 'tier_3', 9, 'Human', ['Humanity', 'Healer'],
    'At the end of your turn, restore 2 Power to each of your damaged characters.', 1),
  c('fa-abel', 'Abel, Second Son of Humanity', 'tier_4', 14, 'Human', ['Humanity'],
    'When Abel dies, a friendly character gains +6 Power. Exile Abel.'),
  c('fa-cainan', 'Cainan, First Son of Humanity', 'tier_4', 16, 'Human', ['Humanity'],
    'When Cainan enters the arena, destroy a friendly character. Cainan gains half its Power.'),
  c('fa-adamas-king', 'Adamas, First King of Men', 'tier_6', 26, 'Human Lord', ['Humanity', 'Crown'],
    'Your Human characters strike with +4 Power. While Adamas is in the arena, your Citadel Mastery cannot fall by more than 5 in a single turn.', 2),
  c('fa-adamas', 'Adamas, Father of Humanity', 'tier_5', 23, 'Human Lord', ['Humanity', 'Crown'],
    'While Adamas is in the arena, your Citadel Mastery cannot fall by more than 10 in a single turn.', 1),

  // ───────────────────────── THE GODS BLOOD ─────────────────────────
  c('gb-solomon', 'King Solomon, King of Ambition', 'tier_5', 20, 'Gods Blood', ['Gods Blood', 'Crown'],
    'When King Solomon enters the arena, take a card at random from your opponent’s hand.', 1),
  c('gb-lazarus', 'Lazarus, High Councilor', 'tier_4', 15, 'Gods Blood', ['Gods Blood', 'Shadow'],
    'Cannot be struck while another friendly character is in the arena.', 1),
  c('gb-caligula', 'Caligula, King of Domination', 'tier_5', 22, 'Gods Blood', ['Gods Blood', 'Crown'],
    'When Caligula enters the arena, take control of an enemy Rare or lower character for the rest of the match.', 2),
  c('gb-godrian', 'Godrian Greyhide, Realm Commander', 'tier_5', 21, 'Human Lord', ['Humanity'],
    'Your other Human characters gain +3 Power.', 1),

  // ───────────────────────── THE GREAT WITCHES ─────────────────────────
  // Four cardinal witches, one per direction, all of a kind by design.
  c('LAH.22', 'Helena Katsunra, Great Witch of the East', 'tier_5', 24, 'Human', ['Witch'],
    'Halve the Power of every enemy character for two of your opponent’s turns.', 1),
  c('LAH.23', 'Morrina Penfyre, Great Witch of the West', 'tier_5', 24, 'Human', ['Witch', 'Penfyre'],
    'Halve the Power of every enemy character for two of your opponent’s turns.', 1),
  c('LAH.24', 'Melissra Orscina, Great Witch of the South', 'tier_5', 24, 'Elder Vampire', ['Witch', 'Vampire'],
    'Halve the Power of every enemy character for two of your opponent’s turns.', 1),
  c('LAH.25', 'Susanna Bruhneville, Great Witch of the North', 'tier_6', 25, 'Ancient Spirit', ['Witch'],
    'Halve the Power of every enemy character for two of your opponent’s turns.', 1),
  c('wit-bruhneville-daughter', 'Bruhneville Daughter', 'tier_3', 10, 'Human Spirit', ['Witch'],
    'Halve the Power of one enemy character for two of your opponent’s turns.', 1),

  // ───────────────────────── KINGDOMS OF MEN ─────────────────────────
  c('knight-token', 'Knight', 'tier_1', 4, 'Human Knight', ['Knight', 'Token']),
  c('men-citadel-captain', 'Citadel Captain', 'tier_3', 11, 'Human Knight', ['Knight'],
    'While Citadel Captain is in the arena, enemy characters must strike him before your Citadel.', 1),
  c('LAH.01', 'Leon Godrick, Second Prince of the Lionheart', 'tier_4', 13, 'Human', ['Lionheart', 'Crown'],
    'Gains +2 Power for every other character in the arena.', 1),
  c('LAH.10', 'Duke Lycareon Tyberious', 'tier_4', 17, 'Human', ['Wolfsbane', 'Assassin'],
    'When Duke Lycareon enters the arena, destroy one Epic, one Rare and one Uncommon character.', 2),
  c('men-arthur', 'Prince Arthur Penfyre', 'tier_5', 19, 'Human', ['Lionheart', 'Penfyre', 'Knight'],
    'When Prince Arthur Penfyre enters the arena, summon 2 Knights to your side of the arena.', 1),
  c('men-zhuge', 'Zhuge Guan, Dragon Strategist', 'tier_5', 19, 'Human Lord', ['Crown', 'Strategist'],
    'When Zhuge Guan enters the arena, look at your opponent’s hand and take a spell from it.', 1),
  c('men-zhou', 'Zhou Ying, Phoenix General', 'tier_5', 21, 'Human Lord', ['Crown'],
    'When Zhou Ying dies, return her to your hand.', 1),
  c('men-mordred', 'Mordred, The Broken', 'tier_5', 20, 'Human Druid', ['Fallen', 'Druid'],
    'When Mordred strikes, he loses 2 Power and the struck character loses 2 more.', 1),
  c('orc-raider', 'Orc Raider', 'tier_1', 4, 'Orc', ['Orc', 'Warband', 'Token'],
    'Quick Attack.'),
  c('men-wufgarr', 'Warlord Wufgarr', 'tier_5', 22, 'Orc Lord', ['Orc', 'Warband'],
    'Quick Attack. When Warlord Wufgarr enters the arena, summon 2 Orc Raiders.', 1),
  c('men-fleetmaster', 'Sinodess Fleetmaster', 'tier_3', 9, 'Human', ['Sinodess'],
    'When Sinodess Fleetmaster enters the arena, draw a card and discard a card.'),
  c('LAH.30', 'Sinbad-Sinodess, The Pirate King', 'tier_6', 25, 'Chosen Human', ['Sinodess', 'Crown'],
    'When Sinbad-Sinodess enters the arena, exchange 2 of your characters for 2 of your opponent’s.', 2),

  // ───────────────────────── THE ARCHMAGI ─────────────────────────
  // One wizard per lineage - a cycle that teaches the lineages at a glance.
  c('mag-vault', 'Archmagi Vault', 'tier_5', 19, 'Human Wizard', ['Archmagi'],
    'Quick Attack. Your spells cost 1 less.', 1),
  c('mag-geof', 'Archmagi Geof', 'tier_5', 20, 'Dwarf Wizard', ['Archmagi', 'Dwarf'],
    'Quick Attack. When Archmagi Geof enters the arena, give a friendly character +5 Power.', 1),
  c('mag-treantan', 'Archmagi Treantan', 'tier_5', 21, 'Treant Wizard', ['Archmagi', 'Treant'],
    'Quick Attack. At the end of your turn, Archmagi Treantan gains 2 Power.', 1),
  c('mag-serra', 'Archmagi Serra', 'tier_5', 20, 'High Elf Wizard', ['Archmagi'],
    'Quick Attack. When Archmagi Serra enters the arena, return a spell from your graveyard to your hand.', 1),

  // ───────────────────────── THE UNDEAD ─────────────────────────
  c('und-ghoul', 'Ghoul', 'tier_1', 3, 'Undead', ['Undead']),
  c('und-goulargz', 'Goulargz', 'tier_3', 10, 'Undead', ['Undead'],
    'When Goulargz enters the arena, return a Common or Uncommon character from your graveyard.', 1),
  c('und-miss-crowly', 'Miss Crowly', 'tier_5', 19, 'Ancient Spirit', ['Undead'],
    'When Miss Crowly enters the arena, an enemy character loses 10 Power for two turns.', 1),
  c('und-wraith-knight', 'Wraith Knight', 'tier_5', 21, 'Undead', ['Undead', 'Knight'],
    'Cannot be destroyed by a spell. When Wraith Knight dies, exile it.', 1),
  c('und-koschei-berserker', 'King Koschei, the Berserker King of Golskull', 'tier_6', 26, 'Zombie Lord', ['Undead', 'Crown'],
    'Quick Attack. When a friendly Undead dies, King Koschei gains 4 Power. When King Koschei dies, return him to your hand.', 2),
  c('und-koschei', 'Koschei, the Zombie King', 'tier_5', 22, 'Zombie Lord', ['Undead', 'Crown'],
    'Quick Attack. When a friendly Undead dies, Koschei gains 2 Power.', 1),
  c('und-pale-lady', 'The Pale Lady Slahaln', 'tier_6', 27, 'Ancient Spirit', ['Undead', 'Witch'],
    'Every enemy character loses 10 Power for two of your opponent’s turns.', 2),

  // ───────────────────────── THE BESTIARY ─────────────────────────
  // Tier C, B and A from the bestiary, in that order of danger.
  c('mon-imptizzle', 'Imptizzle', 'tier_1', 3, 'Imp', ['Demon'],
    'When Imptizzle dies, draw a card.'),
  c('mon-garudling', 'Garudling', 'tier_2', 5, 'Beast', ['Beast', 'Sky'],
    'Quick Attack.'),
  c('mon-mersoldier', 'Mersoldier', 'tier_2', 6, 'Merfolk', ['Sea']),
  c('beast-token', 'Beastling', 'tier_1', 3, 'Beast', ['Beast', 'Token']),
  c('wolf-token', 'Wolf', 'tier_1', 3, 'Beast', ['Beast', 'Wolf', 'Token']),
  c('mon-mercaptain', 'Mercaptain', 'tier_3', 11, 'Merfolk', ['Sea'],
    'When Mercaptain enters the arena, return an enemy Uncommon or lower character to its owner’s hand.', 1),
  c('mon-stormspear', 'Stormspear', 'tier_4', 14, 'Beast', ['Beast', 'Storm'],
    'Quick Attack.'),
  c('mon-fallen-lycaron', 'Fallen Lycaron', 'tier_4', 15, 'Beastling', ['Beast', 'Fallen'],
    'When Fallen Lycaron kills a character, he gains 3 Power.'),
  c('mon-winter', 'Winter, Ghosthowl', 'tier_4', 16, 'Beastling', ['Beast', 'Wolf'],
    'When Winter enters the arena, summon 2 Wolves to your side of the arena.', 1),
  c('mon-lycanor', 'Lycanor', 'tier_5', 21, 'Beast King', ['Beast', 'Wolf', 'Crown'],
    'Quick Attack. When Lycanor enters the arena, summon 2 Wolves.', 1),
  c('mon-leonarr', 'Leonarr', 'tier_5', 22, 'Beast King', ['Beast', 'Crown'],
    'Your other Beast characters strike with +2 Power.', 1),
  c('mon-barlgowrath', 'Barlgowrath', 'tier_5', 23, 'Ancient Beast', ['Beast'],
    'When Barlgowrath strikes a character, he strikes every character beside it as well.', 1),
  c('mon-nilream', 'World Sage Nilream, The White Dragon', 'tier_6', 26, 'Elder Dragon', ['Dragon', 'Sage'],
    'When World Sage Nilream enters the arena, halve the Power of every enemy character.', 2),
  c('mon-bhahamut', 'Bhahamut', 'tier_6', 28, 'Ancient Beast', ['Beast', 'Dragon'],
    'Quick Attack. Bhahamut may strike the Citadel even while enemy characters stand.', 2),
  c('mon-leviathan', 'Leviathan', 'tier_6', 29, 'Ancient Beast', ['Beast', 'Sea'],
    'When Leviathan enters the arena, destroy every Rare or lower character on both sides.', 2),

  // ───────────────────────── TYLON ─────────────────────────
  // One creature across five states. The clearest teaching tool in the set:
  // the same thing, further gone, one tier at a time.
  c('tylon-1', 'Tylon', 'tier_3', 9, 'Tylon', ['Beast'],
    'Quick Attack.'),
  c('tylon-2', 'Tylon (Corrupted)', 'tier_4', 15, 'Tylon', ['Beast', 'Corrupted'],
    'Quick Attack. When Tylon (Corrupted) kills a character, it gains 2 Power.'),
  c('tylon-3', 'Tylon (Awakened)', 'tier_4', 17, 'Tylon', ['Beast', 'Awakened'],
    'Quick Attack. Cannot be destroyed by a spell.', 1),
  c('tylon-4', 'Tylon (Spirit Awakened)', 'tier_5', 22, 'Tylon', ['Beast', 'Awakened'],
    'Quick Attack. When Tylon (Spirit Awakened) dies, return it to your hand.', 1),
  c('tylon-5', 'Tylon (Leviathan)', 'tier_6', 27, 'Tylon', ['Beast', 'Sea'],
    'When Tylon (Leviathan) enters the arena, destroy every Rare or lower character.', 2),

  // ───────────────────────── AVATARS AND THE ABYSS ─────────────────────────
  // Avatars are how the Titans act once the Law forbids them acting
  // themselves, so these have no Divine Distance and cost full price.
  c('aby-whisperer', 'Lucifial’s Avatar, The Whisperer', 'tier_5', 24, 'Titanic Avatar', ['Devil', 'Avatar'],
    'When The Whisperer enters the arena, take a character from your opponent’s hand.', 1),
  c('aby-morrigan-avatar', 'The Morrigan’s Avatar', 'tier_6', 26, 'Ancient Avatar', ['Divine', 'Avatar'],
    'When The Morrigan’s Avatar enters the arena, return a Legendary character from your graveyard and give it +13 Power while the Avatar remains.', 2),
  c('aby-devil-kings', 'The Devil Kings Avatar', 'tier_6', 29, 'Devil Avatar', ['Devil', 'Avatar'],
    'When The Devil Kings Avatar enters the arena, summon 4 Demons. After every strike, it loses 6 Power.', 2),
  c('demon-token', 'Demon', 'tier_1', 4, 'Demon', ['Demon', 'Token'],
    'Quick Attack.'),

  // ───────────────────────── THE DIVINE HOST ─────────────────────────
  c('div-skyrehaal', 'Archangel Skyrehaal', 'tier_6', 27, 'Angel Lord', ['Divine', 'Angel'],
    'Quick Attack. While Archangel Skyrehaal is in the arena, your characters cannot be halved.', 2),
  c('div-liger', 'Grand Liger, The Guardian', 'tier_6', 25, 'Divine Soul', ['Divine'],
    'Gains +2 Power for every other character in the arena.', 2),
  c('div-tyberius', 'Knight Titan Tyberius', 'tier_6', 29, 'Prime God', ['Divine', 'Knight', 'Titan'],
    'When Knight Titan Tyberius enters the arena, summon 4 Knights. After every strike, Tyberius loses 3 Power.', 2),

  // ───────────────────────── THE ORDERS ─────────────────────────
  c('ord-moon-sister', 'Sister of the Moon', 'tier_2', 6, 'Human Knight', ['Knight Sisterhood', 'Knight'],
    'Strikes with +2 Power on your opponent’s turn.'),
  c('ord-gypsy-dancer', 'Kalbeliya Dancer', 'tier_2', 6, 'Gypsy', ['Five Tribes'],
    'When Kalbeliya Dancer enters the arena, an enemy character cannot strike next turn.', 1),
  c('ord-gypsy-seer', 'Kalbeliya Seer', 'tier_3', 8, 'Gypsy', ['Five Tribes'],
    'When Kalbeliya Seer enters the arena, look at the top 3 cards of your deck and reorder them.'),
  c('ord-inquisitor', 'Inquisitor', 'tier_3', 10, 'Human', ['Inquisition'],
    'When Inquisitor enters the arena, exile a card from your opponent’s graveyard.'),
  c('ord-slayer', 'Slayer', 'tier_3', 11, 'Human', ['Slayers'],
    'Strikes with +5 Power against Beast characters.'),
  c('ord-slayer-captain', 'Slayer Captain', 'tier_4', 14, 'Human', ['Slayers'],
    'When Slayer Captain enters the arena, destroy an enemy Beast character.', 1),
  c('ord-moon-matron', 'Matron of the Moon', 'tier_4', 15, 'Human Knight', ['Knight Sisterhood', 'Knight'],
    'Your other Knight Sisterhood characters gain +2 Power.', 1),
  c('ord-high-inquisitor', 'High Inquisitor', 'tier_4', 16, 'Human', ['Inquisition'],
    'When High Inquisitor enters the arena, exile every card in both graveyards.', 1),

  // ───────────────────────── THE OTHER LINEAGES ─────────────────────────
  c('rac-exodan', 'Exodan Wanderer', 'tier_2', 5, 'Exodas', ['Exodas'],
    'When Exodan Wanderer enters the arena, draw a card if you have no other character.'),
  c('rac-oinstan', 'Oinstan Stonewright', 'tier_3', 10, 'Oinstans', ['Oinstans'],
    'Cannot lose more than 5 Power from a single strike.', 1),
  c('rac-norgod', 'Norgod Reaver', 'tier_4', 14, 'Norgods', ['Norgods'],
    'Quick Attack. Strikes with +3 Power while your Citadel Mastery is below 50.'),
  c('rac-norgod-jarl', 'Norgod Jarl', 'tier_5', 20, 'Norgods', ['Norgods', 'Crown'],
    'Your other Norgod characters have Quick Attack.', 1),

  // ───────────────────────── THE RANK AND FILE ─────────────────────────
  // The set is built around named people, so it arrived badly top-heavy: more
  // Legendaries than Commons, which is the wrong shape for a game you open
  // packs of and the wrong shape for a curve. These are the ordinary soldiers
  // of each faction - the cards you actually play on turns one to three, and
  // the cards the named cast leads.
  c('rf-enclave-farmer', 'Enclave Farmer', 'tier_1', 2, 'Human', ['Humanity'],
    'When Enclave Farmer dies, restore 3 Citadel Mastery.'),
  c('rf-half-elf-levy', 'Half Elf Levy', 'tier_1', 2, 'Half Elf', ['Elu-Dues']),
  c('rf-risen-levy', 'Risen Levy', 'tier_1', 2, 'Undead', ['Undead'],
    'When Risen Levy dies, summon a Ghoul.'),
  c('rf-serpent-hatchling', 'Serpent Hatchling', 'tier_1', 2, 'Beast', ['Beast', 'Corrupted'],
    'Quick Attack.'),
  c('rf-icetear-squire', 'Icetear Squire', 'tier_1', 3, 'High Elf', ['Icetear'],
    'When Icetear Squire enters the arena, give a friendly Icetear character +2 Power.'),
  c('rf-primus-initiate', 'Elu Primus Initiate', 'tier_1', 3, 'High Elf', ['Elu Primus']),
  c('rf-citadel-squire', 'Squire of the Citadel', 'tier_1', 3, 'Human Knight', ['Knight'],
    'When Squire of the Citadel enters the arena, give a friendly Knight +2 Power.'),
  c('rf-moon-novice', 'Novice of the Moon', 'tier_1', 3, 'Human Knight', ['Knight Sisterhood', 'Knight']),
  c('rf-sinodess-deckhand', 'Sinodess Deckhand', 'tier_1', 3, 'Human', ['Sinodess'],
    'When Sinodess Deckhand enters the arena, draw a card if your Citadel Mastery is below 50.'),
  c('rf-exodan-scout', 'Exodan Scout', 'tier_1', 3, 'Exodas', ['Exodas'],
    'Quick Attack.'),
  c('rf-abyssal-insect', 'Abyssal Insect', 'tier_1', 3, 'Insect', ['Corrupted']),
  c('rf-tylon-whelp', 'Tylon Whelp', 'tier_1', 4, 'Tylon', ['Beast'],
    'Quick Attack.'),
  c('rf-treant-sapling', 'Treant Sapling', 'tier_1', 4, 'Treant', ['Treant'],
    'At the end of your turn, Treant Sapling gains 1 Power.'),
  c('rf-adamas-spearman', 'Spearman of Adamas', 'tier_1', 4, 'Human', ['Humanity']),
  c('rf-kalbeliya-outrider', 'Kalbeliya Outrider', 'tier_1', 4, 'Gypsy', ['Five Tribes'],
    'Quick Attack.'),
  c('rf-ranger-scout', 'Red Rangers Scout', 'tier_1', 4, 'High Elf', ['Red Rangers'],
    'Counts as a Red Ranger.'),
  c('rf-human-militia', 'Kingdom Militia', 'tier_2', 5, 'Human', ['Humanity']),
  c('rf-slayer-apprentice', 'Slayer Apprentice', 'tier_2', 5, 'Human', ['Slayers'],
    'Strikes with +3 Power against Beast characters.'),
  c('rf-orc-skirmisher', 'Orc Skirmisher', 'tier_2', 5, 'Orc', ['Orc', 'Warband'],
    'Quick Attack.'),
  c('rf-bone-picker', 'Bone Picker', 'tier_2', 5, 'Undead', ['Undead'],
    'When Bone Picker enters the arena, exile a card from a graveyard.'),
  c('rf-magi-apprentice', 'Magi Apprentice', 'tier_2', 5, 'Human Wizard', ['Archmagi'],
    'When Magi Apprentice enters the arena, draw a spell from the top 4 cards of your deck.', 1),
  c('rf-oinstan-mason', 'Oinstan Mason', 'tier_2', 5, 'Oinstans', ['Oinstans'],
    'Cannot lose more than 3 Power from a single strike.'),
  c('rf-tidecaller', 'Moon Elf Tidecaller', 'tier_2', 6, 'Moon Elf', ['Elu-Chandra', 'Sea'],
    'When Moon Elf Tidecaller enters the arena, an enemy character loses 3 Power.'),
  c('rf-soul-acolyte', 'Soul Elf Acolyte', 'tier_2', 6, 'Soul Elf', ['Elu-Hsal', 'Soul Defiler'],
    'When Soul Elf Acolyte enters the arena, return a Common character from your graveyard.'),
  c('rf-inquisition-warden', 'Inquisition Warden', 'tier_2', 6, 'Human', ['Inquisition'],
    'Enemy spells cost 1 more while Inquisition Warden is in the arena.', 1),
  c('rf-sinodess-corsair', 'Sinodess Corsair', 'tier_2', 6, 'Human', ['Sinodess'],
    'Quick Attack.'),
  c('rf-reef-lurker', 'Reef Lurker', 'tier_2', 6, 'Merfolk', ['Sea'],
    'Cannot be struck the turn it enters the arena.'),
  c('rf-norgod-oarsman', 'Norgod Oarsman', 'tier_2', 6, 'Norgods', ['Norgods'],
    'Quick Attack.'),
  c('rf-hedge-witch', 'Hedge Witch', 'tier_2', 6, 'Human', ['Witch'],
    'When Hedge Witch enters the arena, an enemy character loses 4 Power for one turn.'),
  c('rf-ranger-tracker', 'Red Rangers Tracker', 'tier_2', 6, 'High Elf', ['Red Rangers'],
    'Counts as a Red Ranger. When Red Rangers Tracker enters the arena, look at the top 2 cards of your deck.'),
  c('rf-winterguard', 'Icetear Winterguard', 'tier_2', 7, 'High Elf', ['Icetear'],
    'While Icetear Winterguard is in the arena, enemy characters must strike her before your Citadel.', 1),
  c('rf-dragon-outrider', 'Dragon Elf Outrider', 'tier_2', 7, 'Dragon Elf', ['Elu-Dragar'],
    'Quick Attack.'),
  c('rf-dwarf-stoneguard', 'Dwarf Stoneguard', 'tier_2', 7, 'Dwarf', ['Dwarf'],
    'Cannot be destroyed by a spell.', 1),
  c('rf-cliff-garuda', 'Cliff Garuda', 'tier_2', 7, 'Beast', ['Beast', 'Sky'],
    'Quick Attack.'),
  c('rf-godsblood-initiate', 'Gods Blood Initiate', 'tier_2', 7, 'Gods Blood', ['Gods Blood'],
    'When Gods Blood Initiate enters the arena, look at your opponent’s hand.'),

  // ───────────────────────── SPELLS: THE RED RANGERS ─────────────────────────
  // Each named for a chapter of the Rangers story, so the spells read as
  // things that happened rather than as effects.
  s('sp-faesilver-edge', 'Faesilver Edge', 'tier_1', 1,
    'A friendly character gains +3 Power this turn.', ['Relic'], true),
  s('sp-the-letter', 'The Letter', 'tier_2', 2,
    'Draw 2 cards.', ['Red Rangers']),
  s('sp-a-place-at-the-edge', 'A Place at the Edge', 'tier_2', 2,
    'A friendly character cannot be destroyed this turn.', ['Red Rangers'], true),
  s('sp-a-quiet-mercy', 'A Quiet Mercy', 'tier_2', 2,
    'Destroy a character with 8 Power or less.', ['Red Rangers'], true),
  s('sp-the-verdant-gate', 'The Verdant Gate', 'tier_3', 3,
    'Summon 2 Red Rangers to your side of the arena.', ['Red Rangers']),
  s('sp-a-bite-of-treason', 'A Bite of Treason', 'tier_3', 3,
    'Destroy a friendly character. Draw 3 cards.', ['Red Rangers']),
  s('sp-relics-of-the-dead', 'Relics of the Dead', 'tier_3', 3,
    'Return a character from your graveyard to your hand.', ['Red Rangers']),
  s('sp-what-monsters-look-like', 'What Monsters Look Like', 'tier_3', 3,
    'An enemy character loses 10 Power.', ['Red Rangers'], true),
  s('sp-the-captains-breakfast', 'The Captain’s Breakfast', 'tier_3', 3,
    'Restore 8 Citadel Mastery and draw a card.', ['Red Rangers']),
  s('sp-duel-of-claim', 'Duel of Claim', 'tier_3', 4,
    'Choose a friendly and an enemy character. They strike each other.', ['Red Rangers']),
  s('sp-embrace', 'Embrace', 'tier_3', 4,
    'Destroy a friendly character. Another friendly character gains its Power.', ['Red Rangers']),
  s('sp-the-woman-they-feared', 'The Woman They Feared', 'tier_4', 4,
    'A friendly character gains +6 Power for the rest of the match.', ['Red Rangers']),
  s('sp-no-safe-hour', 'No Safe Hour', 'tier_4', 5,
    'Every character on both sides loses 6 Power.', ['Red Rangers']),
  s('sp-crimson-veil', 'The Siege of Crimson Veil', 'tier_4', 5,
    'Deal 10 damage to the enemy Citadel.', ['Red Rangers']),

  // ───────────────────────── SPELLS: THE PROTOTYPE ─────────────────────────
  s('LAH.04', 'Queen’s Judgement', 'tier_3', 4,
    'Exile target character.'),
  s('LAH.19', 'Hidden Boss', 'tier_4', 6,
    'Return an Epic or Legendary character from your opponent’s graveyard to your side of the arena.'),
  s('LAH.20', 'Divine Intervention', 'tier_6', 8,
    'Halve the Power of every enemy character. May be played at any time, even after a strike is declared.',
    ['Divine'], true),

  // ───────────────────────── SPELLS: THE FOUNDATION AGE ─────────────────────────
  // Moments from the codex rather than invented effects.
  s('sp-frostbind', 'Frostbind', 'tier_2', 2,
    'An enemy character cannot strike for two turns.', ['Icetear']),
  s('sp-eastern-migration', 'The Eastern Migration', 'tier_2', 2,
    'Return 2 friendly characters to your hand, then draw 2 cards.'),
  s('sp-union-of-beasts', 'The Union of Beasts', 'tier_3', 3,
    'Your Beast characters gain +3 Power and Quick Attack.', ['Beast']),
  s('sp-deep-reaches', 'Mercy at the Deep Reaches', 'tier_3', 3,
    'Return an enemy character to its owner’s hand and restore 5 Citadel Mastery.', ['Sea']),
  s('sp-muster-the-host', 'Muster the Host', 'tier_3', 4,
    'Draw 2 cards, and your Muster rises by 1 this turn.'),
  s('sp-heavens-throat', 'Heaven’s Throat', 'tier_4', 5,
    'Summon 4 Knights to your side of the arena - the golden statues wake.', ['Gods Blood']),
  s('sp-abyssal-breach', 'The Abyssal Breach', 'tier_4', 5,
    'Summon 3 Beastlings to your side of the arena. At the end of your turn, lose 3 Citadel Mastery.', ['Corrupted']),
  s('sp-sacred-oath', 'Oath of the Sacred Order', 'tier_4', 5,
    'Every friendly character gains +4 Power.', ['Sacred Order']),
  s('sp-primortal-duel', 'The First Primortal Duel', 'tier_5', 6,
    'A friendly character strikes every enemy character, one after another.'),
  s('sp-divine-distance', 'The Law of Divine Distance', 'tier_5', 6,
    'Return every character with 19 Power or more to its owner’s hand.', ['Divine']),
  s('sp-the-cataclysm', 'The Cataclysm', 'tier_5', 7,
    'Every character on both sides loses 10 Power.', ['Corrupted']),

  // ───────────────────────── SPELLS: THE ARTIFACTS ─────────────────────────
  // The ten relics of the codex. Relics are spells rather than a third card
  // type, so nothing new has to be learned in order to play one.
  s('rel-moonbound-diadem', 'The Moonbound Diadem', 'tier_2', 2,
    'Cancel a spell.', ['Relic'], true),
  s('rel-shield-of-humanity', 'Shield of Humanity', 'tier_3', 3,
    'Your characters cannot lose Power on your opponent’s next turn.', ['Relic'], true),
  s('rel-cup-of-judgment', 'Cup of Judgment', 'tier_3', 3,
    'Look at your opponent’s hand and exile a spell from it.', ['Relic']),
  s('rel-dream-sapphire', 'The Dream Sapphire', 'tier_3', 3,
    'Look at the top 5 cards of your deck. Take one and put the rest back in any order.', ['Relic']),
  s('rel-skyward-crowns', 'The Skyward Crowns', 'tier_3', 3,
    'A friendly character gains +4 Power and Quick Attack.', ['Relic']),
  s('rel-sword-of-light', 'Sword of Light', 'tier_4', 4,
    'A friendly character gains +8 Power. If it is Human, it also cannot be destroyed by a spell.', ['Relic']),
  s('rel-aurelion-standards', 'The Aurelion Standards', 'tier_4', 5,
    'Every friendly character gains +2 Power and Quick Attack.', ['Relic']),
  s('rel-black-codex', 'The Black Codex of the Hsal Eraklah', 'tier_4', 5,
    'Return 2 characters from any graveyard to your side of the arena. At the end of your turn, lose 5 Citadel Mastery.', ['Relic', 'Corrupted']),
  s('rel-vial', 'The Vial of Severed Immortality', 'tier_5', 6,
    'Exile a character from a graveyard and restore Citadel Mastery equal to its Power.', ['Relic', 'Corrupted']),
  s('rel-abel-spear', 'Abel, the Divine Spear of Light', 'tier_5', 7,
    'Destroy any character and exile it. This cannot be prevented.', ['Relic']),
];

/**
 * Characters who appear on more than one card, usually younger and older.
 * Each version is its own card with its own number, and they are linked here
 * so the game and the gallery can tell they are one person.
 *
 * Working rule, to be confirmed: a deck may hold one of each version, but
 * only one version of a person may stand in the arena at a time. There is
 * only one Hannarial at any given moment.
 */
const PERSON = {
  'ice-hannarial-young': 'hannarial',
  'LAH.06': 'hannarial',
  'fa-adamas': 'adamas',
  'fa-adamas-king': 'adamas',
  'und-koschei': 'koschei',
  'und-koschei-berserker': 'koschei',
};

/** The person a card depicts, where more than one card depicts them. */
export const personOf = (card) => PERSON[typeof card === 'string' ? card : card.id] || null;

/** Every other card depicting the same person. */
export const versionsOf = (card) => {
  const who = personOf(card);
  if (!who) return [];
  return CARDS.filter((k) => k.id !== card.id && PERSON[k.id] === who);
};

/**
 * Who is a person and who is a kind of person.
 *
 * A named character is a specific individual - there is one Shaedra Nyxthorn
 * in the world - so her card prints "Legendary Character" and a deck may hold
 * one copy however common she is. A generic character is a type of person: a
 * Red Ranger, an Inquisitor, a Ghoul. There are many, and a deck may hold
 * three.
 *
 * This is a card's TYPE, not its rarity. The two are separate, exactly as on
 * the cards Lash sent me: a Legendary Creature at Mythic rarity. Listing the
 * generic ones is the short list and the easier one to check by eye.
 */
const GENERIC = new Set([
  // tokens and rank and file
  'rr-ranger', 'knight-token', 'orc-raider', 'wolf-token', 'beast-token',
  'demon-token', 'und-ghoul',
  'rf-enclave-farmer', 'rf-half-elf-levy', 'rf-risen-levy', 'rf-serpent-hatchling',
  'rf-icetear-squire', 'rf-primus-initiate', 'rf-citadel-squire', 'rf-moon-novice',
  'rf-sinodess-deckhand', 'rf-exodan-scout', 'rf-abyssal-insect', 'rf-tylon-whelp',
  'rf-treant-sapling', 'rf-adamas-spearman', 'rf-kalbeliya-outrider', 'rf-ranger-scout',
  'rf-human-militia', 'rf-slayer-apprentice', 'rf-orc-skirmisher', 'rf-bone-picker',
  'rf-magi-apprentice', 'rf-oinstan-mason', 'rf-tidecaller', 'rf-soul-acolyte',
  'rf-inquisition-warden', 'rf-sinodess-corsair', 'rf-reef-lurker', 'rf-norgod-oarsman',
  'rf-hedge-witch', 'rf-ranger-tracker', 'rf-winterguard', 'rf-dragon-outrider',
  'rf-dwarf-stoneguard', 'rf-cliff-garuda', 'rf-godsblood-initiate',
  // ranks and orders: a title, not a person
  'LAH.17', 'LAH.05', 'LAH.14', 'LAH.03', 'men-citadel-captain', 'men-fleetmaster',
  'ord-moon-sister', 'ord-moon-matron', 'ord-inquisitor', 'ord-high-inquisitor',
  'ord-slayer', 'ord-slayer-captain', 'ord-gypsy-seer', 'ord-gypsy-dancer',
  'rac-exodan', 'rac-oinstan', 'rac-norgod', 'rac-norgod-jarl',
  'wit-bruhneville-daughter', 'elu-hsal-eraklah',
  // creatures the bestiary describes as a kind rather than one of a kind
  'und-wraith-knight', 'und-goulargz', 'mon-stormspear', 'mon-fallen-lycaron',
  'mon-mercaptain', 'mon-mersoldier', 'mon-garudling', 'mon-imptizzle',
  // the Tylon are a people of the shore kingdoms, not one animal
  'tylon-1', 'tylon-2', 'tylon-3', 'tylon-4', 'tylon-5',
]);

/** True for a specific individual: prints "Legendary Character", one per deck. */
export const isNamed = (card) => card.type === 'character' && !GENERIC.has(card.id);

/** How many copies of a card a deck may hold. */
export const copiesOf = (card) => (isNamed(card) ? 1 : TIERS[card.tier].copies);

/** The type line, as printed: "Legendary Character (High Elf)". */
export const typeLineOf = (card) =>
  card.type === 'spell'
    ? (card.instant ? 'Instant Spell' : 'Spell')
    : `${isNamed(card) ? 'Legendary Character' : 'Character'} (${card.line})`;

/**
 * Where a card's portrait lives. Most belong in /images/cards, but a great
 * many of these people were already painted for the codex and the stories,
 * so those paintings are reused rather than commissioned twice.
 */
const ART = {
  // Painted for the card game already.
  'LAH.16': '/images/cards/anthuriun.webp',
  'elu-antharaiel': '/images/cards/antharaiel-whitewing.webp',
  'ice-child-of-winter': '/images/cards/icetear-child-of-winter.webp',
  'div-tyberius': '/images/cards/knight-titan-tyberius.webp',
  'LAH.25': '/images/cards/susanna-bruhneville.webp',
  'LAH.06': '/images/cards/hannarial.webp',
  'ice-hannarial-young': '/images/cards/hannarial-young.webp',
  'fa-adamas-king': '/images/cards/adamas-first-king.webp',
  'elu-anna': '/images/cards/anna-white-witch.webp',
  'wit-bruhneville-daughter': '/images/cards/bruhneville-daughter.webp',
  'elu-darklord': '/images/cards/darklord-anthurian.webp',
  'LAH.11': '/images/cards/edmonta-lothrin.webp',
  'LAH.13': '/images/cards/elarien-thornwither.webp',
  'elu-fiarra': '/images/cards/fiarra-starsterling.webp',
  'gb-godrian': '/images/cards/godrian-greyhide.webp',
  'LAH.22': '/images/cards/helena-katsunra.webp',
  'elu-karscyll': '/images/cards/karscyll.webp',
  'und-koschei-berserker': '/images/cards/king-koschei.webp',
  'und-koschei': '/images/cards/koschei.webp',
  'LAH.01': '/images/cards/leon-godrick.webp',
  'LAH.24': '/images/cards/melissra-orscina.webp',
  'und-miss-crowly': '/images/cards/miss-crowly.webp',
  'men-mordred': '/images/cards/mordred.webp',
  'LAH.23': '/images/cards/morrina-penfyre.webp',
  'elu-numaya': '/images/cards/numaya-steamrose.webp',
  'LAH.02': '/images/cards/nyrial-dagrhan.webp',
  'men-arthur': '/images/cards/prince-arthur-penfyre.webp',
  'LAH.12': '/images/cards/rellien-and-vessa.webp',
  'LAH.26': '/images/cards/seneal-icetear.webp',
  'LAH.08': '/images/cards/solenyra-gravespine.webp',
  'tylon-2': '/images/cards/tylon-corrupted.webp',
  'tylon-3': '/images/cards/tylon-awakened.webp',
  'tylon-4': '/images/cards/tylon-spirit-awakened.webp',
  'tylon-5': '/images/cards/tylon-leviathan.webp',
  'men-wufgarr': '/images/cards/warlord-wufgarr.webp',
  'mon-winter': '/images/cards/winter-ghosthowl.webp',
  'mon-nilream': '/images/cards/world-sage-nilream.webp',
  'men-zhou': '/images/cards/zhou-ying.webp',
  'men-zhuge': '/images/cards/zhuge-guan.webp',
  'elu-hansall': '/images/cards/hansall.webp',
  'elu-tiamel': '/images/cards/tiamel.webp',
  'elu-serallion': '/images/cards/serallion.webp',
  'elu-sederous': '/images/cards/sederous.webp',
  'elu-gilgamesh': '/images/cards/gilgamesh.webp',
  'elu-raastali': '/images/cards/raastali.webp',
  'elu-revendrinn': '/images/cards/revendrinn.webp',
  'elu-glorfarsall': '/images/cards/glorfarsall.webp',
  'ice-hansenel': '/images/cards/hansenel.webp',
  'fa-adamas': '/images/cards/adamas.webp',
  'fa-evalon': '/images/cards/evalon.webp',
  'fa-abel': '/images/cards/abel.webp',
  'fa-cainan': '/images/cards/cainan.webp',

  // The Foundation Age codex paintings. The World Titans are not cards, so
  // the three of their paintings used here sit on the deeds they are known
  // for rather than on the gods themselves.
  'aby-whisperer': '/images/cards/whisperer.webp',
  'aby-morrigan-avatar': '/images/cards/morrigan-avatar.webp',
  'gb-solomon': '/images/codex/solomon.jpg',
  'gb-lazarus': '/images/codex/lazarus.jpg',
  'gb-caligula': '/images/codex/caligula.jpg',
  'LAH.30': '/images/cards/sinbad-sinodess.webp',
  'elu-hsal-eraklah': '/images/codex/hsal-eraklah.jpg',
  'div-liger': '/images/codex/avalonus.jpg',

  // The monster paintings.
  'mon-leviathan': '/images/monsters/serpent-beast.webp',
  'mon-bhahamut': '/images/monsters/dark-dragon.webp',
  'mon-barlgowrath': '/images/cards/barlgowrath.webp',
  'und-pale-lady': '/images/cards/the-pale-lady.webp',
  'und-wraith-knight': '/images/monsters/winged-lich.webp',
  'div-skyrehaal': '/images/cards/archangel-skyrehaal.webp',
  'aby-devil-kings': '/images/cards/devil-kings-avatar.webp',

  // The Red Rangers story paintings.
  'LAH.09': '/images/rangers/shaedra-nyxthorn.jpg',
  'rr-syrel': '/images/rangers/syrel-thorneheart.jpg',
  'sp-the-verdant-gate': '/images/rangers/the-verdant-gate.jpg',
  'sp-a-quiet-mercy': '/images/rangers/the-quiet-mercy.jpg',
  'sp-the-letter': '/images/rangers/the-letter.jpg',
  'sp-a-place-at-the-edge': '/images/rangers/a-place-at-the-edge.jpg',
  'sp-a-bite-of-treason': '/images/rangers/a-bite-of-treason.jpg',
  'sp-duel-of-claim': '/images/rangers/duel-of-claim.jpg',
  'sp-relics-of-the-dead': '/images/rangers/relics-of-the-dead.jpg',
  'sp-what-monsters-look-like': '/images/rangers/what-monsters-look-like.jpg',
  'sp-the-captains-breakfast': '/images/rangers/the-captains-breakfast.jpg',
  'sp-embrace': '/images/rangers/embrace.jpg',
  'sp-no-safe-hour': '/images/rangers/no-safe-hour.jpg',
  'sp-the-woman-they-feared': '/images/rangers/the-woman-they-feared.jpg',
  'sp-crimson-veil': '/images/rangers/the-siege-of-crimson-veil.jpg',

  // The relic paintings.
  'rel-sword-of-light': '/images/codex/sword-of-light.jpg',
  'rel-abel-spear': '/images/codex/abel-spear.jpg',
  'rel-cup-of-judgment': '/images/codex/cup-of-judgment.jpg',
  'rel-shield-of-humanity': '/images/codex/shield-of-humanity.jpg',
  'rel-dream-sapphire': '/images/codex/dream-sapphire.jpg',
  'rel-moonbound-diadem': '/images/codex/moonbound-diadem.jpg',
  'rel-skyward-crowns': '/images/codex/skyward-crowns.jpg',
  'rel-aurelion-standards': '/images/codex/aurelion-standards.jpg',
  'rel-vial': '/images/codex/vial-of-severed-immortality.jpg',
  'rel-black-codex': '/images/codex/black-codex.jpg',
  'sp-abyssal-breach': '/images/codex/abyssal-breach.jpg',
  'sp-heavens-throat': '/images/codex/heavens-throat.jpg',
  'sp-divine-distance': '/images/codex/hyperion.jpg',
  'sp-the-cataclysm': '/images/codex/typhon.jpg',
  'sp-deep-reaches': '/images/codex/deep-reaches.jpg',
  'sp-eastern-migration': '/images/codex/eastern-migration-lands.jpg',
  'sp-union-of-beasts': '/images/codex/planes-of-accord.jpg',
  'sp-primortal-duel': '/images/codex/ravines-of-first-descent.jpg',
};

/**
 * The number printed along the bottom of a card, in Lash's format
 * N0.<set>.<block>.<number>. The cards already designed in Canva keep the
 * number they were printed with; everything else is numbered in set order
 * under the block BOI, so the printed number never moves when a card is added
 * further up the list.
 */
const SET = 'N0.01';
let nextNumber = 0;
const NUMBERS = Object.fromEntries(CARDS.map((k) => {
  if (k.id.startsWith('LAH.')) return [k.id, `${SET}.${k.id}`];
  nextNumber += 1;
  return [k.id, `${SET}.BOI.${String(nextNumber).padStart(3, '0')}`];
}));

/** The printed card number. */
export const numberOf = (card) => NUMBERS[typeof card === 'string' ? card : card.id] || '';

/** The portrait for a card, or null where none has been painted yet. */
export const artOf = (card) => ART[typeof card === 'string' ? card : card.id] || null;

export const byId = Object.fromEntries(CARDS.map((k) => [k.id, k]));

/** Cards a deck may contain: tokens are summoned, never drawn. */
export const COLLECTIBLE = CARDS.filter((k) => !(k.tags || []).includes('Token'));

/** Every affiliation a card can check for, for filtering the collection. */
export const TAGS = [...new Set(CARDS.flatMap((k) => k.tags || []))]
  .filter((t) => t !== 'Token').sort();

/** Every lineage, for the collection's filters. */
export const LINEAGES = [...new Set(CARDS.filter((k) => k.line).map((k) => k.line))].sort();
