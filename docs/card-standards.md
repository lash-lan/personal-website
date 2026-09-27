# Blood of Icetear — card standards

You asked me to settle this. Here it is, with the reasoning, so you can
disagree with the reasoning rather than just the answer.

Everything below is read off your own 58 prototype cards. I have not imported
a rule from another game.

---

## 1. A character has ONE number: Power

Your prototypes use three words — power, attack, health — but not evenly:

- **power** appears on a dozen cards: "half the power of all your opponents
  characters", "-3 power to this character after every strike", "give it +13
  power", and a printed Power value on most cards.
- **attack** appears once: "Attack +2 against any rare or higher character".
- **health** appears twice: "return her with 1 health", "Health -5 if Nyrial
  attacks a second time".

Power is what you actually reach for when you write a card. So Power is the
stat, and the other two were the prototype drifting.

**The rule:** a character has Power. When two characters fight, each reduces
the other's Power by its own. At nought or less, a character dies.

That is one number doing the work of two, and it keeps everything that makes
combat interesting:

- equal fights kill both, so trading is a real decision
- a 9 striking a 5 kills it and walks away on 4, so damage accumulates
- a worn-down character is visibly nearly dead

And it makes your existing cards *better*, not merely compatible. "Half the
power of all enemies" now halves what they can hit with and what they can
survive, in one blow — which is why it sits on a Legendary. Knight Titan
Tyberius losing 3 power after every strike now means he visibly wears out,
which is exactly what the card is trying to say.

**What you give up:** you cannot have a 2-power-attack, 8-power-wall standing
next to an 8-attack, 2-health assassin. Every character is equally good at
hitting and at being hit. If you miss that later, the way back is a keyword
(a "Bulwark" that must be struck first, or "Armour 2" that blunts each blow),
not a second stat. Add it when a card needs it, not before.

---

## 2. The second printed number is Cost

Two numbers on a card, not three. The template currently prints 7 / 5 / 7 on
all 58, which are placeholders.

**Cost = ceiling(Power ÷ 3)**, then +1 if the card has a strong ability.

That falls straight out of your own numbers:

| Card | Power | Cost |
|---|---|---|
| Moon Warrior | 5 | 2 |
| Red Rangers Squad Leader | 9 | 3 |
| Shaedra Nyxthorn | 17 | 6 |
| Melissra Orscina | 24 | 8 |
| The Pale Lady | 27 | 9 |

---

## 3. Rarity is a power band — and yours already is one

Your prototype power values sort almost perfectly by rarity. I have made that
the rule rather than a coincidence:

| Tier | Name | Power | Cost | Copies allowed |
|---|---|---|---|---|
| tier_1 | Common | 2–4 | 1 | 3 |
| tier_2 | Uncommon | 5–7 | 2 | 3 |
| tier_3 | Rare | 8–12 | 3–4 | 3 |
| tier_4 | Epic | 13–18 | 5–6 | 2 |
| tier_5 | Legendary | 19–24 | 7–8 | 1 |
| tier_6 | Mythical | 25–30 | 9–10 | 1 |

**Rarity is stored as `tier_3`, never as "Rare".** The display name can change
whenever you decide on lore-friendly ones; no data has to move.

**A standard worth holding to:** rarity should buy *complexity and scarcity*,
not raw strength. A Mythical is not simply a bigger Common — it does something
a Common cannot do at all. Otherwise the game becomes "whoever opened more
packs wins", which is the thing that kills collectible games.

---

## 4. A card's whole worth is its Power

Power is not only the number on the card; it is the budget the card is built
from. A character with no ability spends all of it on Power. A character with
a strong ability spends some of it there instead and is printed weaker.

Shaedra at 17 summons two Red Rangers. A plain Epic at 17 would be stronger in
a straight fight. That difference *is* the ability's price.

**The test before printing any card:** strip the ability. Is what remains
obviously too weak for its cost? Then the ability is paying for itself and the
card is honest. Is it still fine? Then the ability is free, and the card is
a problem.

---

## 5. Deck rules

- **50 cards.**
- **At least 30 characters and at least 8 spells.** You said mix and match;
  this is what stops someone playing 50 spells or 50 characters.
- Copy limits by rarity, in the table above.
- **One Mythical per deck**, at most.

---

## 6. Keywords — hold the line at a few

You already have these, from your own cards. Adding a keyword is expensive:
every one is a thing a new player must learn before they can read a card.

| Keyword | Meaning |
|---|---|
| **Quick Attack** | May strike the turn it arrives |
| **Summon** | Put a token character into the arena |
| **Destroy** | Kill it; it goes to the graveyard |
| **Exile** | Remove it from the game entirely; it never returns |
| **Graveyard** | Where dead cards rest, and can be reached |

Five, and it stayed five. A sixth was drafted for the World Titans and died
with them.

Exile mattering *because* the graveyard is reachable is good design and it is
already in your cards — Hidden Boss returns a character from the opponent's
graveyard, so exiling is how you deny it.

---

## 6a. Who is allowed to be a card

**The World Titans are not cards.** Lash's call, and the lore backs it: the
Law of Divine Distance forbids celestial beings intervening in mortal affairs
under penalty of mortality, and permits the Elder Gods only to send Avatars.

I had tried to work around that with a keyword — Titans costing less the worse
your position got, so the gods arrived only when things were dire. That was
solving a flavour problem that the lore had already answered with a flat no.
A rule you have to invent an exception for is usually the rule talking.

So:

- **Avatars are cards.** The Morrigan's Avatar, Lucifial's Avatar, the Devil
  Kings Avatar. This is exactly the channel the Law leaves open.
- **The gods behind them are not.** Hyperion, Lucifial, Thanatos, Hades,
  Persephone, Selene, The Morrigan, Ra, Oceanus, Freyva, Glorion — and Typhon
  and Akidna, who are World Titans too.
- **Their deeds are spells.** The Cataclysm carries Typhon's painting. The Law
  of Divine Distance carries Hyperion's, since he is the one who enacted it.

Prime Gods from the prototype — Icetear, Child of Winter, and Knight Titan
Tyberius — stay, because they are Lash's own designed cards rather than mine.
If the same objection applies to them, they come out the same way.

`scripts/cards-selftest.mjs` fails the build if a World Titan reappears as a
character, because a card that powerful is exactly the sort that creeps back.

---

## 7. Words the game uses

- The board is **the arena**. Your cards say so.
- Your life total is **Citadel Mastery**, starting at **100**.
- Characters are **in the arena**, or **on your side of the arena**.
- Dead cards go to the **graveyard**, unless **exiled**.

---

## 8. The turn

Draw one → Muster rises by one → play cards → strike → end.

A spell marked **Instant** may be played at any time, including after an
enemy declares a strike. Divine Intervention already does this, and it is the
single best thing in the prototype, because it means a turn is never safe.

---

## 9. What this leaves open

- Whether a character can strike the Citadel directly while enemy characters
  stand in the arena. I would say **yes**, or nothing ever gets through a
  board of 50-card decks — and it is what makes "Bulwark" worth inventing
  later.
- Muster's ceiling. I would start at 10.
- Whether spells also cost Muster. I would say yes, same curve.
