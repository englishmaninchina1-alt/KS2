export type GameId =
  | 'word-search'
  | 'spelling'
  | 'match'
  | 'listen'
  | 'scramble'
  | 'quiz'
  | 'sentence'
  | 'say-it';

export type GameMeta = {
  id: GameId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  tag: string;
  link: string;
};

export const GAMES: GameMeta[] = [
  {
    id: 'word-search',
    name: 'Word Search',
    emoji: '🔎',
    tagline: 'Hunt hidden words',
    description: 'Words hide across, down and diagonally. Drag to find all ten.',
    tag: 'Puzzle',
    link: '#/game/word-search/all',
  },
  {
    id: 'spelling',
    name: 'Spelling Sprint',
    emoji: '🐝',
    tagline: 'Type it, spell it',
    description: 'Listen to the word, use the meaning as a clue and spell it out.',
    tag: 'Spelling',
    link: '#/game/spelling/all',
  },
  {
    id: 'match',
    name: 'Match It',
    emoji: '🧩',
    tagline: 'Pair words with meanings',
    description: 'Tap a word, then tap the meaning that belongs to it.',
    tag: 'Matching',
    link: '#/game/match/all',
  },
  {
    id: 'listen',
    name: 'Listen & Pick',
    emoji: '🎧',
    tagline: 'Train your ears',
    description: 'Hear a word spoken and choose the correct spelling.',
    tag: 'Listening',
    link: '#/game/listen/all',
  },
  {
    id: 'scramble',
    name: 'Letter Scramble',
    emoji: '🔤',
    tagline: 'Put letters in order',
    description: 'Mixed-up letters, one hidden word. Tap the tiles to rebuild it.',
    tag: 'Letters',
    link: '#/game/scramble/all',
  },
  {
    id: 'quiz',
    name: 'Quick Quiz',
    emoji: '🧠',
    tagline: 'Ten brain teasers',
    description: 'Meanings, spellings and sentence clues in one big quiz.',
    tag: 'Quiz',
    link: '#/game/quiz/all',
  },
  {
    id: 'sentence',
    name: 'Sentence Builder',
    emoji: '🏗️',
    tagline: 'Build a whole sentence',
    description: 'Drag nothing, just tap the words into the right order.',
    tag: 'Grammar',
    link: '#/game/sentence/all',
  },
  {
    id: 'say-it',
    name: 'Say It Studio',
    emoji: '🎙️',
    tagline: 'Listen, record, compare',
    description: 'Hear the word, record yourself and check your pronunciation.',
    tag: 'Speaking',
    link: '#/studio/animals',
  },
];

export function gameById(id: string | undefined): GameMeta | undefined {
  return GAMES.find((game) => game.id === id);
}
