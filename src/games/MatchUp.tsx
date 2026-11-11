import { useMemo, useState } from 'react';
import type { Category, Word } from '../data/vocabulary';
import { playCorrect, playPop, playWin, playWrong } from '../lib/sound';
import { speak } from '../lib/speech';
import { shuffle } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { Dots, GameTop, ResultPanel } from './shared';

const PAIRS = 4;
const ROUNDS = 3;

type Outcome = { correct: number; total: number; stars: number; percent: number };

export default function MatchUp({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);

  const rounds = useMemo(() => {
    const pool = shuffle(category.words);
    const built: Word[][] = [];
    for (let index = 0; index < ROUNDS; index++) {
      const slice = pool.slice(index * PAIRS, (index + 1) * PAIRS);
      if (slice.length === PAIRS) built.push(slice);
    }
    return built;
  }, [category, round]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const current = rounds[roundIndex] ?? [];
  const wordsShuffled = useMemo(() => shuffle(current), [current]);
  const meaningsShuffled = useMemo(() => shuffle(current), [current]);

  const finish = () => {
    const percent = Math.max(25, 100 - mistakes * 8);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : 1;
    addStars(category.id, stars);
    recordGame(game.id, percent);
    playWin();
    setOutcome({ correct: PAIRS * rounds.length, total: PAIRS * rounds.length, stars, percent });
  };

  const handleMeaning = (word: Word) => {
    if (!selected || matched.includes(word.id) || outcome) return;

    if (selected === word.id) {
      playCorrect();
      speak(word.word, { rate: 0.92 });
      const nextMatched = [...matched, word.id];
      setMatched(nextMatched);
      setSelected(null);

      if (nextMatched.length === current.length) {
        if (roundIndex + 1 >= rounds.length) {
          window.setTimeout(finish, 650);
        } else {
          window.setTimeout(() => {
            setRoundIndex((value) => value + 1);
            setMatched([]);
            setSelected(null);
          }, 750);
        }
      }
      return;
    }

    playWrong();
    setMistakes((value) => value + 1);
    setWrongId(word.id);
    window.setTimeout(() => setWrongId(null), 500);
  };

  const restart = () => {
    setRound((value) => value + 1);
    setRoundIndex(0);
    setSelected(null);
    setMatched([]);
    setWrongId(null);
    setMistakes(0);
    setOutcome(null);
  };

  const totalMatched = roundIndex * PAIRS + matched.length;

  return (
    <div className="container game-page fade-up">
      <GameTop
        game={game}
        category={category}
        right={
          <span className="game-hud">
            Matched {totalMatched} / {rounds.length * PAIRS}
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
          message={
            mistakes === 0
              ? 'Every pair right first time. Amazing memory!'
              : `You sorted ${rounds.length * PAIRS} pairs with ${mistakes} wrong tr${mistakes === 1 ? 'y' : 'ies'}.`
          }
        />
      ) : (
        <div className="game-stage">
          <div className="game-stage-head">
            <div>
              <h2>Match each word to its meaning</h2>
              <p className="meaning">Tap a word on the left, then tap the meaning that matches it.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
              <Dots total={rounds.length} current={roundIndex} />
              <span className="pill">
                Round {roundIndex + 1} of {rounds.length}
              </span>
            </div>
          </div>

          <div className="match-board">
            <div className="match-col">
              <span className="match-label">Words</span>
              {wordsShuffled.map((word) => {
                const isMatched = matched.includes(word.id);
                return (
                  <button
                    key={word.id}
                    className={`match-item${selected === word.id ? ' selected' : ''}${isMatched ? ' matched' : ''}`}
                    onClick={() => {
                      if (isMatched) return;
                      setSelected(word.id);
                      playPop();
                      speak(word.word, { rate: 0.95 });
                    }}
                    disabled={isMatched}
                  >
                    <strong style={{ fontFamily: 'var(--font-head)', fontSize: '1.05rem' }}>
                      {word.word}
                    </strong>
                    <div className="respell" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      {word.respell}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="match-col">
              <span className="match-label">Meanings</span>
              {meaningsShuffled.map((word) => {
                const isMatched = matched.includes(word.id);
                return (
                  <button
                    key={word.id}
                    className={`match-item${isMatched ? ' matched' : ''}${wrongId === word.id ? ' wrong' : ''}`}
                    onClick={() => handleMeaning(word)}
                    disabled={isMatched}
                  >
                    {word.meaning}
                  </button>
                );
              })}
            </div>
          </div>

          {selected === null && matched.length === 0 && (
            <p className="game-note">Start by picking any word on the left.</p>
          )}
          {mistakes > 0 && (
            <p className="game-note">
              {mistakes} wrong tr{mistakes === 1 ? 'y' : 'ies'} so far. Read the respelling to help
              you remember the sounds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
