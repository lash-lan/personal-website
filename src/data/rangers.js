// The Squire, arranged for playing rather than reading.
//
// The story is written in the first person, which is why it can be handed to a
// player at all: the narrator is a seat someone can sit in. The adventure puts
// the player in that seat under a name of their own.

import squire from './the-squire.json';

export const STORY = {
  slug: squire.slug,
  title: squire.title,
  saga: squire.saga,
  // Who the reader replaces. Both forms, because the prose uses both.
  hero: 'Alfar Chandralon',
  heroFirst: 'Alfar',
  house: 'House Chandralon',
};

/** Chapter cards for the shelf: no prose, so this stays small. */
export const CHAPTERS = squire.chapters.map((c, i) => ({
  i,
  numeral: c.numeral,
  slug: c.slug,
  title: c.title,
  mood: c.mood,
  words: c.words,
}));

/** The chapter as written. This is the canon handed to the game master. */
export function chapterProse(i) {
  const c = squire.chapters[i];
  return c ? c.paras.map((p) => p.x).join('\n\n') : '';
}

export const chapterCount = squire.chapters.length;
