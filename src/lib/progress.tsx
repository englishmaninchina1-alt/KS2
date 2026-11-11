import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ProgressState = {
  stars: Record<string, number>;
  best: Record<string, number>;
  plays: Record<string, number>;
  known: string[];
  days: string[];
};

const STORAGE_KEY = 'wordwizards.progress.v2';

const emptyState: ProgressState = {
  stars: {},
  best: {},
  plays: {},
  known: [],
  days: [],
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): ProgressState {
  if (typeof window === 'undefined') return emptyState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      stars: parsed.stars ?? {},
      best: parsed.best ?? {},
      plays: parsed.plays ?? {},
      known: Array.isArray(parsed.known) ? parsed.known : [],
      days: Array.isArray(parsed.days) ? parsed.days : [],
    };
  } catch {
    return emptyState;
  }
}

function streakOf(days: string[]): number {
  if (!days.length) return 0;
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to start today or yesterday.
  if (!set.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type ProgressApi = {
  state: ProgressState;
  totalStars: number;
  streak: number;
  addStars: (categoryId: string, amount: number) => void;
  recordGame: (gameKey: string, score: number) => void;
  toggleKnown: (wordId: string) => void;
  isKnown: (wordId: string) => boolean;
  reset: () => void;
};

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProgressState>(() => load());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode); the app still works.
    }
  }, [state]);

  const addStars = useCallback((categoryId: string, amount: number) => {
    if (amount <= 0) return;
    setState((prev) => ({
      ...prev,
      stars: { ...prev.stars, [categoryId]: (prev.stars[categoryId] ?? 0) + amount },
      days: prev.days.includes(todayKey()) ? prev.days : [...prev.days, todayKey()],
    }));
  }, []);

  const recordGame = useCallback((gameKey: string, score: number) => {
    setState((prev) => ({
      ...prev,
      best: { ...prev.best, [gameKey]: Math.max(prev.best[gameKey] ?? 0, score) },
      plays: { ...prev.plays, [gameKey]: (prev.plays[gameKey] ?? 0) + 1 },
      days: prev.days.includes(todayKey()) ? prev.days : [...prev.days, todayKey()],
    }));
  }, []);

  const toggleKnown = useCallback((wordId: string) => {
    setState((prev) => ({
      ...prev,
      known: prev.known.includes(wordId)
        ? prev.known.filter((id) => id !== wordId)
        : [...prev.known, wordId],
      days: prev.days.includes(todayKey()) ? prev.days : [...prev.days, todayKey()],
    }));
  }, []);

  const reset = useCallback(() => {
    setState(emptyState);
  }, []);

  const totalStars = useMemo(
    () => Object.values(state.stars).reduce((sum, value) => sum + value, 0),
    [state.stars],
  );
  const streak = useMemo(() => streakOf(state.days), [state.days]);

  const api = useMemo<ProgressApi>(
    () => ({
      state,
      totalStars,
      streak,
      addStars,
      recordGame,
      toggleKnown,
      isKnown: (wordId: string) => state.known.includes(wordId),
      reset,
    }),
    [state, totalStars, streak, addStars, recordGame, toggleKnown, reset],
  );

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
