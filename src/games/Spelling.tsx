import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../data/vocabulary';
import { playCorrect, playWin, playWrong } from '../lib/sound';
import { speak, speechSupported } from '../lib/speech';
import { sample } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { Dots, GameTop, ResultPanel } from './shared';

const ROUNDS = 8;

type Outcome = { correct: number; total: number; stars: number; percent: number };

export default function Spelling({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);
  const words = useMemo(
    () => sample(category.words.filter((word) => /^[a-zA-Z ]{3,}$/.test(word.word)), ROUNDS),
    [category, round],
  );

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [speakingWord, setSpeakingWord] = useState(false);

  const word = words[Math.min(index, words.length - 1)];

  useEffect(() => {
    if (outcome || revealed) return;
    const timer = window.setTimeout(() => speak(word.word), 350);
    return () => window.clearTimeout(timer);
  }, [index, word, outcome, revealed]);

  const play = (slow: boolean) => {
    setSpeakingWord(true);
    speak(word.word, {
      rate: slow ? 0.5 : 0.8,
      onEnd: () => setSpeakingWord(false),
    });
  };

  const finish = (score: number) => {
    const percent = Math.round((score / words.length) * 100);
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
    setInput('');
    setAttempts(0);
    setRevealed(false);
    setShowHint(false);
    setMessage(null);
  };

  const check = () => {
    if (outcome || revealed) return;
    const guess = input.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!guess) return;

    if (guess === word.word.toLowerCase()) {
      playCorrect();
      speak(word.word, { rate: 0.9 });
      const score = correct + 1;
      setCorrect(score);
      setMessage('Correct! 🎉');
      window.setTimeout(() => nextWord(score), 850);
      return;
    }

    playWrong();
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setInput('');
    if (nextAttempts >= 2) {
      setRevealed(true);
      setMessage('Nearly! Here is the correct spelling.');
    } else {
      setMessage('Not quite — listen again and check the respelling.');
      setShowHint(true);
    }
  };

  const restart = () => {
    setRound((value) => value + 1);
    setIndex(0);
    setInput('');
    setAttempts(0);
    setRevealed(false);
    setCorrect(0);
    setShowHint(false);
    setMessage(null);
    setOutcome(null);
  };

  const blanks = word.word
    .split('')
    .map((letter) => {
      if (letter === ' ') return '\u00A0\u00A0';
      if (revealed) return letter.toUpperCase();
      return '_';
    })
    .join(' ');

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
          message="Spelling gets easier every time you hear the word and say it out loud."
        />
      ) : (
        <div className="game-stage spell-stage">
          <div className="game-stage-head" style={{ justifyContent: 'space-between' }}>
            <Dots total={words.length} current={index} />
            <span className="pill">
              Word {index + 1} of {words.length}
            </span>
          </div>

          <div className="spell-hero">
            <button
              className={`listen-big${speakingWord ? ' playing' : ''}`}
              onClick={() => play(false)}
              aria-label={`Hear the word again`}
            >
              🔊
            </button>
            <h2>Listen and spell</h2>
            <p className="meaning" style={{ maxWidth: '48ch' }}>
              {word.meaning}
            </p>
            <button className="btn sm ghost" onClick={() => play(true)}>
              🐢 Say it slowly
            </button>
            {!speechSupported() && (
              <p className="game-note">
                Audio is not available in this browser, so here is a clue: it begins with{' '}
                <strong>{word.word.charAt(0).toUpperCase()}</strong>.
              </p>
            )}
          </div>

          {revealed && <p className="reveal-word">{word.word}</p>}
          <p className="blanks" aria-label={`The word has ${word.word.length} letters`}>
            {blanks}
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              check();
            }}
          >
            <input
              className="spell-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type the word"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Your spelling"
              disabled={revealed}
              autoFocus
            />
            <div className="spell-form-row">
              {!revealed ? (
                <>
                  <button className="btn primary" type="submit" disabled={!input.trim()}>
                    Check spelling
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => setShowHint((value) => !value)}
                  >
                    💡 {showHint ? 'Hide' : 'Show'} respelling
                  </button>
                </>
              ) : (
                <button className="btn primary" type="button" onClick={() => nextWord(correct)}>
                  Next word →
                </button>
              )}
            </div>
          </form>

          {showHint && !revealed && (
            <p className="respell" style={{ marginTop: '0.7rem' }}>
              {word.respell}
            </p>
          )}

          {attempts >= 1 && !revealed && (
            <p className="meaning" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Hint: it starts with <strong>{word.word.charAt(0).toUpperCase()}</strong> and has{' '}
              {word.word.replace(/\s/g, '').length} letters.
            </p>
          )}

          <p className={`spell-feedback${message?.startsWith('Correct') ? ' good' : message ? ' bad' : ''}`}>
            {message}
          </p>
          {attempts === 1 && !revealed && (
            <p className="game-note">
              One more try. Say the word out loud in the same rhythm as the respelling.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
