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
  { slug: 'trial',   name: 'Trial of Character', kind: 'Personality Quiz',     href: '/trial' },
  { slug: 'workshop', name: 'The Workshop',     kind: 'Utilities',            href: '/workshop' },
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
  { slug: 'red-rangers',        name: 'The Red Rangers',    blurb: 'The crimson order of the Verdant Gate, and the outsiders handed to them.' },
];

// Full sagas. `race` must match a SAGA_RACES slug.
export const SAGAS = [
  {
    slug: 'last-days-of-legends',
    race: 'elves',
    title: 'The Last Days of Legends',
    eyebrow: 'Saga I',
    blurb: 'Hansall, first High King of the Elves, remembers a shoulder buckle, a tournament that became an arena, and the war that took the people he was supposed to outlive.',
  },
  {
    slug: 'the-squire',
    race: 'red-rangers',
    title: 'The Squire',
    eyebrow: 'Red Rangers I',
    blurb: 'Alfar Chandralon, nephew of the man who burned Ashwinter, is delivered to the elven fortress that wants his family dead, and handed to the captain they fear most.',
  },
];

export const sagaHref = (s) => `/sagas/${s.race}/${s.slug}`;

// ─── HALL OF MEMORIES ────────────────────────────────────────
// Thumbnails live in /images/codex/<img>.jpg, full versions in
// /images/gallery/full/<img>.jpg.
//
// The fourth argument lists further images of the same subject, each as
// [name, caption]. Give someone a second image and they stop being a single
// plate: they get a page of their own at /gallery/<race>/<img>, and the race
// grid links to it instead of enlarging. Leave it off and nothing changes.
//
// The captions sit under each image on that page, where repeating the person's
// name would be pointless — the heading already says it.
const T = (img, name, note, more = [], cover = '') => ({
  img, name, note,
  shots: [
    { img, label: cover },
    ...more.map(([shot, label]) => ({ img: shot, label })),
  ],
});

export const galleryItemHref = (cat, item) => `/gallery/${cat.slug}/${item.img}`;

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
      T('adamas',           'Adamas',           'Father of Humanity', [
        ['adamas-full-figure', 'Full figure'],
        ['adamas-portrait',    'Upper body'],
        ['adamas-face',        'Face'],
        ['adamas-profile',     'Profile'],
      ], 'In the garden'),
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
// One material world: near-black stone, cold silver, and blood kept back for
// the moments that deserve it. Sections differ only as metals differ, never as
// fantasy colours: library and codex carry a trace of antique gold for age,
// sagas a trace of oxidised blood, gallery and workshop cold steel and
// faesilver, the trial the deepest blood. Text is silver on black everywhere,
// so long-form reading stays legible whatever section it sits in.
const STONE = {
  bg: '#05080b', card: '#11171d', text: '#c5ced5', textDim: '#74818b', textBright: '#e1e7ea',
};
const theme = (accent, accentLight, accentDim, particle, over = {}) => ({
  ...STONE, accent, accentLight, accentDim, particle,
  line: 'rgba(197,206,213,0.14)', ...over,
});

export const THEMES = {
  // aged records: silver with the faintest antique gold of old seals
  library: theme('#9aa6ae', '#e1e7ea', '#5d6a73', '197,206,213', { bg: '#080d12' }),
  // the long tellings, where blood is spilled
  sagas: theme('#8b191c', '#c5ced5', '#5a0b0e', '160,120,120', { bg: '#080a0c' }),
  // the chronicle: stone and engraved metal
  codex: theme('#a08a63', '#e1e7ea', '#5f5340', '190,190,190', { bg: '#080d12' }),
  // faces and places, lit coldly
  gallery: theme('#8fa2b2', '#e1e7ea', '#55626d', '160,180,200', { bg: '#05080b' }),
  // the trial: the blood side of the world
  trial: theme('#761014', '#c5ced5', '#4a0a0d', '150,110,110', { bg: '#07090b' }),
  // the builders' workshop: faesilver and cold steel
  workshop: theme('#8fa8bb', '#e1e7ea', '#4f5d68', '150,170,190', { bg: '#060a0e' }),
};

// ─── STORY ARTWORK ───────────────────────────────────────────
// The stories that have a picture in /images/stories/<slug>.jpg, plus the few
// kept elsewhere. Listed rather than looked up, because pages are rendered on
// Cloudflare where there is no filesystem to ask. Add a slug here when its
// artwork is added.
const STORY_ART_SLUGS = new Set([
  'abel-walks-too-far', 'ash-is-still-a-seed', 'blood-that-answers', 'first-child-of-man-and-elf',
  'first-elu-due', 'king-solomon', 'the-alliance-that-stopped-meeting', 'the-architecture-is-set',
  'the-birth-of-humanity', 'the-blessing-that-wasnt-asked-for', 'the-brother-who-waited',
  'the-council-that-should-have-failed', 'the-exile-of-the-soul-defilers', 'the-first-command',
  'the-first-funeral', 'the-first-human-fear', 'the-first-monster-you-recognize', 'the-first-wrongness',
  'the-generals-who-could-not-leave', 'the-green-correction', 'the-invitations-that-arrived-separately',
  'the-knives-before-the-war', 'the-law-that-no-one-cheered', 'the-map-that-lost-roads',
  'the-mercy-argument', 'the-name-that-should-not-be-spoken', 'the-nine-thrones-do-not-comfort',
  'the-oath-they-did-not-share', 'the-profane-birth', 'the-sea-prison', 'the-second-correction',
  'the-spear-that-was-not-meant-to-exist', 'the-world-watches-the-duel', 'the-worlds-immune-system',
  'when-balance-cost-lives', 'when-the-equation-broke', 'when-the-sky-bled',
  'when-the-titans-broke-their-own-law',
]);
const STORY_ART_ELSEWHERE = {
  'the-serpent-wars': '/images/serpent-wars-swamp.jpg',
};
export const storyArt = (slug) =>
  STORY_ART_ELSEWHERE[slug] ?? (STORY_ART_SLUGS.has(slug) ? `/images/stories/${slug}.jpg` : null);

// ─── PLATE ARTWORK ───────────────────────────────────────────
// One picture stands for each age and each people, taken from the world's own
// artwork: a realm, a throne, a battlefield, a face. Used on the index plates.
export const AGE_ART = {
  'foundation-age':          '/images/codex/eternal-fae-realm.jpg',
  'age-of-mortal-rebellion': '/images/codex/mortal-kingdom-of-adamas.jpg',
  'age-of-kingdoms':         '/images/codex/throned-acropolis.jpg',
  'age-of-darkness':         '/images/codex/abyssal-realm.jpg',
  'age-of-light':            '/images/codex/heavens-throat.jpg',
  'age-of-freedom':          '/images/codex/planes-of-accord.jpg',
  'age-of-fractured-ideals': '/images/codex/shattered-lowlands.jpg',
  'age-of-darkness-ii':      '/images/codex/ghost-realm.jpg',
  'great-ice-age':           '/images/codex/sky-crown-peaks.jpg',
};
export const RACE_ART = {
  'humans':             '/images/codex/first-human-enclave.jpg',
  'elves':              '/images/codex/tiamel.jpg',
  'half-elves':         '/images/codex/hsal-eraklah.jpg',
  'beast-lords':        '/images/codex/godrian-greyhide.jpg',
  'other-fae-races':    '/images/codex/fae-garden-sanctuary.jpg',
  'other-mortal-races': '/images/codex/semi-oceanic-shore-kingdoms.jpg',
  'red-rangers':        '/images/rangers/shaedra-nyxthorn.jpg',
};

// ─── HELPERS ─────────────────────────────────────────────────
export const storiesInAge = (ageSlug) => STORIES.filter((s) => s.age === ageSlug);
export const storyHref = (s) => `/library/${s.age}/${s.slug}`;
export const ageBySlug = (slug) => AGES.find((a) => a.slug === slug);
