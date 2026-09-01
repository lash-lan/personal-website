// The Deep Trial item bank: 15 Mirror items, 24 dilemmas, 6 forced trade-offs.
//
// Audit section 7 sets these counts. Audit section 8 requires that every
// dilemma force a psychologically meaningful trade-off and that each option
// sound intelligent enough that a mature person could genuinely choose it.
// No canon character from the books appears here.
//
// Every option carries its own evidence tags, so the report can explain the
// pattern rather than only the total. Audit section 4.
//
//   p   primary Calling, +3          s   secondary Calling, +1
//   f   facet points                 th  one of the fifteen scenario themes
//   cost  personal cost              rel   relationship context
//   lead  leadership context         unc   uncertainty level
//   act   action style

// ─── THE MIRROR ──────────────────────────────────────────────────────
// One self report item per facet. The middle answer is the neutral one and
// is counted when profile clarity asks how much of the Mirror was ambiguous.
export const MIRROR_SCALE = [
  { t: 'Not like me at all', v: 0 },
  { t: 'A little like me', v: 25 },
  { t: 'Sometimes, it depends', v: 50, neutral: true },
  { t: 'Mostly like me', v: 75 },
  { t: 'Exactly like me', v: 100 },
];

const m = (facet, statement) => ({ facet, t: statement });

export const MIRROR = [
  m('integrity',       'I keep to what I said I would do even when breaking it would cost me nothing and nobody would ever know.'),
  m('fairness',        'I try to apply the same standard to people I like and people I do not.'),
  m('moralCourage',    'I say the unwelcome thing out loud, even when the room has already agreed on something else.'),
  m('loyalty',         'When someone is mine to stand by, I stay, including through the part where it stops being admired.'),
  m('care',            'I notice when someone is struggling before they say anything about it.'),
  m('boundaries',      'I can refuse someone I love without either giving in later or cutting them off.'),
  m('planning',        'Before I begin something that matters, I can already see the shape of how it has to go.'),
  m('persistence',     'I finish things after the interesting part is over and only the grind is left.'),
  m('standards',       'I would rather deliver something late and right than on time and adequate.'),
  m('socialBoldness',  'In a room of people who outrank me, I am willing to be the first to speak.'),
  m('persuasion',      'I can bring people round to something they did not want, without pressuring them.'),
  m('socialReading',   'I can usually tell who actually holds the power in a room, whatever the seating says.'),
  m('threatDetection', 'I often sense that something is wrong before I can explain what it is.'),
  m('verification',    'I check things I have been told, even by people I trust, before I act on them.'),
  m('contingency',     'I keep a second option alive, even when the first one is going well.'),
];

// ─── THE TWENTY FOUR DILEMMAS ────────────────────────────────────────
const o = (t, p, s, f, th, meta = {}) => ({
  t, p, s, f, th,
  cost: meta.cost || 'low',
  rel: meta.rel || 'none',
  lead: meta.lead || 'none',
  unc: meta.unc || 'med',
  act: meta.act || 'act',
});

const d = (n, title, scene, prompt, choices) => ({ n, title, scene, prompt, choices });

export const DILEMMAS = [
  d(1, 'The Quartermaster\'s Ledger',
    'A supply hall before dawn. Frost on the grain sacks, a lamp, and a ledger left open.',
    'You find that a quartermaster you have known for years has been quietly altering the counts. The garrison has not gone hungry. The numbers have simply never been true.',
    [
      o('Record what you found and submit it, whatever it costs the friendship.', 'O', 'W',
        { integrity: 2, verification: 1 }, 'justiceLoyalty', { cost: 'high', rel: 'trusted', act: 'act' }),
      o('Go to them first and give them the chance to correct it themselves.', 'H', 'O',
        { loyalty: 2, fairness: 1 }, 'justiceLoyalty', { cost: 'med', rel: 'trusted', act: 'persuade' }),
      o('Rebuild the counting system so the alteration becomes impossible.', 'F', 'W',
        { planning: 2, contingency: 1 }, 'justiceLoyalty', { cost: 'low', act: 'act' }),
      o('Raise it at the officers\' table where everyone must answer in the open.', 'V', 'O',
        { socialBoldness: 2, fairness: 1 }, 'publicPrivate', { cost: 'med', lead: 'directive', act: 'persuade' }),
      o('Say nothing yet, and quietly audit two more seasons of the ledger first.', 'W', 'F',
        { verification: 2, planning: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
    ]),

  d(2, 'The Unfinished Wall',
    'A half built rampart. Grey sky, cold mortar, and a line of tired workers.',
    'Scouts report a raiding party two days out. The wall needs four days. You command the work.',
    [
      o('Hold the schedule and build it properly. A wall that fails is worse than no wall.', 'F', 'O',
        { standards: 2, integrity: 1 }, 'preparationSpeed', { lead: 'directive', act: 'act' }),
      o('Throw everything into the weakest span and accept the rest will be rough.', 'W', 'F',
        { threatDetection: 2, planning: 1 }, 'preparationSpeed', { unc: 'high', act: 'act' }),
      o('Send the workers home and meet the raiders in the field instead.', 'V', 'W',
        { socialBoldness: 2, threatDetection: 1 }, 'safetyObjective', { cost: 'high', lead: 'directive' }),
      o('Get the least able people out first, then build with whoever remains.', 'H', 'W',
        { care: 2, contingency: 1 }, 'safetyObjective', { rel: 'subordinate', act: 'act' }),
      o('Tell the workers the truth about the odds and let them choose to stay.', 'O', 'V',
        { integrity: 2, persuasion: 1 }, 'authorityDissent', { lead: 'consultative', act: 'persuade' }),
    ]),

  d(3, 'The Starving Thief',
    'A market square at dusk. A thin figure held by two guards, and a small crowd forming.',
    'A woman has stolen bread. The law is clear and the law is harsh. You are asked to decide in front of everyone.',
    [
      o('Apply the sentence. A law bent in public stops being a law.', 'O', 'F',
        { fairness: 2, standards: 1 }, 'mercyStandards', { lead: 'directive', act: 'act' }),
      o('Pay the baker yourself and let her go.', 'H', 'O',
        { care: 2, integrity: 1 }, 'mercyStandards', { cost: 'high', act: 'act' }),
      o('Sentence her, then change the ordinance that made hunger a crime.', 'F', 'O',
        { planning: 2, fairness: 1 }, 'mercyStandards', { act: 'act' }),
      o('Argue the case in the open until the crowd itself asks for mercy.', 'V', 'H',
        { persuasion: 2, care: 1 }, 'publicPrivate', { lead: 'consultative', act: 'persuade' }),
      o('Ask first who sent her, and whether she is the only one.', 'W', 'O',
        { verification: 2, fairness: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
    ]),

  d(4, 'The Sealed Letter',
    'A war tent at night. A courier\'s satchel, a broken seal, and one lamp burning low.',
    'A letter has arrived accusing your most reliable officer of treachery. The accuser is anonymous. Battle is in three days.',
    [
      o('Confront the officer directly and read them the accusation to their face.', 'O', 'V',
        { integrity: 2, socialBoldness: 1 }, 'trustVerification', { rel: 'subordinate', act: 'act' }),
      o('Trust them. Years of proof outweigh a letter with no name on it.', 'H', 'O',
        { loyalty: 2, integrity: 1 }, 'trustVerification', { rel: 'trusted', act: 'hold' }),
      o('Quietly verify the letter\'s claims before anyone knows it exists.', 'W', 'F',
        { verification: 2, planning: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
      o('Restructure the command so no single person could do the damage alleged.', 'F', 'W',
        { contingency: 2, planning: 1 }, 'preparationSpeed', { act: 'act' }),
      o('Find who wrote it. An anonymous accusation is itself an act worth naming.', 'V', 'W',
        { socialReading: 2, threatDetection: 1 }, 'reputationTruth', { act: 'verify' }),
    ]),

  d(5, 'The Ruined Bridge',
    'A mountain road. A half collapsed bridge above a gorge, snow, and exhausted travellers.',
    'Your party must cross before nightfall, but the bridge will not hold everyone.',
    [
      o('You gave your word they would arrive. Take the dangerous crossing rather than break it.', 'O', 'F',
        { integrity: 2, persistence: 1 }, 'costDuty', { cost: 'high', act: 'act' }),
      o('Build the decision around the weakest travellers, even if everyone is delayed.', 'H', 'W',
        { care: 2, contingency: 1 }, 'compassionFairness', { rel: 'subordinate', act: 'act' }),
      o('Examine the materials and organise a repair or a controlled crossing.', 'F', 'W',
        { planning: 2, verification: 1 }, 'preparationSpeed', { act: 'act' }),
      o('Find locals or rivals and negotiate enough help to cross.', 'V', 'H',
        { persuasion: 2, socialReading: 1 }, 'influenceDirect', { act: 'persuade' }),
      o('Scout another route before gambling the whole party.', 'W', 'F',
        { contingency: 2, planning: 1 }, 'certaintyAction', { unc: 'high', act: 'verify' }),
    ]),

  d(6, 'The Convenient Rumour',
    'A colonnade outside a council chamber. Voices carrying, and a story spreading fast.',
    'A rumour is circulating that would ruin a rival of yours. You know it is false. Correcting it costs you the advantage.',
    [
      o('Say plainly that it is false, in the same room where it was spread.', 'O', 'V',
        { integrity: 2, socialBoldness: 1 }, 'reputationTruth', { cost: 'high', act: 'act' }),
      o('Tell your rival privately so they can defend themselves.', 'H', 'O',
        { care: 2, integrity: 1 }, 'publicPrivate', { cost: 'med', act: 'act' }),
      o('Trace it to its source and stop it there rather than argue with the air.', 'W', 'F',
        { verification: 2, planning: 1 }, 'reputationTruth', { act: 'verify' }),
      o('Let it die on its own. Chasing a rumour usually feeds it.', 'F', 'W',
        { planning: 2, threatDetection: 1 }, 'certaintyAction', { act: 'hold' }),
      o('Redirect the room toward the real question the rumour is hiding.', 'V', 'W',
        { socialReading: 2, contingency: 1 }, 'influenceDirect', { act: 'persuade' }),
    ]),

  d(7, 'Two Wounded, One Healer',
    'A field surgery. Blood in the straw, one healer, and two people who will not both last the hour.',
    'One is a stranger with the better chance. One is your own, and worse hurt.',
    [
      o('The better chance. The measure has to be the same whoever is lying there.', 'O', 'F',
        { fairness: 2, standards: 1 }, 'compassionFairness', { cost: 'high', rel: 'stranger', act: 'act' }),
      o('Your own. You do not hand your people to a calculation.', 'H', 'O',
        { loyalty: 2, integrity: 1 }, 'compassionFairness', { cost: 'high', rel: 'trusted', act: 'act' }),
      o('Work the problem. Two hands, split the hour, buy time for both.', 'F', 'W',
        { persistence: 2, contingency: 1 }, 'certaintyAction', { act: 'act' }),
      o('Wake the camp and find a second pair of hands, whatever it takes.', 'V', 'H',
        { socialBoldness: 2, care: 1 }, 'influenceDirect', { act: 'persuade' }),
      o('Ask the healer. They know something you do not, and the hour is theirs.', 'W', 'V',
        { verification: 2, socialReading: 1 }, 'trustVerification', { lead: 'consultative', act: 'verify' }),
    ]),

  d(8, 'The Unclear Signal',
    'A watchtower before dawn. A light on the far ridge, flickering in no pattern you know.',
    'It could be a call for aid, a lure, or nothing. Committing the garrison empties the fort.',
    [
      o('Go. If it is a call for aid, arriving late is the same as not going.', 'H', 'V',
        { care: 2, socialBoldness: 1 }, 'certaintyAction', { cost: 'high', unc: 'high', act: 'act' }),
      o('Send a small party and hold the rest. Answer without emptying the walls.', 'F', 'W',
        { planning: 2, contingency: 1 }, 'certaintyAction', { unc: 'high', act: 'act' }),
      o('Wait for the pattern to repeat. An unread signal is not yet information.', 'W', 'F',
        { verification: 2, planning: 1 }, 'certaintyAction', { unc: 'high', act: 'verify' }),
      o('Signal back and see what answers.', 'V', 'W',
        { socialReading: 2, threatDetection: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
      o('Wake the officers and put it to them before you decide alone.', 'O', 'V',
        { fairness: 2, persuasion: 1 }, 'authorityDissent', { lead: 'consultative', act: 'persuade' }),
    ]),

  d(9, 'The Order You Doubt',
    'A stone hall. A sealed command on the table, and the officer who delivered it waiting.',
    'The order is lawful, from a superior you respect, and you believe it is wrong.',
    [
      o('Refuse it in writing and accept whatever follows.', 'O', 'V',
        { moralCourage: 2, socialBoldness: 1 }, 'authorityDissent', { cost: 'high', act: 'act' }),
      o('Carry it out, and record your objection so the record is honest.', 'F', 'O',
        { standards: 2, integrity: 1 }, 'authorityDissent', { act: 'act' }),
      o('Go to them privately and try to change the order at its source.', 'V', 'O',
        { persuasion: 2, moralCourage: 1 }, 'publicPrivate', { act: 'persuade' }),
      o('Carry it out in the way that does the least harm to the people under it.', 'H', 'F',
        { care: 2, planning: 1 }, 'authorityDissent', { rel: 'subordinate', act: 'act' }),
      o('Delay. Find out what they know that would explain it.', 'W', 'F',
        { verification: 2, contingency: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
    ]),

  d(10, 'The Rival\'s Proposal',
    'A hall of maps. A rival commander offers a plan that is better than yours.',
    'Adopting it means the victory carries their name, not yours.',
    [
      o('Adopt it and say publicly whose plan it was.', 'O', 'V',
        { integrity: 2, socialBoldness: 1 }, 'ambitionIntegrity', { cost: 'med', act: 'act' }),
      o('Adopt it. The outcome matters more than the attribution.', 'F', 'O',
        { standards: 2, fairness: 1 }, 'ambitionIntegrity', { act: 'act' }),
      o('Merge the two so both commands own the result.', 'V', 'H',
        { persuasion: 2, socialReading: 1 }, 'influenceDirect', { lead: 'consultative', act: 'persuade' }),
      o('Test it hard first. A better plan from a rival deserves the same scrutiny.', 'W', 'F',
        { verification: 2, planning: 1 }, 'trustVerification', { act: 'verify' }),
      o('Adopt it, and make sure your own people are not the ones who pay for the change.', 'H', 'F',
        { care: 2, contingency: 1 }, 'costDuty', { rel: 'subordinate', act: 'act' }),
    ]),

  d(11, 'The Invitation',
    'A lit hall, music, and a circle of people who have decided you belong with them.',
    'They offer you a place. The price is agreeing with them in public, always.',
    [
      o('Refuse. A place bought with your voice is not a place.', 'O', 'V',
        { moralCourage: 2, socialBoldness: 1 }, 'belongingIndependence', { cost: 'high', act: 'withdraw' }),
      o('Accept, and work to change them from the inside over time.', 'V', 'F',
        { persuasion: 2, persistence: 1 }, 'belongingIndependence', { act: 'persuade' }),
      o('Accept the place and keep your disagreements private.', 'H', 'V',
        { loyalty: 2, socialReading: 1 }, 'belongingIndependence', { act: 'hold' }),
      o('Ask exactly what "always" means before you answer anything.', 'W', 'O',
        { verification: 2, fairness: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
      o('Decline the terms but offer to work with them on specific things.', 'F', 'O',
        { planning: 2, integrity: 1 }, 'belongingIndependence', { act: 'act' }),
    ]),

  d(12, 'The Long Road or the Short',
    'A crossroads at first light. One road is quick and watched. One is slow and quiet.',
    'You carry something that must arrive. The fast road risks everything at once.',
    [
      o('The fast road. Every day it is not delivered is a day it can be lost.', 'V', 'F',
        { socialBoldness: 2, persistence: 1 }, 'safetyObjective', { unc: 'high', act: 'act' }),
      o('The slow road. Arriving matters more than arriving first.', 'W', 'F',
        { contingency: 2, planning: 1 }, 'safetyObjective', { act: 'act' }),
      o('Split it. Two carriers, two roads, so no single loss is total.', 'F', 'W',
        { planning: 2, contingency: 1 }, 'safetyObjective', { act: 'act' }),
      o('Take the road that keeps your people out of the watched country.', 'H', 'W',
        { care: 2, threatDetection: 1 }, 'costDuty', { rel: 'subordinate', act: 'act' }),
      o('Send word ahead that it is coming, and travel openly.', 'O', 'V',
        { integrity: 2, persuasion: 1 }, 'trustVerification', { act: 'act' }),
    ]),

  d(13, 'The Officer Who Failed',
    'A yard after a bad night. One officer standing apart, and a company that saw everything.',
    'Their mistake cost lives. The company is watching to see what you do about it.',
    [
      o('Say it plainly in front of the company. They saw it, and pretending helps nobody.', 'O', 'V',
        { fairness: 2, socialBoldness: 1 }, 'publicPrivate', { lead: 'directive', rel: 'subordinate', act: 'act' }),
      o('Take them aside. Correction in private, support in public.', 'H', 'V',
        { care: 2, socialReading: 1 }, 'publicPrivate', { rel: 'subordinate', act: 'persuade' }),
      o('Find what in the system let one mistake reach that far.', 'F', 'W',
        { planning: 2, verification: 1 }, 'preparationSpeed', { act: 'verify' }),
      o('Relieve them. The standard is the standard and the company must see it hold.', 'F', 'O',
        { standards: 2, fairness: 1 }, 'mercyStandards', { lead: 'directive', act: 'act' }),
      o('Establish first whether the failure was theirs at all.', 'W', 'O',
        { verification: 2, fairness: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
    ]),

  d(14, 'The Offer',
    'A private room. A patron with real power, and a proposal that would raise you years early.',
    'Nothing about it is illegal. It would simply require you to stop asking one question.',
    [
      o('Refuse, and keep asking the question.', 'O', 'W',
        { integrity: 2, verification: 1 }, 'ambitionIntegrity', { cost: 'high', act: 'act' }),
      o('Accept, rise, and ask the question later from a position that can survive it.', 'F', 'V',
        { planning: 2, persuasion: 1 }, 'ambitionIntegrity', { act: 'act' }),
      o('Refuse, and tell the people the question was about.', 'V', 'O',
        { socialBoldness: 2, moralCourage: 1 }, 'reputationTruth', { cost: 'high', act: 'persuade' }),
      o('Find out first why that question is the one worth buying.', 'W', 'F',
        { threatDetection: 2, verification: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
      o('Refuse, because accepting would put the people who rely on you inside their debt.', 'H', 'O',
        { loyalty: 2, integrity: 1 }, 'costDuty', { rel: 'trusted', act: 'withdraw' }),
    ]),

  d(15, 'The Collapsing Mine',
    'Dust, timber groaning, and a shaft that will not stay open much longer.',
    'People are still inside. Going in may cost you and save nobody.',
    [
      o('Go in. You do not stand outside while it is still possible.', 'H', 'V',
        { care: 2, socialBoldness: 1 }, 'responsibilitySelf', { cost: 'high', unc: 'high', act: 'act' }),
      o('Organise the rescue from outside where you can actually direct it.', 'F', 'W',
        { planning: 2, contingency: 1 }, 'responsibilitySelf', { lead: 'directive', act: 'act' }),
      o('Hold everyone back until the timbers are shored. More bodies in there helps nobody.', 'W', 'F',
        { threatDetection: 2, standards: 1 }, 'responsibilitySelf', { lead: 'directive', act: 'hold' }),
      o('Ask for volunteers and go in with whoever chooses it, having told them the odds.', 'O', 'V',
        { integrity: 2, persuasion: 1 }, 'authorityDissent', { lead: 'consultative', act: 'persuade' }),
      o('Get the ones near the entrance out first, then reassess.', 'V', 'H',
        { socialReading: 2, care: 1 }, 'certaintyAction', { act: 'act' }),
    ]),

  d(16, 'The Kinsman\'s Crime',
    'A quiet room in your own house. Someone you grew up with, and a thing they have done.',
    'The evidence is yours alone. Nobody else will ever find it.',
    [
      o('Bring it forward. The measure does not change because the name is familiar.', 'O', 'F',
        { fairness: 2, standards: 1 }, 'justiceLoyalty', { cost: 'high', rel: 'trusted', act: 'act' }),
      o('Protect them, and carry the weight of that choice yourself.', 'H', 'O',
        { loyalty: 2, integrity: 1 }, 'justiceLoyalty', { cost: 'high', rel: 'trusted', act: 'hold' }),
      o('Make them come forward themselves, and stand beside them when they do.', 'V', 'O',
        { persuasion: 2, moralCourage: 1 }, 'justiceLoyalty', { rel: 'trusted', act: 'persuade' }),
      o('Set the terms under which you stay silent, and hold them to every one.', 'F', 'H',
        { standards: 2, boundaries: 1 }, 'mercyStandards', { rel: 'trusted', act: 'act' }),
      o('Understand what led to it before you decide anything at all.', 'W', 'H',
        { verification: 2, care: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
    ]),

  d(17, 'The Trusted Report',
    'A briefing before a march. A map, a route, and a scout you have relied on for years.',
    'Their report is confident and clean. Something about it does not sit right with you.',
    [
      o('Ride the route yourself before you commit anyone to it.', 'W', 'F',
        { verification: 2, persistence: 1 }, 'trustVerification', { act: 'verify' }),
      o('Trust them. Doubting a good scout on a feeling costs you the scout.', 'H', 'V',
        { loyalty: 2, socialReading: 1 }, 'trustVerification', { rel: 'trusted', act: 'hold' }),
      o('Tell them exactly what does not sit right and ask them to answer it.', 'O', 'V',
        { integrity: 2, socialBoldness: 1 }, 'trustVerification', { rel: 'trusted', act: 'persuade' }),
      o('Plan the march so a wrong report is survivable.', 'F', 'W',
        { contingency: 2, planning: 1 }, 'preparationSpeed', { act: 'act' }),
      o('Send a second scout without telling the first.', 'V', 'W',
        { socialReading: 2, verification: 1 }, 'trustVerification', { act: 'verify' }),
    ]),

  d(18, 'The Deserter',
    'A cold morning. A young soldier brought back, and a company that has already lost too many.',
    'The penalty is death. They are seventeen and they ran because they were afraid.',
    [
      o('The penalty exists so that fear does not empty the line. Apply it.', 'O', 'F',
        { fairness: 2, standards: 1 }, 'mercyStandards', { lead: 'directive', act: 'act' }),
      o('Spare them and take the consequences of that decision onto yourself.', 'H', 'O',
        { care: 2, moralCourage: 1 }, 'mercyStandards', { cost: 'high', act: 'act' }),
      o('Give them the hardest duty in the company instead, and let them earn it back.', 'F', 'H',
        { standards: 2, care: 1 }, 'mercyStandards', { act: 'act' }),
      o('Put it to the company. They are the ones who were left holding the line.', 'V', 'O',
        { persuasion: 2, fairness: 1 }, 'authorityDissent', { lead: 'consultative', act: 'persuade' }),
      o('Ask why a seventeen year old was on that line at all.', 'W', 'H',
        { verification: 2, care: 1 }, 'responsibilitySelf', { act: 'verify' }),
    ]),

  d(19, 'The Season\'s Last Ship',
    'A harbour, a rising wind, and a hull that has not been properly inspected.',
    'It is the last crossing before winter. Delay means everyone waits until spring.',
    [
      o('Inspect it. Winter is long, but drowning is longer.', 'W', 'F',
        { verification: 2, standards: 1 }, 'preparationSpeed', { act: 'verify' }),
      o('Sail. The cost of a lost season falls on people who cannot absorb it.', 'H', 'V',
        { care: 2, socialBoldness: 1 }, 'preparationSpeed', { unc: 'high', act: 'act' }),
      o('Inspect what can be inspected in the hours available, then decide.', 'F', 'W',
        { planning: 2, verification: 1 }, 'preparationSpeed', { act: 'verify' }),
      o('Tell every passenger the true state of the hull and let them choose.', 'O', 'V',
        { integrity: 2, persuasion: 1 }, 'authorityDissent', { lead: 'consultative', act: 'persuade' }),
      o('Sail, but only with those who can survive a bad crossing.', 'V', 'W',
        { socialReading: 2, contingency: 1 }, 'safetyObjective', { act: 'act' }),
    ]),

  d(20, 'The Debt You Did Not Make',
    'A counting house. An obligation left behind by someone who is gone.',
    'It is not legally yours. The people owed are real and have no other recourse.',
    [
      o('Pay it. Whose name is on the paper is not the same as who owes.', 'O', 'H',
        { integrity: 2, care: 1 }, 'costDuty', { cost: 'high', act: 'act' }),
      o('Pay what you can and be honest about what you cannot.', 'H', 'O',
        { care: 2, integrity: 1 }, 'costDuty', { cost: 'med', act: 'act' }),
      o('Build a plan that clears it over years without ruining you.', 'F', 'O',
        { planning: 2, persistence: 1 }, 'costDuty', { act: 'act' }),
      o('Refuse. Taking on every inherited debt ends with you unable to help anyone.', 'H', 'F',
        { boundaries: 2, planning: 1 }, 'costDuty', { act: 'withdraw' }),
      o('Find who else benefited and bring them to the table.', 'V', 'W',
        { socialReading: 2, verification: 1 }, 'influenceDirect', { act: 'persuade' }),
    ]),

  d(21, 'The Refugee Column',
    'A road choked with people. Limited stores, and a town that will not take everyone.',
    'You must decide who is admitted, knowing the rest continue into winter.',
    [
      o('A rule, applied to everyone, announced before you begin.', 'O', 'F',
        { fairness: 2, planning: 1 }, 'compassionFairness', { lead: 'directive', act: 'act' }),
      o('The ones who will not survive the road. Need before order.', 'H', 'O',
        { care: 2, moralCourage: 1 }, 'compassionFairness', { act: 'act' }),
      o('Work the numbers so the town can take more than it thinks it can.', 'F', 'H',
        { planning: 2, persistence: 1 }, 'compassionFairness', { act: 'act' }),
      o('Go to the townspeople and change what they are willing to give.', 'V', 'H',
        { persuasion: 2, care: 1 }, 'influenceDirect', { lead: 'consultative', act: 'persuade' }),
      o('Find out what is behind them on that road before you fill the town.', 'W', 'F',
        { threatDetection: 2, contingency: 1 }, 'safetyObjective', { unc: 'high', act: 'verify' }),
    ]),

  d(22, 'The Room That Has Decided',
    'A council already in agreement. Papers gathered, chairs turning toward the door.',
    'You believe they are wrong, and you have no proof, only a reading of what is happening.',
    [
      o('Say it anyway, without proof, and let it stand on the record.', 'O', 'V',
        { moralCourage: 2, socialBoldness: 1 }, 'authorityDissent', { cost: 'med', act: 'act' }),
      o('Ask questions until the room finds the flaw itself.', 'V', 'W',
        { persuasion: 2, socialReading: 1 }, 'influenceDirect', { act: 'persuade' }),
      o('Say nothing now, gather the proof, and return with it.', 'W', 'F',
        { verification: 2, persistence: 1 }, 'certaintyAction', { act: 'verify' }),
      o('Speak to the one person in the room whose mind actually moves the others.', 'V', 'H',
        { socialReading: 2, loyalty: 1 }, 'influenceDirect', { act: 'persuade' }),
      o('Accept the decision and prepare for the failure you expect.', 'F', 'W',
        { contingency: 2, planning: 1 }, 'certaintyAction', { act: 'hold' }),
    ]),

  d(23, 'The Two Hours',
    'A siege line. Two hours until the assault, and one thing you can still fix.',
    'You can repair the gate, brief the companies, or walk the line and steady people.',
    [
      o('Repair the gate. The physical thing that will actually fail.', 'F', 'W',
        { standards: 2, threatDetection: 1 }, 'preparationSpeed', { act: 'act' }),
      o('Brief the companies so no one is guessing when it starts.', 'F', 'V',
        { planning: 2, persuasion: 1 }, 'preparationSpeed', { lead: 'directive', act: 'act' }),
      o('Walk the line. Frightened people fail before gates do.', 'H', 'V',
        { care: 2, socialReading: 1 }, 'influenceDirect', { rel: 'subordinate', act: 'persuade' }),
      o('Take the last two hours to check the assumption the whole defence rests on.', 'W', 'O',
        { verification: 2, integrity: 1 }, 'certaintyAction', { unc: 'high', act: 'verify' }),
      o('Stand where you can be seen, so they know you did not leave.', 'O', 'H',
        { moralCourage: 2, loyalty: 1 }, 'responsibilitySelf', { act: 'hold' }),
    ]),

  d(24, 'The Thing You Promised Not To Tell',
    'A quiet corridor. Someone waiting for an answer you gave your word not to give.',
    'Keeping the confidence protects one person. Breaking it protects several.',
    [
      o('Keep your word. A promise that only holds when convenient is not one.', 'O', 'H',
        { integrity: 2, loyalty: 1 }, 'justiceLoyalty', { cost: 'high', rel: 'trusted', act: 'hold' }),
      o('Break it. The several outweigh the one, and you will carry the cost.', 'O', 'F',
        { moralCourage: 2, fairness: 1 }, 'justiceLoyalty', { cost: 'high', act: 'act' }),
      o('Go back to the person and get released from the promise first.', 'H', 'V',
        { loyalty: 2, persuasion: 1 }, 'justiceLoyalty', { rel: 'trusted', act: 'persuade' }),
      o('Warn the several without revealing what you were told.', 'V', 'W',
        { socialReading: 2, contingency: 1 }, 'influenceDirect', { act: 'act' }),
      o('Establish whether the danger to the several is real before you break anything.', 'W', 'O',
        { verification: 2, fairness: 1 }, 'trustVerification', { unc: 'high', act: 'verify' }),
    ]),
];

// ─── THE SIX FORCED TRADE-OFFS ───────────────────────────────────────
// Two options only, both genuinely defensible, no third road. These carry
// more weight than a dilemma because the participant cannot have both.
const tradeoff = (n, prompt, a, b) => ({ n, prompt, choices: [a, b] });
const to = (t, calling, facet, other) => ({ t, p: calling, f: { [facet]: 3 }, against: other });

export const TRADEOFFS = [
  tradeoff(1, 'One of these has to give. Which do you keep?',
    to('Being someone whose word is fixed.', 'O', 'integrity', 'loyalty'),
    to('Being someone who never abandons their own.', 'H', 'loyalty', 'integrity')),

  tradeoff(2, 'You can only build one reputation. Choose.',
    to('The one who is always ready before it starts.', 'F', 'planning', 'socialBoldness'),
    to('The one who moves first when it does.', 'V', 'socialBoldness', 'planning')),

  tradeoff(3, 'A hard year is coming. Which do you refuse to lose?',
    to('The standard, even if fewer things get finished.', 'F', 'standards', 'care'),
    to('The people, even if the work gets worse.', 'H', 'care', 'standards')),

  tradeoff(4, 'You cannot have both. Which serves you better?',
    to('Knowing what is really happening in the room.', 'V', 'socialReading', 'verification'),
    to('Knowing whether what you were told is true.', 'W', 'verification', 'socialReading')),

  tradeoff(5, 'Choose the failure you could live with.',
    to('Having acted too early, and been wrong.', 'V', 'persuasion', 'contingency'),
    to('Having waited too long, and been right.', 'W', 'contingency', 'persuasion')),

  tradeoff(6, 'Which would you rather be accused of?',
    to('Being too hard on people who deserved understanding.', 'O', 'fairness', 'boundaries'),
    to('Being too soft on people who deserved consequences.', 'H', 'boundaries', 'fairness')),
];

// ─── THE TEN CRUCIBLE MOMENTS ────────────────────────────────────────
// The Master specification repeats one line after every scene. The v2 Audit
// asks for more than that: it wants to know whether a response appears more
// under physical threat, social exposure, moral pressure or the unfamiliar.
// So the four answers stay word for word as specified, and only the danger
// changes. Each moment is tagged so the report can say where a pattern sat.
const moment = (context, prompt) => ({ context, prompt });

export const CRUCIBLE_MOMENTS = [
  moment('physical', 'Steel clears a scabbard somewhere behind you. What happens first?'),
  moment('social',   'The room turns, and every face is waiting on your answer. What happens first?'),
  moment('moral',    'You are asked, plainly and in front of others, to do the thing you said you never would. What happens first?'),
  moment('unknown',  'The ground is wrong underfoot, and nothing here follows rules you know. What happens first?'),
  moment('social',   'Someone names a failure of yours out loud, in company, and it is true. What happens first?'),
  moment('physical', 'The timber above you gives, and there is no time to warn anyone. What happens first?'),
  moment('unknown',  'Something moves at the edge of the firelight that you cannot name. What happens first?'),
  moment('moral',    'You realise you have already been part of something you would have refused. What happens first?'),
  moment('social',   'A person you rely on turns on you without warning, in front of the people you lead. What happens first?'),
  moment('physical', 'The horse goes down under you at speed. What happens first?'),
];

// what each kind of danger is called, when the record explains a pattern
export const CRUCIBLE_CONTEXT = {
  physical: 'sudden physical danger',
  social:   'being exposed in front of others',
  moral:    'being cornered morally',
  unknown:  'situations whose rules you do not yet know',
};

// How much each channel contributes to the Calling totals that decide the
// archetype. The Trial dilemmas carry the archetype, because the Master
// specification defines the archetype as behavioural. Trade-offs count
// double their facet weight but do not touch the Calling mask.
export const CHANNEL = { trial: 1, tradeoffFacetWeight: 2 };
