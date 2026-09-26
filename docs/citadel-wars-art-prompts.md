# Citadel Wars — art still needed

Everything here drops straight into the game. The battlefield is the only
blocking one; the rest improve what is already working.

Each prompt is written to be pasted into ChatGPT as-is. Where a reference
image helps, it says so.

---

## 1. THE BATTLEFIELD — blocking

This is the one the game is waiting on. The painting in the spec sheet is
right, but the only copy has "CITADEL WARS" across the top-left and the
routes legend in the top-right, both over terrain, so it cannot be cropped
without losing the side routes.

**Attach:** the Citadel Wars battlefield design sheet, so it matches.

**Size:** 1536 x 1024 (three by two). This matters — the node coordinates are
fractions of it.

> A top-down fantasy battlefield painted as a single continuous landscape,
> 3:2 aspect ratio, seen from high above at a slight angle. Grounded dark
> fantasy, cold northern light, weathered stone and blackened iron, muted
> silver and worn gold, deep snow on the peaks, fog in the hollows, warm
> firelight only where torches burn.
>
> Composition, strictly symmetrical top to bottom:
>
> At the TOP, an enemy fortress built into the mountainside: a great arched
> gate at the centre with crimson banners, and a smaller fortified gate at
> each upper corner where the wilderness roads reach the walls.
>
> At the BOTTOM, the mirror of it: a fortress with a great arched gate at
> the centre flying blue banners, and a smaller gate at each lower corner.
>
> DOWN THE MIDDLE, the widest and most open part of the painting: a ruined
> war road between the two gates. Churned earth, shell craters, broken
> siege engines, shattered wagons, toppled statues, torn banners on bent
> poles, scorched ground, scattered masonry, low earthworks, dead trees.
> This must read immediately as the place where armies collide. Keep the
> ground itself legible: debris around the edges of the route, open earth
> along its spine.
>
> DOWN THE LEFT and DOWN THE RIGHT, two narrow wild routes through the
> wilderness, clearly harder going than the centre: rocky passes, ruined
> forest, a broken bridge, an abandoned shrine, a waterfall, marsh, fog,
> twisted trees, overgrown ruins, skeletal remains. Each route should read
> as a path you could flank through if you dared. Leave the ground along
> each route open enough to stand figures on.
>
> No text, no titles, no legends, no labels, no user interface, no health
> bars, no banners with writing, no figures, no creatures, no glowing
> circles or markers of any kind. The landscape only, empty and waiting.

**Important:** ask for no text and no creatures. Both are added by the game.

---

## 2. THE FIVE CALLING SIGILS — for the personality test

Still coloured dots on bloodoficetear.com/trial. Five emblems, one per
drive, meant to sit together in a ring.

**Size:** 512 x 512 each, on transparent background if ChatGPT allows it,
otherwise pure black.

> A single engraved emblem, centred, filling the frame, carved from
> blackened iron with worn silver inlay. Dark fantasy heraldry, no colour
> beyond metal, no background detail, no text. Flat straight-on view like a
> seal pressed into wax. The emblem is: {SIGIL}

Run it five times, replacing `{SIGIL}`:

| Calling | `{SIGIL}` |
|---|---|
| Mastery | a hammer crossed with an anvil, struck sparks rising |
| Influence | an open mouth shape formed from two facing crescents, sound lines spreading |
| Devotion | two hands cupped around a small flame |
| Vigilance | a single open eye above a crenellated wall |
| Virtue | a balanced scale over an unbroken straight line |

---

## 3. MISSING CHARACTER PORTRAITS

Forty-two of the fifty-seven cards have no face. Two of your own folders are
empty and would be quickest to fill first:

- `Fantasy World IP / Fantasy World Vision / Character References / God's Blood / Caligular King of Domination`
- `... / God's Blood / General Vishraa`

**Size:** square, at least 512 x 512. I crop and shrink them automatically.

> A character portrait for a grounded dark fantasy card game. Waist up,
> facing the viewer, centred, filling the frame. Painted realism, weathered
> materials, cold light, muted palette of blackened steel, aged iron, stone,
> silver, worn leather. No text, no frame, no border, no logo. Plain dark
> background. The character is: {WHO}

Replace `{WHO}` with, for example:

- **Caligular** — a heavy-set warlord in gauntlets, hand resting on a sword
  pommel, mouth curved in approval rather than amusement
- **General Vishraa** — a haunted officer of a sacred order in white and
  grey, white fire at his back, the look of a man about to ask for mercy
  for someone else
- **Shaedra Nyxthorn** — a ranger built like violence, blades already drawn,
  laughing
- **Syrel Thorneheart** — a battlefield surgeon, pale hands stained red,
  humming, a bone needle between her fingers
- **Solenyra Gravespine** — the High-Warden, larger than everyone even
  standing still

The full list of who still needs one is every card in
`src/data/battle-cards.js` not listed in the `ART` set at the bottom.

---

## 4. ARCHETYPE PLATES — the personality test

Thirty-one results have no artwork. Low priority; the report reads well
without them. If you want them, start with the five Titan results, which
are the most dramatic.

**Size:** 1200 x 675 (sixteen by nine).

> A wide dark fantasy scene for a personality result card. No figures facing
> the viewer, no text, no interface. Grounded realism, cold light, weathered
> stone and iron. Atmospheric and restrained rather than heroic. The scene
> is: {SCENE}

- **Paragon of Light** (Hyperion's Paragon) — a lone armoured figure seen
  from behind on a high wall at dawn, watching a valley they will not
  address
- **Great World Sage** (Conduit of the Titans) — an enormous library hall
  where the shelves become mountains, one small figure at a reading table
- **Speaker of the Gods** (Titans' Emissary) — an empty council chamber of
  nine thrones, one lit
- **Protector of the Realm** (Chosen of Ra) — a fortress gate at night,
  every torch lit, nobody visible
- **Lord of Ghost's Shadow** (Thanathos' Shadow) — a figure's shadow cast
  across snow with no figure to cast it

---

## What to do with them

Drop the files anywhere and tell me the folder. I shrink, crop and wire them
in; you never need to resize anything yourself.
