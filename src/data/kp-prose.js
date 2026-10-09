// The copy library for KP readings.
//
// Every sentence a report can print is written here first. The report engine
// chooses between them using the chart's own numbers and joins them; it never
// composes a new claim. That is deliberate, and it is the same discipline the
// Fivefold report keeps: the same birth data must always produce the same
// reading, and a reader must be able to ask where any sentence came from.
//
// The content is the tradition's own attribution table -- what KP and the
// wider Jyotish literature assign to each planet and each house. It is
// recorded here as what the system says, not as what is true of anybody.

// ─── the nine planets ──────────────────────────────────────────────────
// `keynote`  : the planet's governing idea in one phrase
// `asSign`   : what it is held to mean as the sign lord, the widest frame
// `asStar`   : what it is held to mean as the star lord, which KP treats as
//              the strongest of the three
// `asSub`    : what it is held to mean as the sub lord, which KP treats as
//              the deciding voice -- whether the matter comes off at all
// `temper`   : the tone the tradition gives it, used for the closing lines
export const PLANETS = {
  Sun: {
    keynote: 'authority, visibility and the self that answers for itself',
    asSign: 'a life framed around standing where you can be seen and held responsible',
    asStar: 'the matter is governed by your own will and your own name, not by circumstance',
    asSub: 'what happens depends on whether you are willing to be the one accountable for it',
    temper: 'direct, unwilling to be managed, and poor at pretending to be smaller',
  },
  Moon: {
    keynote: 'change, feeling, and the needs that move before thought does',
    asSign: 'a life framed around circumstances that keep moving, and a temperament that reads them',
    asStar: 'the matter is governed by mood, timing and other people, more than by plan',
    asSub: 'what happens depends on conditions you did not set and cannot hold still',
    temper: 'receptive and quick to register, with a tendency to mistake a passing state for a permanent one',
  },
  Mars: {
    keynote: 'force, execution and the appetite for a fight worth having',
    asSign: 'a life framed around effort, friction and things taken by direct action',
    asStar: 'the matter is governed by initiative: it moves when it is pushed and stalls when it is not',
    asSub: 'what happens depends on whether you are prepared to force it, and to take the damage of forcing it',
    temper: 'fast, impatient, effective in a crisis and clumsy in a negotiation',
  },
  Mercury: {
    keynote: 'intelligence, dealing, and the handling of words and terms',
    asSign: 'a life framed around communication, trade, learning and the brokering of other people’s business',
    asStar: 'the matter is governed by information, argument and the exact terms agreed',
    asSub: 'what happens depends on what is said, written and signed, and on who understood it',
    temper: 'adaptable and quick, with a habit of arguing a position before deciding whether it is held',
  },
  Jupiter: {
    keynote: 'expansion, counsel and the long view',
    asSign: 'a life framed around growth, teaching, principle and institutions larger than yourself',
    asStar: 'the matter is governed by scale and by sanction: it needs room and it needs approval',
    asSub: 'what happens depends on whether it can be justified to someone whose judgement you accept',
    temper: 'generous and overreaching in equal measure, inclined to take on more than can be carried',
  },
  Venus: {
    keynote: 'attachment, taste and the worth placed on things',
    asSign: 'a life framed around relation, beauty, comfort and what is considered valuable',
    asStar: 'the matter is governed by attraction and by agreement rather than by force',
    asSub: 'what happens depends on whether it is wanted enough by both sides to be kept',
    temper: 'conciliatory and pleasure-holding, reluctant to break something merely because it is wrong',
  },
  Saturn: {
    keynote: 'delay, structure, and whatever is only earned slowly',
    asSign: 'a life framed around endurance, limitation, labour and the eventual reward of staying',
    asStar: 'the matter is governed by time, and is not refused so much as postponed',
    asSub: 'what happens depends on persistence after the point at which most people stop',
    temper: 'severe and reliable, giving nothing early and very little at all without work',
  },
  Rahu: {
    keynote: 'hunger, departure and the pursuit of what was not allotted',
    asSign: 'a life framed around unorthodox routes, foreign ground and appetites that do not settle',
    asStar: 'the matter is governed by sudden acceleration and by a want that outruns its reason',
    asSub: 'what happens depends on your tolerance for doing it irregularly, and on what the shortcut costs',
    temper: 'relentless and unsatisfied, capable of enormous gain and of not noticing the price',
  },
  Ketu: {
    keynote: 'severance, detachment and the ending of what is finished',
    asSign: 'a life framed around release, loss that turns out to be subtraction rather than theft, and inward work',
    asStar: 'the matter is governed by withdrawal: it concludes rather than develops',
    asSub: 'what happens depends on whether you are prepared to let the thing go, because it will not be held',
    temper: 'indifferent and penetrating, skilled at seeing through what it has stopped wanting',
  },
};

// ─── the twelve houses ─────────────────────────────────────────────────
// KP reads houses as the matters themselves, and the cusp of a house as the
// question "will this come off?". `matter` is the short label, `holds` the
// tradition's list, and `cuspal` what the cuspal sub lord is held to decide.
export const HOUSES = [
  { n: 1,  matter: 'the self',             holds: 'the body, the name, vitality, how you arrive in a room and what people meet first',
            cuspal: 'whether you act in your own interest or in someone else’s' },
  { n: 2,  matter: 'means',                holds: 'money earned and held, possessions, speech, family resources and the voice',
            cuspal: 'whether what you earn stays with you' },
  { n: 3,  matter: 'reach',                holds: 'siblings, short journeys, correspondence, negotiation, courage of the ordinary daily kind',
            cuspal: 'whether your messages land and your short moves pay' },
  { n: 4,  matter: 'ground',               holds: 'mother, home, land, property, the bedrock and the place you return to',
            cuspal: 'whether you get solid ground under you, and keep it' },
  { n: 5,  matter: 'issue',                holds: 'children, creation, risk taken for pleasure, speculation, what you father or found',
            cuspal: 'whether what you make of your own will survives you' },
  { n: 6,  matter: 'adversity',            holds: 'illness, debt, enemies, service, employment under another, and the daily grind',
            cuspal: 'whether you overcome opposition or carry it' },
  { n: 7,  matter: 'the other',            holds: 'marriage, partnership, contracts, open opponents, anyone who sits opposite you',
            cuspal: 'whether the partnership holds or dissolves' },
  { n: 8,  matter: 'the undoing',          holds: 'endings, inheritance, other people’s money, crisis, what is hidden and what is handed over',
            cuspal: 'whether an ending ruins you or transfers something to you' },
  { n: 9,  matter: 'conviction',           holds: 'belief, law, teachers, long journeys, the father, and the principles you will not trade',
            cuspal: 'whether your beliefs are your own or inherited unexamined' },
  { n: 10, matter: 'standing',             holds: 'profession, rank, reputation, authority, and the record people hold you to',
            cuspal: 'whether you rise in public and on what terms' },
  { n: 11, matter: 'gain',                 holds: 'profit, friends, allies, hopes realised, and the network that pays',
            cuspal: 'whether your ambitions convert into actual gain' },
  { n: 12, matter: 'expenditure',          holds: 'loss, exile, confinement, what is spent, what is given away, and solitude',
            cuspal: 'whether what you spend buys anything' },
];

// ─── how confident a reading may sound ─────────────────────────────────
// KP is brittle against an uncertain birth time, because the sub boundaries
// are only arcminutes apart. These are the honest grades, chosen by how much
// clock error the chart can absorb before the Ascendant's sub lord changes.
export const CONFIDENCE = [
  { minMinutes: 8, grade: 'stable',
    note: 'Your Ascendant would need to be more than {m} minutes wrong before its sub lord changed. For KP that is a comfortable margin.' },
  { minMinutes: 4, grade: 'usable',
    note: 'An error of about {m} minutes in your birth time would change the sub lord of your Ascendant, and with it most of this reading. That is a normal margin, but it is not generous.' },
  { minMinutes: 2, grade: 'fragile',
    note: 'Roughly {m} minutes of error in your birth time would change the sub lord of your Ascendant and rewrite this reading. Treat everything below as provisional unless your time came off a birth record.' },
  { minMinutes: 0, grade: 'borderline',
    note: 'Your Ascendant sits within about {m} minutes of a sub boundary. A birth time off by even a minute or two produces a different reading entirely. KP cannot responsibly be read this close to an edge without the time being verified first.' },
];

// ─── the standing caveat ───────────────────────────────────────────────
// Printed on every report, not buried. The arithmetic above is real astronomy
// and can be checked against any ephemeris. The meanings are a tradition, and
// the tradition does not survive controlled testing. Both facts belong in the
// reader's hands.
export const CAVEAT = {
  heading: 'What this document is, and what it is not',
  body: [
    'Everything numerical in this report is ordinary astronomy. The planetary positions are computed from the same models observatories use, the house cusps from Placidus’s own geometry, and the sidereal longitudes by subtracting the Krishnamurti ayanamsa. Any competent astrology program should reproduce these figures to within an arcminute, and you are invited to check.',
    'The meanings are a different kind of thing. They come from Krishnamurti Paddhati, a twentieth-century Indian system, and behind it two thousand years of accumulated attribution. Nothing in the geometry above implies any of it. The interpretations are a tradition’s vocabulary, recorded faithfully, not a measurement of you.',
    'Where astrology’s predictive claims have been tested under blind conditions, they have not held up: a 1985 double-blind study in Nature found astrologers could not match natal charts to clients’ psychological profiles above chance, and a later study of some two thousand people born minutes apart found no similarity in a hundred measured traits beyond what chance predicts. Readings also tend to feel more accurate than they are, because statements loose enough to fit anyone are read as personal.',
    'So read this as a symbolic instrument, which is what it is good at. It will give you a precise, consistent and quite old vocabulary for thinking about your own life. It will not tell you what is going to happen, and anyone who says otherwise is selling you something.',
  ],
};
