// ─────────────────────────────────────────────────────────────
//  Site content model.
//  Everything the navigation and index pages read comes from here.
//  To publish something new, add an entry below and build the page.
// ─────────────────────────────────────────────────────────────

export const SECTIONS = [
  { slug: 'library', name: 'Library',            kind: 'Short Stories',        href: '/library' },
  { slug: 'sagas',   name: 'The Great Sagas',    kind: 'Full Stories',         href: '/sagas' },
  { slug: 'codex',   name: 'Codex',              kind: 'Historical Chronicle', href: '/codex' },
  { slug: 'gallery', name: 'Hall of Memories',   kind: 'Image Gallery',        href: '/gallery' },
  { slug: 'trial',   name: 'Trial of Character', kind: 'Personality Quiz',     href: '/trial', comingSoon: true },
];

// The ages of the world. Used by both the Library and the Codex.
export const AGES = [
  {
    slug: 'foundation-age', numeral: 'I', name: 'The Foundation Age',
    blurb: 'When the Titans still walked, the realms were ordered, and the world was given laws it never asked for.',
  },
  {
    slug: 'age-of-mortal-rebellion', numeral: 'II', name: 'The Age of Mortal Rebellion',
    blurb: 'The gods withdrew. What was left behind learned it could refuse them.',
  },
  {
    slug: 'age-of-kingdoms', numeral: 'III', name: 'The Age of Kingdoms',
    blurb: 'Borders, banners, and bloodlines. Mortals build the things they will later have to defend.',
  },
  { slug: 'age-of-darkness',         numeral: 'IV',   name: 'The Age of Darkness',          comingSoon: true },
  { slug: 'age-of-light',            numeral: 'V',    name: 'The Age of Light',             comingSoon: true },
  { slug: 'age-of-freedom',          numeral: 'VI',   name: 'The Age of Freedom',           comingSoon: true },
  { slug: 'age-of-fractured-ideals', numeral: 'VII',  name: 'The Age of Fractured Ideals',  comingSoon: true },
  { slug: 'age-of-darkness-ii',      numeral: 'VIII', name: 'The Age of Darkness II',       comingSoon: true },
  { slug: 'great-ice-age',           numeral: 'IX',   name: 'The Great Ice Age',            comingSoon: true },
];

// Short stories. `age` must match an AGES slug.
export const STORIES = [
  {
    slug: 'the-spear-that-was-not-meant-to-exist',
    number: '001',
    title: 'The Spear That Was Not Meant to Exist',
    part: 'A Duel Beneath the Stones',
    age: 'foundation-age',
    blurb: 'Adamas walks alone into a clearing chosen for memory, carrying the Sword of Light and a spear forged from his brother’s soul.',
  },
  {
    slug: 'the-serpent-wars',
    number: '002',
    title: 'The Serpent Wars',
    part: 'Chapter I · The First Wrongness',
    age: 'foundation-age',
    blurb: 'Aeralyn of the Elu finds the swamp altered, not broken, shifted, as though one cog in a vast mechanism had been turned.',
  },
  {
    slug: 'the-icetear-legacy',
    number: '003',
    title: 'The Icetear Legacy',
    part: 'Part One · The Boy Who Dreamed of Winter',
    age: 'age-of-kingdoms',
    blurb: 'A gift arrives from the north. A scout dies of a cold that should not exist. Beneath the mountain, something finishes sleeping.',
  },
];

// The Great Sagas are organised by the people they follow.
export const SAGA_RACES = [
  { slug: 'humans',             name: 'Humans',             blurb: 'The youngest and the hungriest. Given everything, then stripped of it.' },
  { slug: 'elves',              name: 'Elves',              blurb: 'The first Fae mortals, who remember what the world was supposed to be.' },
  { slug: 'half-elves',         name: 'Half Elves',         blurb: 'Born between two peoples and claimed fully by neither.' },
  { slug: 'beast-lords',        name: 'Beast Lords',        blurb: 'Shaped to cull corruption, and never asked whether they wished to be.' },
  { slug: 'other-fae-races',    name: 'Other Fae Races',    blurb: 'Tylons, Sprites, Nymphs, and the smaller powers that hold the natural order.' },
  { slug: 'other-mortal-races', name: 'Other Mortal Races', blurb: 'Giants, dwarves, the stone-born, and every people the histories forgot to centre.' },
];

// Full sagas. None published yet; add entries here as chapters go live.
export const SAGAS = [];

// ─── HALL OF MEMORIES ────────────────────────────────────────
// Images live in /images/codex/<img>.jpg
const T = (img, name, note) => ({ img, name, note });

export const GALLERY_CATEGORIES = [
  {
    slug: 'titans', name: 'Titans',
    blurb: 'Supreme custodians of reality, and the two born to unmake it.',
    items: [
      T('hyperion',   'Hyperion',           'World Titan of Light and Order'),
      T('lucifial',   'Lucifial',           'World Titan of Punishment'),
      T('thanatos',   'Thanatos',           'World Titan of Death and Passage'),
      T('hades',      'Hades',              'World Titan of Judgment'),
      T('persephone', 'Persephone',         'World Titan of Redemption'),
      T('selene',     'Selene',             'World Titan of Moon and Cycles'),
      T('morrigan',   'Morrigan',           'World Titan of Magic'),
      T('ra',         'Ra',                 'World Titan of Sky, Dragons, and Flame'),
      T('oceanus',    'Oceanus',            'World Titan of the Seas'),
      T('freyva',     'Freyva',             'World Titan of Life and Nature'),
      T('glorion',    'Glorion',            'World Titan of Earth and Forge'),
      T('typhon',     'Typhon',             'Father of Monsters'),
      T('akidna',     'Akidna',             'Mother of Monsters'),
      T('lucifials-avatar', 'The Whisperer', 'Titanic Avatar of Lucifial'),
    ],
  },
  {
    slug: 'gods', name: 'Gods',
    blurb: 'Elder Gods, Fae Gods, and the Prime Gods the world woke for itself.',
    items: [],
  },
  {
    slug: 'gods-blood', name: 'Gods Blood',
    blurb: 'What grew when divine Avatars walked among mortals and did not leave.',
    items: [
      T('solomon',  'Solomon',  'King of Ambition'),
      T('caligula', 'Caligula', 'King of Domination'),
      T('lazarus',  'Lazarus',  'High Councilor of the Gods Blood'),
    ],
  },
  {
    slug: 'humans', name: 'Humans',
    blurb: 'The first family, and the defenders who came after them.',
    items: [
      T('adamas',           'Adamas',           'Father of Humanity'),
      T('evalon',           'Evalon',           'Mother of Humanity'),
      T('cainan',           'Cainan',           'First Son, First Fracture'),
      T('abel',             'Abel',             'The Fallen Son'),
      T('sinbad-sinodess',  'Sinbad-Sinodess',  'Great Emissary'),
      T('godrian-greyhide', 'Godrian Greyhide', 'Realm Commander'),
    ],
  },
  {
    slug: 'elves', name: 'Elves',
    blurb: 'The Elu and their branches, from the high courts to the exiled.',
    items: [
      T('hansall',      'Hansall',      'First High King of Elves'),
      T('tiamel',       'Tiamel',       'First Queen of the Elu Dragar'),
      T('serallion',    'Serallion',    'Matron of the Moon'),
      T('hsal-eraklah', 'Hsal Eraklah', 'Soul Defilers, exiled'),
    ],
  },
  {
    slug: 'half-elves', name: 'Half Elves',
    blurb: 'Born between two peoples and claimed fully by neither.',
    items: [],
  },
  {
    slug: 'beast-lords', name: 'Beast Lords',
    blurb: 'The Elu-Dues and the beast kin who answered the Union.',
    items: [
      T('sederous', 'Sederous', 'King of Scraps · Elu Due'),
    ],
  },
  {
    slug: 'other-fae-races', name: 'Other Fae Races',
    blurb: 'Tylons, Sprites, Nymphs, and Fairies.',
    items: [],
  },
  {
    slug: 'other-mortal-races', name: 'Other Mortal Races',
    blurb: 'Giants, dwarves, and the stone-born.',
    items: [],
  },
  {
    slug: 'realms', name: 'Realms & Environments',
    blurb: 'Where it happened. Wounds, sanctuaries, and seats of judgment.',
    items: [
      T('abyssal-breach',              'The Abyssal Breach',              'Cataclysmic Rift'),
      T('ravines-of-first-descent',    'The Ravines of First Descent',    'Corrupted Mountain Chasms'),
      T('high-dragon-mountains',       'The High Dragon Mountains',       'Ancient Mountain Range'),
      T('sky-crown-peaks',             'The Sky-Crown Peaks',             'Upper Aerial Domain'),
      T('fae-garden-sanctuary',        'The Fae Garden Sanctuary',        'Sacred Living Realm Anchor'),
      T('eternal-fae-realm',           'The Eternal Fae Realm',           'Transdimensional Realm'),
      T('oceanic-threshold',           'The Oceanic Threshold',           'Coastal Liminal Zone'),
      T('semi-oceanic-shore-kingdoms', 'The Shore Kingdoms',              'Coastal Civilizations'),
      T('deep-reaches',                'The Deep Reaches',                'Abyss-Adjacent Depths'),
      T('shattered-lowlands',          'The Shattered Lowlands',          'Ruined Plains'),
      T('first-human-enclave',         'The First Human Enclave',         'Protected Settlement'),
      T('mortal-kingdom-of-adamas',    'The Mortal Kingdom of Adamas',    'Early Human Kingdom'),
      T('avalonus',                    'Avalonus',                        'Divine Realm'),
      T('throned-acropolis',           'The Throned Acropolis',           'Multirealm Seat of Authority'),
      T('abyssal-realm',               'The Abyssal Realm',               'Punitive Realm'),
      T('ghost-realm',                 'The Ghost Realm',                 'Spirit Transit Realm'),
      T('heavens-throat',              'Heaven’s Throat',            'Isolated Mountain Empire'),
      T('eastern-migration-lands',     'The Eastern Migration Lands',     'Distant Allied Territories'),
      T('verdant-wilds',               'The Verdant Wilds',               'Untamed Natural Domains'),
      T('planes-of-accord',            'The Planes of Accord',            'Conceptual Territory'),
    ],
  },
  {
    slug: 'artifacts', name: 'Artifacts',
    blurb: 'Forged through sacrifice, lineage, or things that should never have been written down.',
    items: [
      T('sword-of-light',              'Sword of Light',                  'Bearer: Adamas'),
      T('abel-spear',                  'Abel, the Divine Spear of Light', 'Forged from the first death'),
      T('cup-of-judgment',             'Cup of Judgment',                 'Forged from Evalon’s remains'),
      T('shield-of-humanity',          'Shield of Humanity',              'Symbolic guardian relic'),
      T('dream-sapphire',              'The Dream Sapphire',              'Bearer: Serallion'),
      T('moonbound-diadem',            'The Moonbound Diadem',            'Regulator artifact'),
      T('skyward-crowns',              'The Skyward Crowns',              'Elu Dragar royalty'),
      T('aurelion-standards',          'The Aurelion Standards',          'Battle relics'),
      T('vial-of-severed-immortality', 'The Vial of Severed Immortality', 'Abyssal containment relic'),
      T('black-codex',                 'The Black Codex',                 'Necromantic grimoire'),
    ],
  },
];

// ─── THEMES ──────────────────────────────────────────────────
export const THEMES = {
  library: {
    bg: '#0a0704', card: '#120d08', accent: '#c4952a', accentLight: '#e8c875',
    accentDim: '#8a5a2b', text: '#c9baa0', textDim: '#7a6a54', textBright: '#ede0c4',
    particle: '196,149,42', line: 'rgba(196,149,42,0.18)',
  },
  sagas: {
    bg: '#0b0505', card: '#160a09', accent: '#b4453f', accentLight: '#e59386',
    accentDim: '#7a2d2a', text: '#c4a49c', textDim: '#7d5a54', textBright: '#f2ded6',
    particle: '190,85,72', line: 'rgba(180,69,63,0.20)',
  },
  codex: {
    bg: '#0a0704', card: '#120d08', accent: '#b8863b', accentLight: '#e8c875',
    accentDim: '#8a5a2b', text: '#c9baa0', textDim: '#7a6a54', textBright: '#ede0c4',
    particle: '196,149,42', line: 'rgba(196,149,42,0.18)',
  },
  gallery: {
    bg: '#050709', card: '#0c1016', accent: '#8fa8c8', accentLight: '#cfe0f2',
    accentDim: '#4a5f7a', text: '#a8b6c6', textDim: '#5f6f80', textBright: '#e2ecf6',
    particle: '143,168,200', line: 'rgba(143,168,200,0.18)',
  },
  trial: {
    bg: '#08060c', card: '#110c19', accent: '#8a6fc4', accentLight: '#c8b4f0',
    accentDim: '#54407f', text: '#b0a4c6', textDim: '#6b5f80', textBright: '#e8def8',
    particle: '138,111,196', line: 'rgba(138,111,196,0.18)',
  },
};

// ─── HELPERS ─────────────────────────────────────────────────
export const storiesInAge = (ageSlug) => STORIES.filter((s) => s.age === ageSlug);
export const storyHref = (s) => `/library/${s.age}/${s.slug}`;
export const ageBySlug = (slug) => AGES.find((a) => a.slug === slug);
