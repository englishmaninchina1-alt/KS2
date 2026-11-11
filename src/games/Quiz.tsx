import { useMemo, useState } from 'react';
import type { Category, Word } from '../data/vocabulary';
import { playCorrect, playWin, playWrong } from '../lib/sound';
import { speak } from '../lib/speech';
import { sample, shuffle, uniqueBy } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { Dots, GameTop, ResultPanel } from './shared';

const ROUNDS = 10;

type Question = {
  kind: 'meaning' | 'word' | 'respell' | 'sentence';
  prompt: string;
  sub?: string;
  options: string[];
  answer: string;
  explanation: string;
  word: Word;
};

type Outcome = { correct: number; total: number; stars: number; percent: number };

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildQuestions(category: Category, count: number): Question[] {
  const pool = sample(uniqueBy(category.words, (word) => word.word.toLowerCase()), count);
  const questions: Question[] = [];

  for (const word of pool) {
    const others = uniqueBy(
      category.words.filter((item) => item.id !== word.id),
      (item) => item.word.toLowerCase(),
    );
    if (others.length < 3) continue;

    const roll = Math.random();

    if (roll < 0.3) {
      const meanings = uniqueBy(
        sample(
          others.filter((item) => item.meaning !== word.meaning),
          3,
        ),
        (item) => item.meaning,
      ).map((item) => item.meaning);
      if (meanings.length < 3) continue;
      questions.push({
        kind: 'meaning',
        prompt: `What does “${word.word}” mean?`,
        options: shuffle([word.meaning, ...meanings]),
        answer: word.meaning,
        explanation: `${word.word} — ${word.respell}. ${word.meaning}`,
        word,
      });
      continue;
    }

    if (roll < 0.55) {
      const wordOptions = sample(others, 3).map((item) => item.word);
      questions.push({
        kind: 'word',
        prompt: 'Which word matches this meaning?',
        sub: word.meaning,
        options: shuffle([word.word, ...wordOptions]),
        answer: word.word,
        explanation: `“${word.example}”`,
        word,
      });
      continue;
    }

    if (roll < 0.78) {
      const respells = uniqueBy(sample(others, 3), (item) => item.respell).map(
        (item) => item.respell,
      );
      if (respells.length < 3) continue;
      questions.push({
        kind: 'respell',
        prompt: `Which respelling shows how to say “${word.word}”?`,
        options: shuffle([word.respell, ...respells]),
        answer: word.respell,
        explanation: `${word.word} → ${word.respell}. The CAPITAL letters are the loudest beat.`,
        word,
      });
      continue;
    }

    const pattern = new RegExp(`\\b${escapeRegex(word.word)}\\b`, 'i');
    if (pattern.test(word.example)) {
      const wordOptions = sample(others, 3).map((item) => item.word);
      questions.push({
        kind: 'sentence',
        prompt: 'Which word fills the gap?',
        sub: word.example.replace(pattern, '_____'),
        options: shuffle([word.word, ...wordOptions]),
        answer: word.word,
        explanation: `“${word.example}”`,
        word,
      });
      continue;
    }

    const meanings = sample(others, 3).map((item) => item.meaning);
    questions.push({
      kind: 'meaning',
      prompt: `What does “${word.word}” mean?`,
      options: shuffle([word.meaning, ...meanings]),
      answer: word.meaning,
      explanation: `${word.word} — ${word.respell}. ${word.meaning}`,
      word,
    });
  }

  return questions;
}

export default function Quiz({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);
  const questions = useMemo(() => buildQuestions(category, ROUNDS), [category, round]);

  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const question = questions[Math.min(index, questions.length - 1)];

  const finish = (score: number) => {
    const percent = Math.round((score / questions.length) * 100);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 40 ? 1 : 0;
    addStars(category.id, stars);
    recordGame(game.id, percent);
    if (stars >= 2) playWin();
    setOutcome({ correct: score, total: questions.length, stars, percent });
  };

  const answer = (option: string) => {
    if (chosen) return;
    setChosen(option);
    if (option === question.answer) {
      playCorrect();
      setCorrect((value) => value + 1);
    } else {
      playWrong();
    }
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
  };

  if (!question) {
    return (
      <div className="container game-page">
        <GameTop game={game} category={category} />
        <p className="meaning">Not enough words for this quiz yet.</p>
      </div>
    );
  }

  const isRight = chosen === question.answer;

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
          message="Read the clue carefully, then say the answer in your head before you tap."
        />
      ) : (
        <div className="game-stage">
          <div className="game-stage-head" style={{ justifyContent: 'space-between' }}>
            <Dots total={questions.length} current={index} />
            <span className="pill">
              Question {index + 1} of {questions.length}
            </span>
          </div>

          <div className="quiz-question">{question.prompt}</div>
          {question.sub && <p className="quiz-sub">“{question.sub}”</p>}

          <div className="option-list">
            {question.options.map((option, position) => {
              const isAnswer = option === question.answer;
              const classes = [
                'option-btn',
                chosen && isAnswer ? 'correct' : '',
                chosen && chosen === option && !isAnswer ? 'wrong' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={`${option}-${position}`}
                  className={classes}
                  onClick={() => answer(option)}
                  disabled={Boolean(chosen)}
                >
                  <span className="option-letter">{'ABCD'[position]}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {chosen && (
            <div className={`feedback-banner ${isRight ? 'good' : 'bad'}`}>
              <span aria-hidden="true">{isRight ? '🎉' : '💡'}</span>
              <span style={{ flex: 1, minWidth: '200px' }}>
                <strong>{isRight ? 'Correct. ' : 'Good try. '}</strong>
                {question.explanation}
              </span>
              <button
                className="btn sm ghost"
                onClick={() => speak(question.word.word, { rate: 0.8 })}
              >
                🔊
              </button>
              <button className="btn sm primary" onClick={next}>
                {index + 1 >= questions.length ? 'See my score' : 'Next →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
