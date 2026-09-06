// How each facet changes the reading inside an archetype.
//
// HAND WRITTEN, unlike fivefold-guide.js which is generated from the document.
// The guide names what each facet governs but leaves the wording to the report
// writer, so these are authored here where they can be reviewed as copy.
//
// Two people can share an archetype and still read differently, because the
// archetype comes from five Calling scores while these come from ten narrower
// ones. A line is emitted only when a facet is genuinely high or genuinely
// quiet. Anything in the middle stays silent rather than padding the report.
//
// `where` names the report page the line belongs to.
// `governs` is the guide's own description of the facet's scope, kept beside
// the copy so the two can be checked against each other.

export const HIGH_AT = 75;   // Strong and Defining
export const LOW_BELOW = 45; // Quiet

export const FACET_PROSE = {
  'oath-integrity': {
    where: 'inside',
    governs: 'principle, rule consistency, ethical self-exemptions',
    high: 'You apply your standards to yourself first. The rule that governs everyone else is the rule you expect to be held to, and you notice when you are being offered an exemption you did not earn.',
    low: 'You hold principles without treating them as absolute. Where the situation argues for an exception you are willing to make one, which spares you rigidity but can make your line harder for others to predict.',
  },
  'oath-equality-candor': {
    where: 'people',
    governs: 'fairness, manipulation tolerance, direct truth vs diplomacy',
    high: 'You say the uncomfortable thing rather than manage around it. People generally know where they stand with you, and attempts to work you through flattery or pressure tend to fail early.',
    low: 'You choose diplomacy over bluntness, and you would rather protect a relationship than win a point. The cost is that people sometimes learn your real view later than they needed to.',
  },
  'hearth-protective-care': {
    where: 'people',
    governs: 'how care is shown and how readily burdens are carried',
    high: 'Care arrives as action. You pick things up before being asked, and you often end up holding weight that was never formally handed to you.',
    low: 'You care without automatically absorbing. You let people carry their own load, which keeps you steady but can read as distance to someone who wanted you to step in.',
  },
  'hearth-attachment-boundaries': {
    where: 'people',
    governs: 'closeness, independence, repair and limits',
    high: 'You keep clear lines about what belongs to you and what belongs to the other person, and you return to a rupture rather than letting it settle. Closeness does not cost you your separateness.',
    low: 'Closeness matters more to you than the line around it. You may stay in a difficult attachment past the point it serves you, and repair can feel more urgent than the limit that was crossed.',
  },
  'forge-structure': {
    where: 'mind',
    governs: 'planning, deadlines, preparation and quality standards',
    high: 'You think in sequence and dependency. Before committing you want to know the order of the work, what it rests on and what finished actually means.',
    low: 'You work without much scaffolding, trusting that shape will emerge from doing. That keeps you fast and unbureaucratic, and it means the plan is often in your head rather than anywhere others can see it.',
  },
  'forge-persistence': {
    where: 'purpose',
    governs: 'sustained effort, follow-through and pressure endurance',
    high: 'You finish. The unglamorous middle of a piece of work, where interest has gone and the deadline is still distant, is where you are most reliable.',
    low: 'Your energy is strongest at the beginning. You open well and lose grip through the long middle, so what you start benefits from someone or something that holds you to the end of it.',
  },
  'voice-assertiveness': {
    where: 'purpose',
    governs: 'leadership appetite, persuasion and willingness to state a position',
    high: 'You are willing to be the one who says it. Taking a position in front of people costs you little, and you will argue for an outcome rather than wait to be asked your view.',
    low: 'You would rather influence quietly than lead visibly. You often hold a clear position and still leave the room without having stated it, so the good judgment is real but unheard.',
  },
  'voice-social-reading': {
    where: 'mind',
    governs: 'adaptation, rapport, political awareness and conversational flexibility',
    high: 'You read the room accurately and adjust to it. You register who actually holds the decision, what is not being said and which version of an argument this particular person can hear.',
    low: 'You take people at face value and speak in one register regardless of audience. It makes you consistent and hard to manipulate, and it means the political layer of a room can pass you by.',
  },
  'watch-risk-detection': {
    where: 'mind',
    governs: 'warning-sign sensitivity and hidden-cost detection',
    high: 'You notice the flaw early. Weak assumptions, unpriced costs and the part of a plan nobody has looked at tend to surface for you before they surface for anyone else.',
    low: 'You take a plan as offered rather than probing it for failure. It makes you easy to work with and quick to commit, and it means the hidden cost is more often found by someone else.',
  },
  'watch-trust-contingency': {
    where: 'people',
    governs: 'earned trust, backup planning, verification and trust recovery',
    high: 'Trust is a conclusion you reach rather than a starting position. You verify, you keep a fallback, and once trust is broken you rebuild it slowly and on evidence.',
    low: 'You extend trust early and rarely hold a second plan behind the first. That makes you generous and quick to commit, and it means a betrayal costs you more than it needs to.',
  },
};
