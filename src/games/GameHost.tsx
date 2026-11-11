import { categories, getCategory, type Category } from '../data/vocabulary';
import { gameById } from './registry';
import WordSearch from './WordSearch';
import Spelling from './Spelling';
import MatchUp from './MatchUp';
import Listen from './Listen';
import Scramble from './Scramble';
import Quiz from './Quiz';
import Sentence from './Sentence';
import { GameTop } from './shared';

export default function GameHost({ gameId, categoryId }: { gameId: string; categoryId: string }) {
  const game = gameById(gameId);
  const category: Category | undefined =
    categoryId === 'all' ? undefined : getCategory(categoryId);

  if (!game) {
    return (
      <div className="container page-head">
        <h1>Game not found</h1>
        <p className="meaning" style={{ marginTop: '0.5rem' }}>
          That game has wandered off. Try the arcade.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <a className="btn primary" href="#/games">
            Open the arcade
          </a>
        </p>
      </div>
    );
  }

  const using: Category =
    category ?? {
      id: 'all',
      name: 'All words',
      emoji: '🌍',
      blurb: 'A mix of all 10 word worlds.',
      from: '#6c4cff',
      to: '#38b6ff',
      words: categories.flatMap((item) => item.words),
    };

  switch (game.id) {
    case 'word-search':
      return <WordSearch category={using} game={game} />;
    case 'spelling':
      return <Spelling category={using} game={game} />;
    case 'match':
      return <MatchUp category={using} game={game} />;
    case 'listen':
      return <Listen category={using} game={game} />;
    case 'scramble':
      return <Scramble category={using} game={game} />;
    case 'quiz':
      return <Quiz category={using} game={game} />;
    case 'sentence':
      return <Sentence category={using} game={game} />;
    default:
      return (
        <div className="container page-head">
          <GameTop game={game} category={using} />
          <p className="meaning">This game is coming soon.</p>
        </div>
      );
  }
}
