import type { ReactNode } from 'react';
import type { Category } from '../data/vocabulary';
import type { GameMeta } from './registry';
import { Confetti } from '../components/Confetti';

export function GameTop({
  game,
  category,
  right,
}: {
  game: GameMeta;
  category: Category;
  right?: ReactNode;
}) {
  return (
    <div className="game-top">
      <a
        className="btn ghost sm"
        href={category.id === 'all' ? '#/games' : `#/category/${category.id}`}
      >
        ← Back
      </a>
      <div className="game-top-title">
        <h1>
          <span aria-hidden="true">{game.emoji}</span> {game.name}
        </h1>
        <span className="pill">
          {category.emoji} {category.name}
        </span>
      </div>
      {right ?? <span className="game-top-spacer" aria-hidden="true" />}
    </div>
  );
}

export function ResultPanel({
  correct,
  total,
  stars,
  onAgain,
  categoryId,
  message,
  percent: percentOverride,
}: {
  correct: number;
  total: number;
  stars: number;
  onAgain: () => void;
  categoryId: string;
  message?: string;
  percent?: number;
}) {
  const percent =
    typeof percentOverride === 'number'
      ? percentOverride
      : total > 0
        ? Math.round((correct / total) * 100)
        : 0;
  const headline =
    stars >= 3 ? 'Word wizard!' : stars === 2 ? 'Brilliant work!' : stars === 1 ? 'Good effort!' : 'Keep practising!';

  return (
    <div className="result-card">
      {stars >= 2 && <Confetti />}
      <span className="result-emoji" aria-hidden="true">
        {stars >= 3 ? '🏆' : stars === 2 ? '🌟' : stars === 1 ? '🎈' : '🌱'}
      </span>
      <h2 className="result-title">{headline}</h2>
      <p className="result-stars" aria-label={`${stars} out of 3 stars`}>
        {'⭐'.repeat(stars)}
        <span style={{ opacity: 0.25 }}>{'⭐'.repeat(3 - stars)}</span>
      </p>
      <p className="result-score">
        {correct} out of {total} correct · {percent}%
      </p>
      {message && <p className="meaning">{message}</p>}
      <div className="result-actions">
        <button className="btn primary" onClick={onAgain}>
          🔁 Play again
        </button>
        <a className="btn ghost" href="#/games">
          🎮 More games
        </a>
        <a className="btn ghost" href={categoryId === 'all' ? '#/games' : `#/category/${categoryId}`}>
          {categoryId === 'all' ? '🌍 Pick a world' : '📖 Word list'}
        </a>
      </div>
    </div>
  );
}

export function Hearts({ total, left }: { total: number; left: number }) {
  return (
    <span className="hearts" aria-label={`${left} hearts left`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < left ? '❤️' : '🤍'}
        </span>
      ))}
    </span>
  );
}

export function Dots({ total, current }: { total: number; current: number }) {
  return (
    <span className="progress-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={index < current ? 'done' : index === current ? 'now' : ''} />
      ))}
    </span>
  );
}
