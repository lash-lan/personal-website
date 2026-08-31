// The content libraries the Deep report is assembled from. Audit section 9.
//
// Nothing here is generated at runtime. Blocks are selected by rules and the
// participant's own numbers are written into them, so two people with the
// same archetype do not receive the same sentences.
//
// Every block is written to be readable rather than clinical. The Audit is
// explicit that the record should feel like it came from an archive, but
// that the person must actually understand themselves afterwards.

// ─── the five Callings, read at three strengths ──────────────────────
export const CALLING_PROSE = {
  O: {
    high: 'Principle did most of the deciding. Again and again you chose the course you could defend as right, including where that was the expensive road.',
    mid:  'Principle was present without being the only voice. You reached for what was right, but you let other considerations argue with it.',
    low:  'Abstract principle rarely settled things for you. You seemed to trust the particular situation more than the general rule.',
  },
  H: {
    high: 'People were the reason. Your choices repeatedly bent toward whoever would carry the cost, and you accepted that bending yourself.',
    mid:  'You kept people in view without letting them decide everything. Care informed your choices rather than overruling them.',
    low:  'You rarely resolved a dilemma by asking who would be hurt. That is not coldness. It suggests you reach for another instrument first.',
  },
  F: {
    high: 'You answered pressure by building something. Where others argued about what should happen, you moved to how it would actually be made to work.',
    mid:  'Structure mattered to you without becoming the whole answer. You planned where planning helped and let it go where it did not.',
    low:  'Systems and preparation were not your first instinct. You appear to trust judgment in the moment more than machinery built in advance.',
  },
  V: {
    high: 'You went through people. Rooms, arguments and persuasion were live tools for you, not last resorts.',
    mid:  'You used influence selectively. You were willing to speak and to move a room, but you did not reach for it in every situation.',
    low:  'Persuasion was rarely your first tool. Your Voice was not absent, but you seem to prefer acting directly over working through a room.',
  },
  W: {
    high: 'You kept looking for what was not yet visible. Verification, second roads and unease about clean stories shaped a great deal of your pattern.',
    mid:  'You checked things without letting caution run the decision. Vigilance was one input among several.',
    low:  'You did not often pause to look for the hidden problem. You appear willing to move on what is in front of you.',
  },
};

// ─── the fifteen facets ──────────────────────────────────────────────
// Each carries a reading at high, moderate and low. Only facets that
// meaningfully shape the profile get prose in the report, per Audit D.
export const FACET_PROSE = {
  integrity: {
    high: 'your word held even where nothing enforced it',
    mid:  'you kept your word where it mattered and allowed yourself judgment elsewhere',
    low:  'you treated commitments as revisable when circumstances changed',
  },
  fairness: {
    high: 'you applied one measure regardless of who was standing there',
    mid:  'you aimed at even handedness without treating it as absolute',
    low:  'you let the particular person change what the right answer was',
  },
  moralCourage: {
    high: 'you were willing to be the one who said the unwelcome thing',
    mid:  'you spoke up when it mattered enough, and picked your moments',
    low:  'you rarely chose the option whose main cost was social exposure',
  },
  loyalty: {
    high: 'you stayed with your own past the point where it was comfortable',
    mid:  'you stood by people without making that the whole answer',
    low:  'belonging did not often decide it for you',
  },
  care: {
    high: 'you kept noticing who would actually carry the cost',
    mid:  'you accounted for people without letting that overrule the decision',
    low:  'you rarely resolved a dilemma by asking who would be hurt',
  },
  boundaries: {
    high: 'you could refuse someone close to you and hold that refusal',
    mid:  'you set limits when you had to, though not always early',
    low:  'you seldom chose the option that meant saying no to your own',
  },
  planning: {
    high: 'you reached for structure before the situation demanded it',
    mid:  'you planned where planning obviously paid',
    low:  'you preferred to meet things as they arrived rather than model them first',
  },
  persistence: {
    high: 'you chose the option that had to be carried through the dull part',
    mid:  'you saw things through when they mattered',
    low:  'you leaned toward options that resolved rather than options that ground on',
  },
  standards: {
    high: 'you refused to call adequate work finished',
    mid:  'you held a line on quality without making it the only line',
    low:  'you accepted good enough more readily than most',
  },
  socialBoldness: {
    high: 'you were willing to be the first to speak in a room that could cost you',
    mid:  'you spoke when the situation clearly needed it',
    low:  'you rarely chose the option whose defining feature was speaking up',
  },
  persuasion: {
    high: 'you moved people rather than going around them',
    mid:  'you used persuasion as one route among several',
    low:  'you did not often try to change what people wanted',
  },
  socialReading: {
    high: 'you kept tracking what a room was actually doing beneath what it said',
    mid:  'you read situations without making that your main instrument',
    low:  'you engaged with the stated problem more than the social one underneath it',
  },
  threatDetection: {
    high: 'you kept sensing the shape of what had not happened yet',
    mid:  'you noticed danger without organising everything around it',
    low:  'you did not tend to lead with suspicion',
  },
  verification: {
    high: 'you checked things, including things told to you by people you trust',
    mid:  'you verified where the stakes justified it',
    low:  'you were willing to act on what you had been given',
  },
  contingency: {
    high: 'you kept a second road open even when the first was working',
    mid:  'you kept alternatives in mind without building your life around them',
    low:  'you committed to one line rather than hedging it',
  },
};

// ─── contradictions ──────────────────────────────────────────────────
// Written as things a person may actually feel, not textbook labels.
export const CONTRADICTION_PROSE = {
  planVsFinish: {
    title: 'Preparation against follow through',
    body: 'You reached for planning far more readily than you reached for persistence. That combination tends to feel like this from the inside: the beginning of a thing is vivid and the architecture arrives quickly, and then somewhere past the interesting part the energy that built the plan is not the energy required to finish it. The plan was never the problem. The unglamorous middle is where this pattern costs you.',
  },
  readVsSpeak: {
    title: 'Seeing the room against entering it',
    body: 'Your Social Reading ran well ahead of your Social Boldness. You notice interpersonal power more readily than you enjoy exercising it. People with this shape often know exactly what a room is doing, and say nothing, and then carry the private frustration of having been right silently. The perception is real. The question is what it is for.',
  },
  loyalVsLimit: {
    title: 'Loyalty against limits',
    body: 'You stayed with people more readily than you set terms with them. Loyalty at this strength without matching boundaries tends to mean the cost of staying is absorbed rather than negotiated. You may find you are reliable to people who never had to ask, and that the moment for saying what you needed passed several times before you noticed it.',
  },
  principleVsCase: {
    title: 'The rule against the person in front of you',
    body: 'Your Integrity scored high while your Fairness did not follow it. That is a specific shape rather than an inconsistency. It suggests you hold yourself to a fixed line while allowing the particular circumstances of others to change what you think they are owed. You are strict with your own conduct and more flexible when judging the conduct of others.',
  },
  voiceVsPersuade: {
    title: 'Reading people without moving them',
    body: 'You track what is happening between people closely, but you rarely chose to change what they wanted. That combination can look like detachment from outside while being something quite different from inside: an accurate picture of the room, held privately, without the appetite to intervene in it.',
  },
  standardVsMercy: {
    title: 'Standards against mercy',
    body: 'You held a hard line on quality and did not often soften it for the person carrying it. Under pressure this can turn a limitation into a verdict. Incompetence starts to feel like a character failing rather than a shortage of time, training or luck. The standard is probably right. What it costs the people held to it is the part worth watching.',
  },
  watchVsVerify: {
    title: 'Sensing danger without checking it',
    body: 'Your threat sense ran ahead of your verification. You register that something is wrong more readily than you go and establish what it is. Unchecked, this can leave you carrying an accurate unease that never becomes actionable, and occasionally acting on a suspicion that a single question would have dissolved.',
  },
  watchAndFight: {
    title: 'Vigilance beside confrontation',
    body: 'You watch for danger carefully and you move toward it when it arrives. Those two together make a formidable and expensive combination. You are unlikely to be caught unprepared, and you are also unlikely to let something go once you have seen it. The risk is not that you miss threats. It is that you find them, including where there was not much there.',
  },
  idealVsPractice: {
    title: 'The self you describe against the self who chose',
    body: 'You described yourself as holding a fixed line more strongly than your situational choices bore out. This is not dishonesty and it is worth saying so plainly. Most people describe the person they intend to be. What it usually means is that your principle is genuine and your practice is more contextual than your self image has caught up with.',
  },
};

// ─── Mirror against Trial ────────────────────────────────────────────
export const GAP_PROSE = {
  Idealized: (facet, self, acted) =>
    `You rated yourself notably higher on ${facet} than your choices did (${self} against ${acted}). Read this gently. It usually marks the trait you most want to have rather than one you lack.`,
  'Hidden Strength': (facet, self, acted) =>
    `Your choices showed considerably more ${facet} than you claimed (${acted} against ${self}). This is the more interesting kind of gap. You do it without counting it as one of your qualities.`,
  Aligned: null,
};

// ─── tensions between Callings ───────────────────────────────────────
export const TENSION_PROSE = {
  OH: { title: 'Principle against loyalty', body: 'Your two strongest instincts want different things when someone you care about is in the wrong. The rule says one thing and the bond says another, and you have both at full strength.' },
  OF: { title: 'The right answer against the workable one', body: 'You want the defensible course and you want it actually built. Most of the time these agree. When they do not, you are the person who will neither accept an elegant principle that cannot survive contact with reality nor an efficient system with nothing underneath it.' },
  OV: { title: 'Truth against the room', body: 'You hold a line and you work through people. That combination makes you effective and occasionally exhausting, because you will say the thing and then have to manage what saying it did.' },
  OW: { title: 'Certainty against the need to act', body: 'You want to be right before you move, and you want to be right in a deeper sense as well. The two together can make decisions slow, and unusually sound when they come.' },
  HF: { title: 'People against the standard', body: 'You care about the people and you care about the work being good. Under pressure these pull in opposite directions, and you tend to feel it as guilt in both directions at once.' },
  HV: { title: 'Belonging against candour', body: 'You want to keep people and you want to speak. When those conflict you are likely to choose the relationship and then carry what you did not say.' },
  HW: { title: 'Trust against watchfulness', body: 'You stay with people and you keep checking. Held together these make you loyal without being naive, though it can be tiring to be both at once.' },
  FV: { title: 'Building against persuading', body: 'You can make the thing work and you can make the room want it. Your risk is doing both yourself rather than letting either carry the weight alone.' },
  FW: { title: 'Preparation against paralysis', body: 'You plan and you check. Together these produce work that rarely fails, and occasionally work that does not start.' },
  VW: { title: 'Boldness against caution', body: 'You are willing to move a room and unwilling to trust one. That combination reads as confident to others and feels considerably less settled from inside.' },
};

// ─── how the Crucible meets the archetype ────────────────────────────
export const CRUCIBLE_MEETS = {
  fight: 'Your first movement under sudden pressure is toward the problem. Where your ordinary pattern is deliberate, this is worth knowing: the version of you that arrives in an emergency is faster and more forward than the version that makes your considered decisions.',
  flight: 'Your first movement under sudden pressure is toward distance. This is not cowardice and the Trial does not read it as such. It usually means your instinct is to preserve the ability to choose rather than to commit immediately.',
  freeze: 'Under sudden pressure, action can briefly stall. For a profile that values getting it right, this makes a particular kind of sense: when threat removes the time, the certainty and the preparation you normally rely on, there may be no line that satisfies you, and the search for one is itself the delay.',
  assess: 'Under sudden pressure you become still on purpose. That is a different thing from freezing, and the Trial distinguishes them. You are buying information before you spend your first move.',
};

// ─── life domains ────────────────────────────────────────────────────
// Selected by which facets are actually strong, so a person only receives
// the domains their own answers support.
export const DOMAIN_PROSE = {
  leadership: {
    label: 'How you lead',
    byFacet: {
      standards: 'You lead by holding a line. People know what finished looks like when you are in charge, and they know you will not quietly lower it.',
      care: 'You lead by noticing. Your attention goes to who is struggling before it goes to the schedule, and people generally feel that.',
      planning: 'You lead by removing uncertainty. Your instinct is to make the shape of the work visible so that nobody is guessing.',
      socialBoldness: 'You lead from the front of the room. You are willing to be the one who speaks first and absorbs the first reaction.',
      moralCourage: 'You lead by being the one who says it. Your authority comes less from position than from a willingness to name what others are avoiding.',
      contingency: 'You lead by keeping options alive. People under you are rarely left with only one road.',
      persuasion: 'You lead by bringing people round rather than instructing them. Consent matters to you more than compliance.',
    },
  },
  relationships: {
    label: 'How you are with people you trust',
    byFacet: {
      loyalty: 'You stay. People who have your loyalty tend to find it does not need renewing, which is rarer than you may realise.',
      care: 'You track how people actually are rather than how they say they are, and you adjust without announcing it.',
      boundaries: 'You can say no to people you love without it becoming a rupture, which keeps your closest relationships honest.',
      integrity: 'What you say to someone is what you say about them. People near you generally discover there is no second version.',
      socialReading: 'You read the people close to you accurately, which makes you easy to be understood by and occasionally hard to hide from.',
    },
  },
  conflict: {
    label: 'How you handle conflict',
    byFacet: {
      moralCourage: 'You will enter a conflict you could have avoided if you think avoiding it means letting something stand.',
      socialBoldness: 'You are willing to have the disagreement in the room rather than afterwards.',
      persuasion: 'You would rather change someone\'s mind than defeat them, and you will spend real effort on the difference.',
      loyalty: 'Your conflicts are rarely with your own. You are more likely to defend than to challenge inside your circle.',
      fairness: 'You argue from the standard rather than from position, which makes you difficult to dismiss and easy to underestimate.',
      boundaries: 'You can end a conflict by setting a limit rather than winning, which many people cannot.',
    },
  },
  work: {
    label: 'How you work and finish',
    byFacet: {
      planning: 'You front load. The work is largely decided before it begins, and the execution is the easy part.',
      persistence: 'You finish. The unglamorous back half of a task does not lose you, which is a rarer quality than it sounds.',
      standards: 'You would rather be late and right. This is a real strength and a real cost, depending entirely on who is waiting.',
      verification: 'You check your own work as suspiciously as you check anyone else\'s.',
      contingency: 'You build with a second route already in mind, so your work tends to survive things going wrong.',
    },
  },
  uncertainty: {
    label: 'How you handle not knowing',
    byFacet: {
      verification: 'When you do not know, you go and find out. Ambiguity is a task to you rather than a condition.',
      contingency: 'When you do not know, you keep more than one road open rather than betting the whole thing on your best guess.',
      threatDetection: 'When you do not know, you assume something is moving that you cannot see. This makes you well prepared and occasionally tense about nothing.',
      persistence: 'When you do not know, you keep going anyway, and let the picture resolve through motion.',
      socialReading: 'When you do not know, you read the people. Their behaviour is your data before the facts are in.',
    },
  },
};

// When none of a domain's facets ran high, that is itself a finding and the
// participant should still be told what it means. Named, not padded.
export const DOMAIN_QUIET = {
  leadership: 'None of the facets that usually drive leadership ran high in you. That does not mean you cannot lead. It suggests that when you do, it is unlikely to look like command presence, and more likely to come from whatever your strongest instinct happens to be applied to a group.',
  relationships: 'The facets behind close relationships stayed moderate rather than strong. Read this as a caution about the reading, not about you. These scenes gave limited evidence of how you are with people who already have your trust.',
  conflict: 'You did not repeatedly choose the options that define a conflict style, which usually means conflict is something you handle situationally rather than by temperament. You are unlikely to have one characteristic move.',
  work: 'The facets that govern execution stayed in the middle. In practice that tends to mean your working style follows the task rather than a fixed personal method.',
  uncertainty: 'No single response to not knowing dominated your answers. That is a real result: you appear to meet ambiguity differently depending on what is at stake rather than with one habitual move.',
};

// A fallback tension for profiles where no contradiction crossed the
// threshold. Built from the two strongest Callings, whatever they are.
export const TENSION_MILD = (a, b) =>
  `Nothing in your pattern crossed the line into a genuine contradiction, which is worth saying plainly rather than inventing one. The nearest thing to a tension in you is the ordinary pull between ${a} and ${b}, your two strongest instincts. They agree most of the time. The occasions when they do not are the ones you are likely to find hardest to decide.`;

export const NO_BORDERLAND =
  'There is no neighbouring archetype to show you, because all five Callings answered. That is the rarest shape this Trial produces, and it means no single additional Calling could have changed your title. The reading to take from it is that your pattern is broad rather than specialised.';

// ─── growth, as reflective prompts and never as treatment ────────────
export const GROWTH_PROMPTS = {
  integrity: 'Where in your life is the line you hold actually costing someone else more than it costs you?',
  fairness: 'Name a person you judge more gently than the standard you apply generally. What makes them the exception?',
  moralCourage: 'Think of the last thing you did not say. What did staying quiet protect, and was it worth what it cost?',
  loyalty: 'Is there someone you are still standing by out of history rather than out of a current reason?',
  care: 'Who noticed what you needed most recently, and did you let them?',
  boundaries: 'Where have you said yes so consistently that the option of no has quietly disappeared?',
  planning: 'Which of your current plans has been a substitute for starting?',
  persistence: 'What have you been finishing out of stubbornness rather than because it is still worth finishing?',
  standards: 'Where has your standard stopped being about the work and started being about the person doing it?',
  socialBoldness: 'Where would speaking once change something that silence will not?',
  persuasion: 'Who have you been persuading when you should have been asking?',
  socialReading: 'You see the room. What do you do with what you see, other than know it?',
  threatDetection: 'Which of the things you are braced for has actually happened?',
  verification: 'Where has checking become a way of not deciding?',
  contingency: 'Which second road have you kept open so long that it stopped you committing to the first?',
};

// ─── the honest framing ──────────────────────────────────────────────
export const CLARITY_PROSE = {
  'Clear Pattern': 'Your answers pointed consistently in the same direction, so this reading rests on a steady pattern.',
  'Coherent but Blended': 'Your answers were coherent but drew on more than one instinct, so read the blend rather than the label.',
  'Broad or Context Sensitive': 'Your answers changed a good deal with the situation. That is a finding in itself: you appear to be genuinely context driven rather than rule driven.',
  'Highly Mixed Pattern': 'Your answers varied widely. Treat the archetype loosely here, and the individual observations more seriously than the title.',
};

export const LIMITS_COPY =
  'This is a fantasy assessment informed by themes from trait psychology and by research on how behaviour changes across situations. It is not a validated psychometric instrument, it is not the HEXACO-PI-R or an official version of it, and it is not a measure of who you objectively are. It reflects the choices you made today, in these particular scenes. A different day and a different set of dilemmas could move parts of it.';
