// The Fivefold Calling: questions, scoring constants and all 31 results.
//
// THIS FILE IS THE CANONICAL ARCHETYPE REGISTRY. Nothing else may name an
// archetype or a Calling; every page and every report reads them from here.
//
// It began as output from a specification workbook, built by
// scripts/build-fivefold-data.mjs. That workbook no longer exists, and in
// September 2026 the taxonomy was migrated in place by
// scripts/migrate-fivefold-taxonomy.mjs, so this file is now the source of
// truth and is edited directly.
//
// What the 2026 migration changed, and what it deliberately did not:
//
//   changed   the 31 archetype names, their tiers, and the five Callings,
//             which are now named for the drives they measure.
//   unchanged the forty questions, their order, which Calling each belongs
//             to, which are reverse keyed, the five point scale, the
//             normalisation, the 62.5 threshold and the 15 point proximity
//             rule. A result recorded before the migration therefore still
//             classifies to the same code; only its printed name differs.

export const TEST_NAME = 'The Fivefold Calling';
export const TEST_CTA = 'Begin the Fivefold Trial';

// Scoring constants, from the Developer Spec sheet.
export const RULES = {
  likertMin: 1,
  likertMax: 5,
  itemsPerCalling: 8,
  rawMin: 8,
  rawMax: 40,
  activeMin: 62.5,          // a Calling must reach this to be archetype-defining
  activeDistance: 15,       // and be within this many points of the highest
};

// The five drives. The single letter keys are historical and stay: the saved
// answers, the bit weights and every report field are keyed by them, and
// renaming them would risk silently swapping two dimensions to no gain.
// `pure` is the archetype code reached when only that drive is active.
export const CALLINGS = {
  O: {
    key: 'O', name: 'Virtue', dimension: 'Virtue', weight: 1, pure: 1, colour: '#C89B3C',
    question: 'What is right?',
    concerns: 'integrity, fairness, accountability, consistency, moral standards, keeping ' +
      'your word, resisting unfair advantage, and judging allies and opponents alike.',
  },
  H: {
    key: 'H', name: 'Devotion', dimension: 'Devotion', weight: 2, pure: 2, colour: '#9E3030',
    question: 'Who matters to me?',
    concerns: 'loyalty, attachment, care, sacrifice, belonging, protective responsibility, ' +
      'repairing relationships, and commitment to people and communities.',
  },
  F: {
    key: 'F', name: 'Mastery', dimension: 'Mastery', weight: 4, pure: 4, colour: '#406A9B',
    question: 'What must I become capable of?',
    concerns: 'competence, discipline, preparation, skill, execution, persistence, standards ' +
      'and becoming capable enough to meet difficult demands.',
  },
  V: {
    key: 'V', name: 'Influence', dimension: 'Influence', weight: 8, pure: 8, colour: '#2F7D78',
    question: 'How do I move people?',
    concerns: 'persuasion, social confidence, leadership, negotiation, communication, reading ' +
      'social dynamics, recognising power, and moving people toward action.',
  },
  W: {
    key: 'W', name: 'Vigilance', dimension: 'Vigilance', weight: 16, pure: 16, colour: '#684A87',
    question: 'What am I missing?',
    concerns: 'caution, verification, threat detection, contingency planning, scepticism, ' +
      'earned trust, noticing contradictions and anticipating consequences.',
  },
};

// A high score is not a better person and a low one is not a worse one. This
// sits next to the Callings because every page that prints a score needs it.
export const VIRTUE_CAVEAT =
  'A high Virtue score means principles and consistency matter to you. It is not a measure ' +
  'of whether you are a good person, and no Calling is worth more than another.';

export const ORDER = ['O', 'H', 'F', 'V', 'W'];

// The five point scale. Value is the raw answer, 1 to 5.
export const SCALE = [
  { v: 1, t: 'Strongly disagree' },
  { v: 2, t: 'Disagree' },
  { v: 3, t: 'Mixed or neutral' },
  { v: 4, t: 'Agree' },
  { v: 5, t: 'Strongly agree' },
];

// Reverse items are scored 6 minus the answer. Never shown to the reader.
export const QUESTIONS = [
  { n: 1, calling: 'O', reverse: false, t: 'I admit mistakes even when hiding them would protect my reputation.' },
  { n: 2, calling: 'H', reverse: false, t: 'I feel responsible for protecting people who have placed their trust in me.' },
  { n: 3, calling: 'F', reverse: false, t: 'Before a difficult goal, I naturally break it into steps and priorities.' },
  { n: 4, calling: 'V', reverse: false, t: 'I am comfortable taking the lead when a group lacks direction.' },
  { n: 5, calling: 'W', reverse: false, t: 'Before committing to an important decision, I actively look for what could go wrong.' },
  { n: 6, calling: 'O', reverse: true, t: 'People with status deserve special exceptions that ordinary people do not.' },
  { n: 7, calling: 'H', reverse: true, t: 'Once a relationship becomes difficult, I usually detach rather than try to repair it.' },
  { n: 8, calling: 'F', reverse: true, t: 'I often abandon a plan once the initial excitement disappears.' },
  { n: 9, calling: 'V', reverse: true, t: 'I usually wait for someone else to speak first even when I have a strong view.' },
  { n: 10, calling: 'W', reverse: true, t: 'I usually assume a promising situation is safe without examining the downside.' },
  { n: 11, calling: 'O', reverse: false, t: 'If I could gain an advantage through a loophole, I would still avoid it if it felt unfair.' },
  { n: 12, calling: 'H', reverse: false, t: 'I willingly make meaningful sacrifices for people I deeply trust.' },
  { n: 13, calling: 'F', reverse: false, t: 'I can keep working on boring tasks when they are necessary for a larger objective.' },
  { n: 14, calling: 'V', reverse: false, t: 'I enjoy persuading people who initially disagree with me.' },
  { n: 15, calling: 'W', reverse: false, t: 'I trust people more after their behavior has been consistent over time.' },
  { n: 16, calling: 'O', reverse: true, t: 'If manipulation gets a good result, the method matters less to me.' },
  { n: 17, calling: 'H', reverse: true, t: 'I prefer not to let anyone depend on me.' },
  { n: 18, calling: 'F', reverse: true, t: 'Deadlines feel optional until someone forces me to act.' },
  { n: 19, calling: 'V', reverse: true, t: 'I dislike situations where I have to win people over.' },
  { n: 20, calling: 'W', reverse: true, t: 'I give new people complete trust very quickly.' },
  { n: 21, calling: 'O', reverse: false, t: 'When rules benefit me unfairly, I question the rules rather than simply enjoy the advantage.' },
  { n: 22, calling: 'H', reverse: false, t: 'When someone close to me is struggling, I stay involved even when helping becomes inconvenient.' },
  { n: 23, calling: 'F', reverse: false, t: 'I usually prepare before high-stakes situations instead of relying on improvisation.' },
  { n: 24, calling: 'V', reverse: false, t: 'I naturally adjust how I communicate depending on who is listening.' },
  { n: 25, calling: 'W', reverse: false, t: 'I notice contradictions or warning signs that other people sometimes overlook.' },
  { n: 26, calling: 'O', reverse: false, t: 'I would return something valuable I found even if nobody could trace it to me.' },
  { n: 27, calling: 'H', reverse: false, t: 'Belonging to a close circle matters more to me than complete independence.' },
  { n: 28, calling: 'F', reverse: false, t: 'I track progress and adjust my plan when results are poor.' },
  { n: 29, calling: 'V', reverse: false, t: 'Negotiation feels energizing rather than uncomfortable.' },
  { n: 30, calling: 'W', reverse: false, t: 'For important plans, I prefer having a backup option.' },
  { n: 31, calling: 'O', reverse: false, t: 'Keeping my word matters even when circumstances make it inconvenient.' },
  { n: 32, calling: 'H', reverse: false, t: 'Loyalty should survive ordinary conflict and disappointment.' },
  { n: 33, calling: 'F', reverse: false, t: 'Under pressure, I can put the objective ahead of temporary comfort.' },
  { n: 34, calling: 'V', reverse: false, t: 'I quickly notice who has influence, who wants it, and how decisions are really being made.' },
  { n: 35, calling: 'W', reverse: false, t: 'When something seems unusually easy or favorable, I check for hidden costs or motives.' },
  { n: 36, calling: 'O', reverse: false, t: 'I try to judge allies and rivals by the same moral standard.' },
  { n: 37, calling: 'H', reverse: false, t: 'If a trusted person fails badly, my first instinct is to help them recover before judging them.' },
  { n: 38, calling: 'F', reverse: false, t: 'I prefer clear standards for deciding whether a job was actually done well.' },
  { n: 39, calling: 'V', reverse: false, t: 'I can build rapport with people whose personalities are very different from mine.' },
  { n: 40, calling: 'W', reverse: false, t: 'I can delay action long enough to verify critical information before committing.' },
];

// Display bands for a single Calling's affinity. These describe relative
// tendencies, not grades: 90 is not a better score than 50, and the wording
// is chosen so no band reads as a pass or a failure.
export const BANDS = [
  { at: 85, label: 'Defining', meaning: 'Likely to shape your choices even when that is inconvenient.' },
  { at: 75, label: 'Strong', meaning: 'A reliable and important motive, although others can still overrule it.' },
  { at: 62.5, label: 'Active', meaning: 'Strong enough to define the archetype while it stays within fifteen points of your highest.' },
  { at: 55, label: 'Emerging', meaning: 'Not archetype-defining, but close enough to colour particular decisions.' },
  { at: 45, label: 'Available', meaning: 'A secondary mode that appears in the right situation.' },
  { at: 0, label: 'Quiet', meaning: 'Less likely to drive decisions, and useful as a counterweight when your louder drives overreach.' },
];

export const bandOf = (affinity) =>
  (BANDS.find((b) => affinity >= b.at) || BANDS[BANDS.length - 1]);

// All 31 results, keyed by the bitmask code.
export const ARCHETYPES = {
  1: {
    code: 1,
    tier: 'Pure',
    name: 'The Disciple',
    blend: 'Virtue',
    reveal: 'Principle before convenience.',
    essence: 'A personality chiefly organized around principle.',
    strengths: 'integrity and principled consistency.',
    decide: 'In important decisions, this archetype asks what is right or consistent.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, seeks legitimacy and principled consistency.',
    shadow: 'Becomes rigid, moralizing or blind to context.',
    growth: 'Practice mercy without abandoning standards.',
    role: 'Disciple, magistrate, saint-knight, keeper of sacred law',
    footer: 'Your result is The Disciple. Your defining Callings are Virtue. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  2: {
    code: 2,
    tier: 'Pure',
    name: 'The Caregiver',
    blend: 'Devotion',
    reveal: 'People before prestige.',
    essence: 'A personality chiefly organized around loyalty.',
    strengths: 'loyalty and protective commitment.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, protects morale and the people behind the mission.',
    shadow: 'Overprotects, clings too long, or confuses loyalty with obligation.',
    growth: 'Protect without making others dependent on your protection.',
    role: 'Caregiver, sworn retainer, protector of kin, shield-bearer',
    footer: 'Your result is The Caregiver. Your defining Callings are Devotion. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  3: {
    code: 3,
    tier: 'Dual',
    name: 'The Saint',
    blend: 'Virtue + Devotion',
    reveal: 'What is right and whom I love should not be separated.',
    essence: 'A blended personality that combines principle and loyalty.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, seeks legitimacy and principled consistency; protects morale and the people behind the mission.',
    shadow: 'May become self-sacrificing, paternalistic or unforgiving toward betrayal.',
    growth: 'Let care and principle correct each other.',
    role: 'Sacred guardian, temple knight, protector of the innocent',
    footer: 'Your result is The Saint. Your defining Callings are Virtue and Devotion. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  4: {
    code: 4,
    tier: 'Pure',
    name: 'The Blacksmith',
    blend: 'Mastery',
    reveal: 'Competence is a form of power.',
    essence: 'A personality chiefly organized around execution.',
    strengths: 'discipline and reliable execution.',
    decide: 'In important decisions, this archetype asks what will actually work.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through.',
    shadow: 'Turns life into a project plan; can become impatient with slower people.',
    growth: 'Leave room for spontaneity, emotion and imperfect progress.',
    role: 'Blacksmith, quartermaster, tactician, master artisan, siege planner',
    footer: 'Your result is The Blacksmith. Your defining Callings are Mastery. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  5: {
    code: 5,
    tier: 'Dual',
    name: 'The Oathkeeper',
    blend: 'Virtue + Mastery',
    reveal: 'A standard is meaningless if it is never enforced.',
    essence: 'A blended personality that combines principle and execution.',
    strengths: 'integrity and principled consistency; discipline and reliable execution.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks what will actually work.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; seeks legitimacy and principled consistency.',
    shadow: 'Can become severe, procedural or contemptuous of incompetence.',
    growth: 'Remember that justice without proportion becomes punishment.',
    role: 'Oathkeeper, judge-knight, disciplined enforcer of law',
    footer: 'Your result is The Oathkeeper. Your defining Callings are Virtue and Mastery. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  6: {
    code: 6,
    tier: 'Dual',
    name: 'The Steward',
    blend: 'Devotion + Mastery',
    reveal: 'Loyalty deserves competence.',
    essence: 'A blended personality that combines loyalty and execution.',
    strengths: 'loyalty and protective commitment; discipline and reliable execution.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks what will actually work.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; protects morale and the people behind the mission.',
    shadow: 'Can overwork for people or causes that have not earned such sacrifice.',
    growth: 'Set limits before duty turns into servitude.',
    role: 'Steward, captain of a sworn company, household commander',
    footer: 'Your result is The Steward. Your defining Callings are Devotion and Mastery. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  7: {
    code: 7,
    tier: 'Triple',
    name: 'The True Shepherd',
    blend: 'Virtue + Devotion + Mastery',
    reveal: 'Principle, loyalty and execution march together.',
    essence: 'A blended personality that combines principle, loyalty and execution.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; discipline and reliable execution.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks what will actually work.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; seeks legitimacy and principled consistency; protects morale and the people behind the mission.',
    shadow: 'Can become self-righteous, overburdened or intolerant of compromise.',
    growth: 'Accept that worthy people can choose different methods.',
    role: 'True Shepherd, knight-commander, champion of a sworn cause',
    footer: 'Your result is The True Shepherd. Your defining Callings are Virtue, Devotion and Mastery. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  8: {
    code: 8,
    tier: 'Pure',
    name: 'The Orator',
    blend: 'Influence',
    reveal: 'Relationships are leverage, language and possibility.',
    essence: 'A personality chiefly organized around influence.',
    strengths: 'persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks who must be convinced or coordinated.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence.',
    shadow: 'Can chase approval, status or control the room too aggressively.',
    growth: 'Use influence to clarify and connect, not merely to win.',
    role: 'Orator, envoy, guild negotiator, herald, political broker',
    footer: 'Your result is The Orator. Your defining Callings are Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  9: {
    code: 9,
    tier: 'Dual',
    name: 'The Beacon',
    blend: 'Virtue + Influence',
    reveal: 'Conviction becomes powerful when others can hear it.',
    essence: 'A blended personality that combines principle and influence.',
    strengths: 'integrity and principled consistency; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who must be convinced or coordinated.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; seeks legitimacy and principled consistency.',
    shadow: 'Can moralize through charisma or mistake persuasion for proof.',
    growth: 'Invite dissent before turning conviction into consensus.',
    role: 'Beacon, reformer, principled diplomat, public advocate',
    footer: 'Your result is The Beacon. Your defining Callings are Virtue and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  10: {
    code: 10,
    tier: 'Dual',
    name: 'The Chancellor',
    blend: 'Devotion + Influence',
    reveal: 'People move when they feel seen and bound together.',
    essence: 'A blended personality that combines loyalty and influence.',
    strengths: 'loyalty and protective commitment; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks who must be convinced or coordinated.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; protects morale and the people behind the mission.',
    shadow: 'Can become tribal, approval-seeking or manipulative for the sake of unity.',
    growth: 'Build allegiance without demanding conformity.',
    role: 'Chancellor, alliance-builder, morale leader, trusted envoy',
    footer: 'Your result is The Chancellor. Your defining Callings are Devotion and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  11: {
    code: 11,
    tier: 'Triple',
    name: 'The White Eminence',
    blend: 'Virtue + Devotion + Influence',
    reveal: 'Lead through conviction and human connection.',
    essence: 'A blended personality that combines principle, loyalty and influence.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks who must be convinced or coordinated.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; seeks legitimacy and principled consistency; protects morale and the people behind the mission.',
    shadow: 'Can promise too much, take dissent personally or turn belonging into pressure.',
    growth: 'Separate being loved from being right.',
    role: 'White Eminence, beloved reformer, charismatic protector',
    footer: 'Your result is The White Eminence. Your defining Callings are Virtue, Devotion and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  12: {
    code: 12,
    tier: 'Dual',
    name: 'The Mentor',
    blend: 'Mastery + Influence',
    reveal: 'Plans become real through people.',
    essence: 'A blended personality that combines execution and influence.',
    strengths: 'discipline and reliable execution; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks what will actually work; asks who must be convinced or coordinated.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence.',
    shadow: 'Can become political, calculating or overly focused on efficiency and buy-in.',
    growth: 'Protect truth from the temptation to optimize every conversation.',
    role: 'Mentor, administrator, political strategist, guild master',
    footer: 'Your result is The Mentor. Your defining Callings are Mastery and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  13: {
    code: 13,
    tier: 'Triple',
    name: 'The Grand Architect',
    blend: 'Virtue + Mastery + Influence',
    reveal: 'Build institutions people can trust and follow.',
    essence: 'A blended personality that combines principle, execution and influence.',
    strengths: 'integrity and principled consistency; discipline and reliable execution; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks what will actually work; asks who must be convinced or coordinated.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; seeks legitimacy and principled consistency.',
    shadow: 'Can become paternalistic, image-conscious or too certain of their own legitimacy.',
    growth: 'Create systems that can challenge you as well as others.',
    role: 'Grand Architect, statesman, institutional reformer, commander-magistrate',
    footer: 'Your result is The Grand Architect. Your defining Callings are Virtue, Mastery and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  14: {
    code: 14,
    tier: 'Triple',
    name: 'The Master of the Hearth',
    blend: 'Devotion + Mastery + Influence',
    reveal: 'Turn loyalty into coordinated movement.',
    essence: 'A blended personality that combines loyalty, execution and influence.',
    strengths: 'loyalty and protective commitment; discipline and reliable execution; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks what will actually work; asks who must be convinced or coordinated.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; protects morale and the people behind the mission.',
    shadow: 'Can pressure the group, overvalue momentum and excuse poor methods for team cohesion.',
    growth: 'Keep the mission from consuming the people.',
    role: 'Master of the Hearth, war leader, coalition commander, guild prince',
    footer: 'Your result is The Master of the Hearth. Your defining Callings are Devotion, Mastery and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  15: {
    code: 15,
    tier: 'Fourfold',
    name: 'The Great World Sage',
    blend: 'Virtue + Devotion + Mastery + Influence',
    reveal: 'Lead boldly, love fiercely, build competently, act from principle.',
    essence: 'A blended personality that combines principle, loyalty, execution and influence.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; discipline and reliable execution; persuasion and social navigation.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks what will actually work; asks who must be convinced or coordinated.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; seeks legitimacy and principled consistency; protects morale and the people behind the mission.',
    shadow: 'Can underestimate betrayal, hidden costs or the need for verification.',
    growth: 'Slow down before trust becomes exposure.',
    role: 'Great World Sage, heroic ruler, charismatic commander, champion-king',
    footer: 'Your result is The Great World Sage. Your defining Callings are Virtue, Devotion, Mastery and Influence. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  16: {
    code: 16,
    tier: 'Pure',
    name: 'The Night Sentry',
    blend: 'Vigilance',
    reveal: 'See the danger before it reaches the gate.',
    essence: 'A personality chiefly organized around foresight.',
    strengths: 'foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, anticipates failure modes and hidden risks.',
    shadow: 'Can drift into suspicion, hesitation or chronic threat-scanning.',
    growth: 'Distinguish prudent caution from fear wearing armor.',
    role: 'Night Sentry, scout, gatewarden, investigator, night ranger',
    footer: 'Your result is The Night Sentry. Your defining Callings are Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  17: {
    code: 17,
    tier: 'Dual',
    name: 'The Inquisitor',
    blend: 'Virtue + Vigilance',
    reveal: 'Guard the boundary where danger meets principle.',
    essence: 'A blended personality that combines principle and foresight.',
    strengths: 'integrity and principled consistency; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, seeks legitimacy and principled consistency; anticipates failure modes and hidden risks.',
    shadow: 'Can become suspicious of ambiguity and harsh toward perceived corruption.',
    growth: 'Verify intent before treating uncertainty as wrongdoing.',
    role: 'Inquisitor, corruption hunter, boundary guardian',
    footer: 'Your result is The Inquisitor. Your defining Callings are Virtue and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  18: {
    code: 18,
    tier: 'Dual',
    name: 'The Aegis',
    blend: 'Devotion + Vigilance',
    reveal: 'If I have accepted the watch, I do not casually leave it.',
    essence: 'A blended personality that combines loyalty and foresight.',
    strengths: 'loyalty and protective commitment; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can stay loyal to lost causes and distrust outsiders too readily.',
    growth: 'Know when endurance has become entrapment.',
    role: 'Aegis, fortress keeper, clan protector, final watch',
    footer: 'Your result is The Aegis. Your defining Callings are Devotion and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  19: {
    code: 19,
    tier: 'Triple',
    name: 'The High Paladin',
    blend: 'Virtue + Devotion + Vigilance',
    reveal: 'Protect the people, preserve the standard, watch the gate.',
    essence: 'A blended personality that combines principle, loyalty and foresight.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, seeks legitimacy and principled consistency; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can become fiercely insular and slow to forgive outsiders.',
    growth: 'Extend fairness beyond the inner circle.',
    role: 'High Paladin, clan champion, protector of law and kin',
    footer: 'Your result is The High Paladin. Your defining Callings are Virtue, Devotion and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  20: {
    code: 20,
    tier: 'Dual',
    name: 'The Ward Summoner',
    blend: 'Mastery + Vigilance',
    reveal: 'Preparedness is compassion for the future.',
    essence: 'A blended personality that combines execution and foresight.',
    strengths: 'discipline and reliable execution; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what will actually work; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; anticipates failure modes and hidden risks.',
    shadow: 'Can over-plan, resist uncertainty and mistake control for safety.',
    growth: 'Decide what truly needs a contingency and what can simply unfold.',
    role: 'Ward Summoner, fortress planner, security chief, logistics commander',
    footer: 'Your result is The Ward Summoner. Your defining Callings are Mastery and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  21: {
    code: 21,
    tier: 'Triple',
    name: 'The Knight Lord',
    blend: 'Virtue + Mastery + Vigilance',
    reveal: 'Judge carefully, prepare thoroughly, act cleanly.',
    essence: 'A blended personality that combines principle, execution and foresight.',
    strengths: 'integrity and principled consistency; discipline and reliable execution; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks what will actually work; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; seeks legitimacy and principled consistency; anticipates failure modes and hidden risks.',
    shadow: 'Can be exacting, controlling and impatient with shortcuts or weak execution.',
    growth: 'Learn when \'good enough\' protects more than perfection.',
    role: 'Knight Lord, investigator-general, disciplined judge, war magistrate',
    footer: 'Your result is The Knight Lord. Your defining Callings are Virtue, Mastery and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  22: {
    code: 22,
    tier: 'Triple',
    name: 'The Iron Sentinel',
    blend: 'Devotion + Mastery + Vigilance',
    reveal: 'Prepare so the people entrusted to you survive.',
    essence: 'A blended personality that combines loyalty, execution and foresight.',
    strengths: 'loyalty and protective commitment; discipline and reliable execution; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks what will actually work; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can become hyper-responsible, controlling or unable to delegate.',
    growth: 'Protection is strongest when others are made capable too.',
    role: 'Iron Sentinel, royal protector, household marshal, fortress captain',
    footer: 'Your result is The Iron Sentinel. Your defining Callings are Devotion, Mastery and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  23: {
    code: 23,
    tier: 'Fourfold',
    name: 'The Paragon of Light',
    blend: 'Virtue + Devotion + Mastery + Vigilance',
    reveal: 'I do not need to rule the room; I need to keep it from falling.',
    essence: 'A blended personality that combines principle, loyalty, execution and foresight.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; discipline and reliable execution; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks what will actually work; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; may prefer sincerity or action over social maneuvering; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; seeks legitimacy and principled consistency; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can carry too much alone, avoid persuasion, and expect responsibility to speak for itself.',
    growth: 'Explain the plan, ask for help, and let others share the burden.',
    role: 'Paragon of Light, guardian-commander, protector behind the throne',
    footer: 'Your result is The Paragon of Light. Your defining Callings are Virtue, Devotion, Mastery and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  24: {
    code: 24,
    tier: 'Dual',
    name: 'The Spy',
    blend: 'Influence + Vigilance',
    reveal: 'Read the room, then read what the room is hiding.',
    essence: 'A blended personality that combines influence and foresight.',
    strengths: 'persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; anticipates failure modes and hidden risks.',
    shadow: 'Can become cynical, secretive or assume every relationship contains leverage.',
    growth: 'Practice directness when strategy is unnecessary.',
    role: 'Spy, intelligence handler, court observer, discreet fixer',
    footer: 'Your result is The Spy. Your defining Callings are Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  25: {
    code: 25,
    tier: 'Triple',
    name: 'The High Warden',
    blend: 'Virtue + Influence + Vigilance',
    reveal: 'Truth must survive both deception and politics.',
    essence: 'A blended personality that combines principle, influence and foresight.',
    strengths: 'integrity and principled consistency; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; seeks legitimacy and principled consistency; anticipates failure modes and hidden risks.',
    shadow: 'Can become prosecutorial, suspicious and socially relentless.',
    growth: 'Leave room for uncertainty, privacy and harmless ambiguity.',
    role: 'High Warden, inquisitor of facts, investigator, principled spymaster',
    footer: 'Your result is The High Warden. Your defining Callings are Virtue, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  26: {
    code: 26,
    tier: 'Triple',
    name: 'The Vigil Keeper',
    blend: 'Devotion + Influence + Vigilance',
    reveal: 'Protect through relationships, discretion and anticipation.',
    essence: 'A blended personality that combines loyalty, influence and foresight.',
    strengths: 'loyalty and protective commitment; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can become guarded, politically defensive or overmanage what others know.',
    growth: 'Use secrecy sparingly; trust needs sunlight too.',
    role: 'Vigil Keeper, discreet protector, court guardian, intelligence envoy',
    footer: 'Your result is The Vigil Keeper. Your defining Callings are Devotion, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  27: {
    code: 27,
    tier: 'Fourfold',
    name: 'The Speaker of the Gods',
    blend: 'Virtue + Devotion + Influence + Vigilance',
    reveal: 'Hope, principle, loyalty and presence can move people through danger.',
    essence: 'A blended personality that combines principle, loyalty, influence and foresight.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, mobilizes people through persuasion and presence; seeks legitimacy and principled consistency; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can inspire faster than they can execute and underestimate operational burden.',
    growth: 'Pair vision with structure and people who love the details.',
    role: 'Speaker of the Gods, inspirational leader, reformer, saintly champion',
    footer: 'Your result is The Speaker of the Gods. Your defining Callings are Virtue, Devotion, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  28: {
    code: 28,
    tier: 'Triple',
    name: 'The Spy Lord',
    blend: 'Mastery + Influence + Vigilance',
    reveal: 'Systems, people and risks form one board.',
    essence: 'A blended personality that combines execution, influence and foresight.',
    strengths: 'discipline and reliable execution; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what will actually work; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; anticipates failure modes and hidden risks.',
    shadow: 'Can become manipulative, emotionally detached or obsessed with being several moves ahead.',
    growth: 'Allow sincerity and simple trust where the stakes permit it.',
    role: 'Spy Lord, grand strategist, spymaster, political architect',
    footer: 'Your result is The Spy Lord. Your defining Callings are Mastery, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  29: {
    code: 29,
    tier: 'Fourfold',
    name: 'The Protector of the Realm',
    blend: 'Virtue + Mastery + Influence + Vigilance',
    reveal: 'The standard must survive friendship, pressure and fear.',
    essence: 'A blended personality that combines principle, execution, influence and foresight.',
    strengths: 'integrity and principled consistency; discipline and reliable execution; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks what will actually work; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, keeps more emotional independence than attachment-driven types; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; seeks legitimacy and principled consistency; anticipates failure modes and hidden risks.',
    shadow: 'Can become cold, impersonal or sacrifice relationships to consistency.',
    growth: 'Remember that equal treatment is not always equitable treatment.',
    role: 'Protector of the Realm, high judge, reforming monarch, keeper of institutions',
    footer: 'Your result is The Protector of the Realm. Your defining Callings are Virtue, Mastery, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  30: {
    code: 30,
    tier: 'Fourfold',
    name: 'The Lord of Ghost’s Shadow',
    blend: 'Devotion + Mastery + Influence + Vigilance',
    reveal: 'My people, my objective, my realm, my responsibility.',
    essence: 'A blended personality that combines loyalty, execution, influence and foresight.',
    strengths: 'loyalty and protective commitment; discipline and reliable execution; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks who will be protected or abandoned; asks what will actually work; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can justify harsh means for security or loyalty and place the in-group above universal standards.',
    growth: 'Define lines you will not cross before crisis arrives.',
    role: 'Lord of Ghost’s Shadow, ruler, warlord, clan monarch, protector of a realm',
    footer: 'Your result is The Lord of Ghost’s Shadow. Your defining Callings are Devotion, Mastery, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
  31: {
    code: 31,
    tier: 'Fivefold',
    name: 'The Paragon of the Fateless',
    blend: 'Virtue + Devotion + Mastery + Influence + Vigilance',
    reveal: 'No single Calling governs every situation.',
    essence: 'A blended personality that combines principle, loyalty, execution, influence and foresight.',
    strengths: 'integrity and principled consistency; loyalty and protective commitment; discipline and reliable execution; persuasion and social navigation; foresight and risk awareness.',
    decide: 'In important decisions, this archetype asks what is right or consistent; asks who will be protected or abandoned; asks what will actually work; asks who must be convinced or coordinated; asks what can go wrong or is being missed.',
    relationships: 'In relationships, forms strong obligations to trusted people; can actively shape conversations and alliances; lets trust deepen through consistency rather than immediate openness.',
    work: 'As a leader or collaborator, creates structure, standards and follow-through; mobilizes people through persuasion and presence; seeks legitimacy and principled consistency; protects morale and the people behind the mission; anticipates failure modes and hidden risks.',
    shadow: 'Can suffer internal conflict, over-complexity or paralysis between competing values.',
    growth: 'Learn which Calling should lead in which context instead of trying to satisfy all five equally.',
    role: 'Paragon of the Fateless, mediator-ruler, polymath leader, keeper of balance',
    footer: 'Your result is The Paragon of the Fateless. Your defining Callings are Virtue, Devotion, Mastery, Influence and Vigilance. The remaining Calling scores still matter: they describe capacities and tensions that sit outside the archetype\'s core.',
  },
};

// ── Titan metadata ───────────────────────────────────────────────────────
// The four-drive results carry a mythic title from the world's own powers,
// and the drive they lack shapes how they are read. The missing drive is the
// most misreadable part of a fourfold result, so each one says plainly what
// it does NOT mean. Kept as metadata rather than sprinkled through the copy.
//
// Code 31 has no Titan patron on purpose: the Fateless belong to no office.
const TITANS = {
  15: {
    mythicTitle: 'Conduit of the Titans',
    missing: 'W',
    tension: 'Capable, persuasive, caring and principled, but less naturally governed by ' +
      'suspicion, threat scanning and contingency thinking.',
    notThis: 'This does not make you naive. It means safety is rarely the first question you ask.',
  },
  23: {
    mythicTitle: 'Hyperion’s Paragon',
    missing: 'V',
    tension: 'Capable, loyal, watchful and principled, without being fundamentally driven to ' +
      'persuade, command or socially dominate.',
    notThis: 'This does not make you socially incompetent. It means moving people is not what ' +
      'you are reaching for.',
  },
  27: {
    mythicTitle: 'Titans’ Emissary',
    missing: 'F',
    tension: 'Persuasive, devoted, watchful and principled, while technical perfection and ' +
      'disciplined execution sit further from the centre of your identity.',
    notThis: 'This does not make you incompetent. It means mastery is a tool you use rather ' +
      'than a thing you are.',
  },
  29: {
    mythicTitle: 'Chosen of Ra',
    missing: 'H',
    tension: 'Capable, persuasive, vigilant and principled, but responsibility tends to arise ' +
      'from duty, systems and ideals rather than from personal attachment.',
    notThis: 'This does not make you uncaring. It means your care is owed to the whole rather ' +
      'than to particular people.',
  },
  30: {
    mythicTitle: 'Thanathos’ Shadow',
    missing: 'O',
    tension: 'Highly capable, socially aware, loyal and watchful, but principles tend to be ' +
      'contextual rather than the governing drive.',
    notThis: 'This does not make you immoral. It means you judge by situation and consequence ' +
      'rather than by a fixed standard.',
  },
};

for (const [code, meta] of Object.entries(TITANS)) {
  Object.assign(ARCHETYPES[code], meta);
}

// The one result with nothing missing. It is rarer and more complicated, and
// that is all it is: the interesting question stops being which drives are
// present and becomes which one leads when the five disagree.
ARCHETYPES[31].integration =
  'All five motivational systems crossed the threshold. That is not mastery of every trait, ' +
  'and it is not a better result than any other. It means no single Calling can be relied on ' +
  'to settle a hard choice for you, so the question becomes which one leads when they disagree.';

/** The tier ladder, from one active drive to five. Complexity, not worth. */
export const TIERS = {
  Pure: { label: 'Pure', drives: 1, note: 'One Calling defines the result.' },
  Dual: { label: 'Dual', drives: 2, note: 'Two Callings work together.' },
  Triple: { label: 'Triple', drives: 3, note: 'Three Callings form a more complex role.' },
  Fourfold: { label: 'Fourfold', drives: 4, note: 'Four Callings, and one conspicuous absence.' },
  Fivefold: { label: 'Fivefold', drives: 5, note: 'All five Callings active at once.' },
};

// Said wherever tier is shown, because a ladder invites exactly this misreading.
export const TIER_CAVEAT =
  'Tier describes how many Callings are active, not how strong a person is. A Blacksmith with ' +
  'very high Mastery can be far more pronounced than someone who only just reaches four.';

// The wording the workbook requires around scientific claims.
export const SCIENCE_NOTE =
  'A research-inspired fantasy personality assessment. It is not a validated clinical or diagnostic instrument.';
export const AFFINITY_NOTE =
  'Affinity is a score on this test\'s own scale. It does not mean you are that percentage virtuous or vigilant as an objective fact.';
