import { set1 } from './set1';
import { set2 } from './set2';
import { set3 } from './set3';
import { set4 } from './set4';

/** [word, natural phonetic respelling, child-friendly meaning, example sentence] */
export type RawWord = [string, string, string, string];

export type RawCategory = {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  from: string;
  to: string;
  words: RawWord[];
};

export type Word = {
  id: string;
  word: string;
  respell: string;
  meaning: string;
  example: string;
  categoryId: string;
  categoryName: string;
  emoji: string;
};

export type Category = Omit<RawCategory, 'words'> & {
  words: Word[];
};

function keyOf(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function build(raw: RawCategory): Category {
  const seen = new Set<string>();
  const words: Word[] = [];
  for (const [word, respell, meaning, example] of raw.words) {
    const id = `${raw.id}:${keyOf(word)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    words.push({
      id,
      word,
      respell,
      meaning,
      example,
      categoryId: raw.id,
      categoryName: raw.name,
      emoji: raw.emoji,
    });
  }
  return { ...raw, words };
}

export const categories: Category[] = [...set1, ...set2, ...set3, ...set4].map(build);

export const allWords: Word[] = categories.flatMap((category) => category.words);

export function getCategory(id: string | undefined): Category | undefined {
  return categories.find((category) => category.id === id);
}

export const TOTAL_WORDS = allWords.length;

/** Words whose spelling can be placed in a letter grid (no spaces or punctuation). */
export function gridFriendly(category: Category): Word[] {
  return category.words.filter((word) => /^[a-zA-Z]{3,11}$/.test(word.word));
}

export function wordsFor(categoryId: string | undefined): Word[] {
  if (!categoryId || categoryId === 'all') return allWords;
  return getCategory(categoryId)?.words ?? allWords;
}
