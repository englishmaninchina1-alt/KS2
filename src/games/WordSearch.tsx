import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Category, Word } from '../data/vocabulary';
import { playCorrect, playWin, playWrong } from '../lib/sound';
import { speak } from '../lib/speech';
import { shuffle, uniqueBy } from '../lib/utils';
import { useProgress } from '../lib/progress';
import type { GameMeta } from './registry';
import { GameTop, ResultPanel } from './shared';

const SIZE = 12;
const TARGET_WORDS = 10;

type Placement = { word: string; path: number[] };
type Puzzle = { grid: string[][]; placements: Placement[] };
type Outcome = { correct: number; total: number; stars: number; percent: number };

const DIRECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [-1, 1],
];

function emptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array<string>(size).fill(''));
}

function tryPlace(grid: string[][], letters: string[], size: number): number[] | null {
  for (let attempt = 0; attempt < 160; attempt++) {
    const [dr, dc] = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * size);
    const endRow = row + dr * (letters.length - 1);
    const endCol = col + dc * (letters.length - 1);
    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

    let fits = true;
    for (let step = 0; step < letters.length; step++) {
      const existing = grid[row + dr * step][col + dc * step];
      if (existing && existing !== letters[step]) {
        fits = false;
        break;
      }
    }
    if (!fits) continue;

    const path: number[] = [];
    for (let step = 0; step < letters.length; step++) {
      const r = row + dr * step;
      const c = col + dc * step;
      grid[r][c] = letters[step];
      path.push(r * size + c);
    }
    return path;
  }
  return null;
}

function buildPuzzle(words: Word[], size: number): Puzzle {
  const pool = uniqueBy(
    words.filter((word) => /^[a-zA-Z]{4,11}$/.test(word.word)),
    (word) => word.word.toLowerCase(),
  );

  let best: Puzzle = { grid: emptyGrid(size), placements: [] };

  for (let attempt = 0; attempt < 45; attempt++) {
    const grid = emptyGrid(size);
    const placements: Placement[] = [];
    for (const candidate of shuffle(pool)) {
      const letters = candidate.word.toUpperCase().split('');
      const path = tryPlace(grid, letters, size);
      if (path) placements.push({ word: candidate.word, path });
      if (placements.length >= TARGET_WORDS) break;
    }
    if (placements.length > best.placements.length) {
      best = { grid, placements };
    }
    if (best.placements.length >= Math.min(TARGET_WORDS, pool.length)) break;
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!best.grid[row][col]) {
        best.grid[row][col] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }
  return best;
}

function linePath(a: number, b: number, size: number): number[] | null {
  const rowA = Math.floor(a / size);
  const colA = a % size;
  const rowB = Math.floor(b / size);
  const colB = b % size;
  const rowDiff = rowB - rowA;
  const colDiff = colB - colA;

  if (rowDiff !== 0 && colDiff !== 0 && Math.abs(rowDiff) !== Math.abs(colDiff)) {
    return null;
  }

  const stepRow = Math.sign(rowDiff);
  const stepCol = Math.sign(colDiff);
  const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
  const path: number[] = [];
  for (let step = 0; step <= length; step++) {
    path.push((rowA + stepRow * step) * size + (colA + stepCol * step));
  }
  return path;
}

export default function WordSearch({ category, game }: { category: Category; game: GameMeta }) {
  const { addStars, recordGame } = useProgress();
  const [round, setRound] = useState(0);
  const puzzle = useMemo(() => buildPuzzle(category.words, SIZE), [category, round]);

  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const wrongRef = useRef(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const placementByWord = useMemo(() => {
    const map = new Map<string, Placement>();
    puzzle.placements.forEach((placement) => map.set(placement.word, placement));
    return map;
  }, [puzzle]);

  const foundCells = useMemo(() => {
    const cells = new Set<number>();
    found.forEach((word) => {
      placementByWord.get(word)?.path.forEach((cell) => cells.add(cell));
    });
    return cells;
  }, [found, placementByWord]);

  const activePath = start !== null && cursor !== null ? linePath(start, cursor, SIZE) : null;
  const activeCells = new Set<number>(activePath ?? (start !== null ? [start] : []));

  const reset = () => {
    setFound([]);
    setWrong(0);
    wrongRef.current = 0;
    setStart(null);
    setCursor(null);
    setOutcome(null);
    setRound((value) => value + 1);
  };

  const finish = (totalFound: number) => {
    const stars = wrongRef.current <= 2 ? 3 : wrongRef.current <= 6 ? 2 : 1;
    const percent = 100;
    addStars(category.id, stars);
    recordGame(game.id, percent);
    playWin();
    setOutcome({ correct: totalFound, total: puzzle.placements.length, stars, percent });
  };

  const checkWord = (path: number[]) => {
    const text = path
      .map((cell) => puzzle.grid[Math.floor(cell / SIZE)][cell % SIZE])
      .join('');
    const reversed = text.split('').reverse().join('');

    const placement = puzzle.placements.find(
      (item) =>
        !found.includes(item.word) &&
        (item.word.toUpperCase() === text || item.word.toUpperCase() === reversed),
    );

    if (!placement) {
      wrongRef.current += 1;
      setWrong(wrongRef.current);
      playWrong();
      return;
    }

    const nextFound = [...found, placement.word];
    setFound(nextFound);
    playCorrect();
    speak(placement.word, { rate: 0.92 });

    if (nextFound.length === puzzle.placements.length) {
      finish(nextFound.length);
    }
  };

  const indexAt = (event: ReactPointerEvent<HTMLDivElement>): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cellWidth = rect.width / SIZE;
    const cellHeight = rect.height / SIZE;
    const col = Math.floor((event.clientX - rect.left) / cellWidth);
    const row = Math.floor((event.clientY - rect.top) / cellHeight);
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null;
    return row * SIZE + col;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (outcome) return;
    const index = indexAt(event);
    if (index === null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setStart(index);
    setCursor(index);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (start === null || outcome) return;
    const index = indexAt(event);
    if (index !== null) setCursor(index);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (start === null) return;
    const index = indexAt(event) ?? cursor;
    const path = index !== null ? linePath(start, index, SIZE) : null;
    if (path && path.length >= 4) checkWord(path);
    setStart(null);
    setCursor(null);
  };

  return (
    <div className="container game-page fade-up">
      <GameTop
        game={game}
        category={category}
        right={
          <span className="game-hud">
            Found {found.length} / {puzzle.placements.length}
          </span>
        }
      />

      {outcome ? (
        <ResultPanel
          correct={outcome.correct}
          total={outcome.total}
          stars={outcome.stars}
          percent={outcome.percent}
          onAgain={reset}
          categoryId={category.id}
          message={`You found every hidden word. ${wrong === 0 ? 'Perfect hunting — not a single wrong swipe!' : `Only ${wrong} wrong swipe${wrong === 1 ? '' : 's'}.`}`}
        />
      ) : (
        <div className="game-stage">
          <div className="game-stage-head">
            <div>
              <h2>Find all {puzzle.placements.length} hidden words</h2>
              <p className="meaning">
                Drag across the letters in a straight line — across, down or diagonally. Words can
                run backwards too.
              </p>
            </div>
            <button className="btn sm ghost" onClick={reset}>
              🔄 New puzzle
            </button>
          </div>

          <div className="ws-wrap">
            <div className="ws-board">
              <div
                className="ws-grid"
                style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => {
                  setStart(null);
                  setCursor(null);
                }}
                role="application"
                aria-label="Word search grid. Drag across letters to select a word."
              >
                {puzzle.grid.flatMap((row, rowIndex) =>
                  row.map((letter, colIndex) => {
                    const index = rowIndex * SIZE + colIndex;
                    const classes = [
                      'ws-cell',
                      activeCells.has(index) ? 'selected' : '',
                      foundCells.has(index) ? 'found' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <div key={index} className={classes}>
                        {letter}
                      </div>
                    );
                  }),
                )}
              </div>
              <p className="ws-hint">
                {wrong > 0
                  ? `Oops — ${wrong} swipe${wrong === 1 ? '' : 's'} didn’t find a word. Keep going!`
                  : 'Tip: start on the first letter and drag to the last.'}
              </p>
            </div>

            <div className="ws-list">
              <h3>Word list</h3>
              {puzzle.placements.map((placement) => {
                const isFound = found.includes(placement.word);
                return (
                  <button
                    key={placement.word}
                    className={`ws-word${isFound ? ' found' : ''}`}
                    style={{ border: 0, cursor: 'pointer', width: '100%', textAlign: 'left' }}
                    onClick={() => speak(placement.word)}
                    title={`Hear ${placement.word}`}
                  >
                    <span>{placement.word}</span>
                    <span className="tick" aria-hidden="true">
                      {isFound ? '✓' : '🔊'}
                    </span>
                  </button>
                );
              })}
              <p className="ws-legend">
                {category.emoji} {category.name} · {category.words.length} words in this world.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
