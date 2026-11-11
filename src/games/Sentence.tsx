import { useMemo, useState } from 'react';
import type { Category } from '../data/vocabulary';
import { playCorrect, playWin, playWrong } from '../lib/sound';
import { speak } from '../lib/speech';
import { sample, shuffle } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { Dots, GameTop, ResultPanel } from './shared';

const ROUNDS = 6;

type Token = { id: number; text: string };
type Outcome = { correct: number; total: number; stars: number; percent: number };

export default function Sentence({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);

  const rounds = useMemo(
    () =>
      sample(
        category.words.filter((word) => {
          const parts = word.example.trim().split(/\s+/);
          return parts.length >= 4 && parts.length <= 12;
        }),
        ROUNDS,
      ),
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

  const word = rounds[Math.min(index, rounds.length - 1)];
  const tokens = useMemo<Token[]>(
    () =>
      word
        ? shuffle(word.example.split(' ').map((text, id) => ({ id, text })))
        : [],
    [word],
  );

  const textOf = (id: number): string => tokens.find((token) => token.id === id)?.text ?? '';
  const built = picked.map(textOf).join(' ');

  const finish = (score: number) => {
    const percent = Math.max(20, Math.round((score / rounds.length) * 100) - mistakes * 4);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0;
    addStars(category.id, stars);
    recordGame(game.id, percent);
    if (stars >= 2) playWin();
    setOutcome({ correct: score, total: rounds.length, stars, percent });
  };

  const nextSentence = (score: number) => {
    if (index + 1 >= rounds.length) {
      finish(score);
      return;
    }
    setIndex((value) => value + 1);
    setPicked([]);
    setShake(false);
    setMessage(null);
    setShowHint(false);
  };

  const addToken = (token: Token) => {
    if (!word || picked.includes(token.id) || outcome) return;
    const nextPicked = [...picked, token.id];
    setPicked(nextPicked);
    setMessage(null);

    if (nextPicked.length < tokens.length) return;

    const attempt = nextPicked.map((id) => tokens.find((item) => item.id === id)?.text ?? '').join(' ');
    if (attempt === word.example) {
      playCorrect();
      const score = correct + 1;
      setCorrect(score);
      speak(word.example, { rate: 0.82 });
      setMessage('That’s the sentence! 🎉');
      window.setTimeout(() => nextSentence(score), 1100);
    } else {
      playWrong();
      setMistakes((value) => value + 1);
      setShake(true);
      setMessage('The words are all there — try a different order.');
      window.setTimeout(() => {
        setPicked([]);
        setShake(false);
      }, 700);
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
        <p className="meaning">Not enough sentences for this game yet.</p>
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
            ✅ {correct} / {rounds.length}
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
          message="Read your finished sentence out loud — that is how grammar starts to feel natural."
        />
      ) : (
        <div className="game-stage">
          <div className="game-stage-head" style={{ justifyContent: 'space-between' }}>
            <Dots total={rounds.length} current={index} />
            <span className="pill">
              Sentence {index + 1} of {rounds.length}
            </span>
          </div>

          <h2 style={{ fontSize: '1.55rem' }}>Build the sentence</h2>
          <p className="meaning" style={{ marginTop: '0.35rem' }}>
            Tap the words in the right order. It uses <strong>{word.word}</strong> — {word.meaning}
          </p>

          <div className="sentence-slots">
            {picked.length === 0 ? (
              <span className="placeholder">Your sentence will appear here…</span>
            ) : (
              picked.map((id, position) => (
                <button
                  key={`${id}-${position}`}
                  className="word-token placed"
                  onClick={() => setPicked((current) => current.filter((_, pos) => pos !== position))}
                  aria-label={`Remove ${textOf(id)}`}
                >
                  {textOf(id)}
                </button>
              ))
            )}
          </div>

          <div className="tile-row" style={{ alignItems: 'flex-start' }}>
            {tokens.map((token) => (
              <button
                key={token.id}
                className={`word-token${picked.includes(token.id) ? ' used' : ''}`}
                onClick={() => addToken(token)}
                disabled={picked.includes(token.id)}
              >
                {token.text}
              </button>
            ))}
          </div>

          <div className="scramble-toolbar">
            <button className="btn sm ghost" onClick={() => setPicked([])} disabled={!picked.length}>
              🧹 Clear
            </button>
            <button className="btn sm ghost" onClick={() => setShowHint((value) => !value)}>
              💡 {showHint ? 'Hide' : 'Show'} first word
            </button>
            <button className="btn sm ghost" onClick={() => speak(word.example, { rate: 0.78 })}>
              🔊 Hear the sentence
            </button>
          </div>

          {showHint && (
            <p className="sentence-hint">
              The sentence starts with <strong>“{word.example.split(' ')[0]}”</strong> and has{' '}
              {tokens.length} words.
            </p>
          )}

          <p className="game-note" style={{ fontWeight: 700, minHeight: '1.4rem' }}>
            {message}
          </p>
          {mistakes > 0 && (
            <p className="game-note">
              {mistakes} wrong order{mistakes === 1 ? '' : 's'} so far. Read your sentence aloud to
              check it sounds right.
            </p>
          )}
          {built && (
            <p className="meaning" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
              Currently: “{built}”
            </p>
          )}
        </div>
      )}
    </div>
  );
}
