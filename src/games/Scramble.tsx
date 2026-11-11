import { useMemo, useState } from 'react';
import type { Category } from '../data/vocabulary';
import { playCorrect, playWin, playWrong } from '../lib/sound';
import { speak } from '../lib/speech';
import { sample, shuffle } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { Dots, GameTop, ResultPanel } from './shared';

const ROUNDS = 8;

type Tile = { id: number; letter: string };
type Outcome = { correct: number; total: number; stars: number; percent: number };

export default function Scramble({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);
  const words = useMemo(
    () => sample(category.words.filter((word) => /^[a-zA-Z]{4,10}$/.test(word.word)), ROUNDS),
    [category, round],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const word = words[Math.min(index, words.length - 1)];
  const tiles = useMemo<Tile[]>(() => {
    if (!word) return [];
    return shuffle(
      word.word
        .toUpperCase()
        .split('')
        .map((letter, id) => ({ id, letter })),
    );
  }, [word]);

  const letterOf = (id: number): string => tiles.find((tile) => tile.id === id)?.letter ?? '';
  const answer = picked.map(letterOf).join('');

  const finish = (score: number) => {
    const percent = Math.max(20, Math.round((score / words.length) * 100) - mistakes * 3);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0;
    addStars(category.id, stars);
    recordGame(game.id, percent);
    if (stars >= 2) playWin();
    setOutcome({ correct: score, total: words.length, stars, percent });
  };

  const nextWord = (score: number) => {
    if (index + 1 >= words.length) {
      finish(score);
      return;
    }
    setIndex((value) => value + 1);
    setPicked([]);
    setShake(false);
    setMessage(null);
    setShowHint(false);
  };

  const addTile = (tile: Tile) => {
    if (picked.includes(tile.id) || outcome) return;
    const nextPicked = [...picked, tile.id];
    setPicked(nextPicked);
    setMessage(null);

    if (nextPicked.length < word.word.length) return;

    const attempt = nextPicked.map((id) => tiles.find((item) => item.id === id)?.letter ?? '').join('');
    if (attempt === word.word.toUpperCase()) {
      playCorrect();
      speak(word.word, { rate: 0.9 });
      const score = correct + 1;
      setCorrect(score);
      setMessage('That’s it! 🎉');
      window.setTimeout(() => nextWord(score), 900);
    } else {
      playWrong();
      setMistakes((value) => value + 1);
      setShake(true);
      setMessage('Not quite — the letters are right, but the order is wrong.');
      window.setTimeout(() => {
        setPicked([]);
        setShake(false);
      }, 650);
    }
  };

  const restart = () => {
    setRound((value) => value + 1);
    setIndex(0);
    setPicked([]);
    setMistakes(0);
    setCorrect(0);
    setShake(false);
    setMessage(null);
    setShowHint(false);
    setOutcome(null);
  };

  if (!word) {
    return (
      <div className="container game-page">
        <GameTop game={game} category={category} />
        <p className="meaning">Not enough words for this game yet.</p>
      </div>
    );
  }

  return (
    <div className="container game-page fade-up">
      <GameTop
        game={game}
        category={category}
        right={
          <span className="game-hud">
            ✅ {correct} / {words.length}
          </span>
        }
      />

      {outcome ? (
        <ResultPanel
          correct={outcome.correct}
          total={outcome.total}
          stars={outcome.stars}
          percent={outcome.percent}
          onAgain={restart}
          categoryId={category.id}
          message="Look for letter pairs you already know, like “th” or “ing”."
        />
      ) : (
        <div className="game-stage spell-stage">
          <div className="game-stage-head" style={{ justifyContent: 'space-between' }}>
            <Dots total={words.length} current={index} />
            <span className="pill">
              Word {index + 1} of {words.length}
            </span>
          </div>

          <h2 style={{ fontSize: '1.6rem' }}>Unscramble the word</h2>
          <p className="meaning" style={{ marginTop: '0.35rem' }}>
            {word.meaning}
          </p>
          <p className="respell" style={{ marginTop: '0.4rem', fontSize: '1rem' }}>
            {showHint ? word.respell : `${word.word.length} letters`}
          </p>

          <div className={`scramble-answer${shake ? ' wrong' : ''}`} aria-live="polite">
            {picked.length === 0 ? (
              <span className="placeholder">Tap the letters below to build the word</span>
            ) : (
              picked.map((id, position) => (
                <button
                  key={`${id}-${position}`}
                  className="letter-tile placed"
                  onClick={() => setPicked((current) => current.filter((_, pos) => pos !== position))}
                  aria-label={`Remove ${letterOf(id)}`}
                >
                  {letterOf(id)}
                </button>
              ))
            )}
          </div>

          <div className="tile-row">
            {tiles.map((tile) => (
              <button
                key={tile.id}
                className={`letter-tile${picked.includes(tile.id) ? ' used' : ''}`}
                onClick={() => addTile(tile)}
                disabled={picked.includes(tile.id)}
              >
                {tile.letter}
              </button>
            ))}
          </div>

          <div className="scramble-toolbar">
            <button className="btn sm ghost" onClick={() => setPicked([])} disabled={!picked.length}>
              🧹 Clear
            </button>
            <button className="btn sm ghost" onClick={() => setShowHint((value) => !value)}>
              💡 {showHint ? 'Hide' : 'Show'} respelling
            </button>
            <button className="btn sm ghost" onClick={() => speak(word.word)}>
              🔊 Hear it
            </button>
          </div>

          <p className="game-note" style={{ minHeight: '1.4rem', fontWeight: 700 }}>
            {answer && picked.length === word.word.length ? message : message}
          </p>
          {mistakes > 0 && (
            <p className="game-note">
              {mistakes} mix-up{mistakes === 1 ? '' : 's'} — keep going, you can try as many times as
              you like.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
