import { useEffect, useMemo, useState } from 'react';
import type { Category, Word } from '../data/vocabulary';
import { playCorrect, playWin, playWrong } from '../lib/sound';
import { speak, speechSupported } from '../lib/speech';
import { sample, shuffle, uniqueBy } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { Dots, GameTop, ResultPanel } from './shared';

const ROUNDS = 10;

type Question = { word: Word; options: Word[] };
type Outcome = { correct: number; total: number; stars: number; percent: number };

function buildQuestions(category: Category, count: number): Question[] {
  const pool = sample(uniqueBy(category.words, (word) => word.word.toLowerCase()), count);
  const questions: Question[] = [];

  for (const word of pool) {
    const distractors = sample(
      uniqueBy(
        category.words.filter(
          (item) =>
            item.id !== word.id && item.word.toLowerCase() !== word.word.toLowerCase(),
        ),
        (item) => item.word.toLowerCase(),
      ),
      3,
    );
    if (distractors.length < 3) continue;
    questions.push({ word, options: shuffle([word, ...distractors]) });
  }
  return questions;
}

export default function Listen({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildQuestions(category, ROUNDS), [category, round]);

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Word | null>(null);
  const [correct, setCorrect] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [playing, setPlaying] = useState(false);

  const current = questions[Math.min(index, questions.length - 1)];
  const supported = speechSupported();

  useEffect(() => {
    if (!current || outcome || chosen) return;
    const timer = window.setTimeout(() => {
      setPlaying(true);
      speak(current.word.word, { rate: 0.78, onEnd: () => setPlaying(false) });
    }, 420);
    return () => window.clearTimeout(timer);
  }, [current, outcome, chosen]);

  const play = (slow = false) => {
    if (!current) return;
    setPlaying(true);
    speak(current.word.word, {
      rate: slow ? 0.48 : 0.78,
      onEnd: () => setPlaying(false),
    });
  };

  const answer = (option: Word) => {
    if (chosen) return;
    setChosen(option);
    if (option.id === current.word.id) {
      playCorrect();
      setCorrect((value) => value + 1);
    } else {
      playWrong();
    }
  };

  const finish = (score: number) => {
    const percent = Math.round((score / questions.length) * 100);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0;
    addStars(category.id, stars);
    recordGame(game.id, percent);
    if (stars >= 2) playWin();
    setOutcome({ correct: score, total: questions.length, stars, percent });
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      finish(correct);
      return;
    }
    setIndex((value) => value + 1);
    setChosen(null);
  };

  const restart = () => {
    setRound((value) => value + 1);
    setIndex(0);
    setChosen(null);
    setCorrect(0);
    setOutcome(null);
    setPlaying(false);
  };

  if (!current) {
    return (
      <div className="container game-page">
        <GameTop game={game} category={category} />
        <p className="meaning">Not enough words for this game yet.</p>
      </div>
    );
  }

  const wasRight = chosen?.id === current.word.id;

  return (
    <div className="container game-page fade-up">
      <GameTop
        game={game}
        category={category}
        right={
          <span className="game-hud">
            ✅ {correct} / {questions.length}
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
          message="Hearing a word again and again builds your English ear."
        />
      ) : (
        <div className="game-stage spell-stage">
          <div className="game-stage-head" style={{ justifyContent: 'space-between' }}>
            <Dots total={questions.length} current={index} />
            <span className="pill">
              Question {index + 1} of {questions.length}
            </span>
          </div>

          <div className="spell-hero">
            <button
              className={`listen-big${playing ? ' playing' : ''}`}
              onClick={() => play(false)}
              aria-label="Replay the word"
            >
              🎧
            </button>
            <h2>Which word did you hear?</h2>
            <p className="meaning">Listen carefully, then choose the matching spelling.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn sm ghost" onClick={() => play(false)}>
                🔁 Replay
              </button>
              <button className="btn sm ghost" onClick={() => play(true)}>
                🐢 Slowly
              </button>
            </div>
          </div>

          {!supported && (
            <p className="game-note" style={{ marginBottom: '0.8rem' }}>
              Audio isn’t available here, so the answer is shown below in the respelling.
            </p>
          )}

          <div className="option-list">
            {current.options.map((option, position) => {
              const isChosen = chosen?.id === option.id;
              const isAnswer = option.id === current.word.id;
              const classes = [
                'option-btn',
                chosen && isChosen && isAnswer ? 'correct' : '',
                chosen && isChosen && !isAnswer ? 'wrong' : '',
                chosen && !isChosen && isAnswer ? 'correct' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={option.id}
                  className={classes}
                  onClick={() => answer(option)}
                  disabled={Boolean(chosen)}
                >
                  <span className="option-letter">{'ABCD'[position]}</span>
                  <span>{option.word}</span>
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className={`feedback-banner ${wasRight ? 'good' : 'bad'}`}>
              <span aria-hidden="true">{wasRight ? '🎉' : '💡'}</span>
              <span>
                {wasRight ? 'Yes!' : `It was “${current.word.word}”.`}{' '}
                <span className="fb-word">{current.word.respell}</span> — {current.word.meaning}
              </span>
              <button
                className="btn sm ghost"
                style={{ marginLeft: 'auto' }}
                onClick={() => speak(current.word.word, { rate: 0.8 })}
              >
                🔊 Hear it
              </button>
              <button className="btn sm primary" onClick={next}>
                {index + 1 >= questions.length ? 'See my score' : 'Next →'}
              </button>
            </div>
          )}

          {!chosen && supported && (
            <p className="game-note">You can replay the word as many times as you like.</p>
          )}
        </div>
      )}
    </div>
  );
}
