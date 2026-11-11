import { categories, allWords } from '../data/vocabulary';
import { GAMES } from '../games/registry';
import { useProgress } from '../lib/progress';

export default function ProgressPage() {
  const { state, totalStars, streak, reset } = useProgress();

  const known = state.known.length;
  const totalPlays = Object.values(state.plays).reduce((sum, value) => sum + value, 0);
  const bestValues = Object.values(state.best);
  const bestScore = bestValues.length ? Math.max(...bestValues) : 0;

  const badges = [
    { emoji: '🌱', name: 'First Steps', desc: 'Play your first game', earned: totalPlays >= 1 },
    { emoji: '📚', name: 'Word Collector', desc: 'Mark 25 words as learned', earned: known >= 25 },
    { emoji: '🚀', name: 'Word Explorer', desc: 'Mark 100 words as learned', earned: known >= 100 },
    { emoji: '⭐', name: 'Star Collector', desc: 'Earn 15 stars', earned: totalStars >= 15 },
    { emoji: '🏆', name: 'Game Champion', desc: 'Score 100% in any game', earned: bestScore >= 100 },
    { emoji: '🔥', name: 'On a Roll', desc: 'Practise 3 days in a row', earned: streak >= 3 },
  ];

  return (
    <div className="container fade-up">
      <div className="page-head">
        <div className="crumbs">
          <a href="#/">Home</a>
          <span aria-hidden="true">›</span>
          <span>My progress</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>My word treasure 🏆</h1>
        <p className="meaning" style={{ marginTop: '0.4rem' }}>
          Saved on this device. Play a little every day and watch your collection grow.
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="label">Stars</span>
          <span className="value">⭐ {totalStars}</span>
        </div>
        <div className="stat">
          <span className="label">Words learned</span>
          <span className="value">
            {known}
            <span style={{ fontSize: '0.95rem', color: 'var(--ink-soft)' }}> / {allWords.length}</span>
          </span>
        </div>
        <div className="stat">
          <span className="label">Games played</span>
          <span className="value">{totalPlays}</span>
        </div>
        <div className="stat">
          <span className="label">Day streak</span>
          <span className="value">🔥 {streak}</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: '1.6rem' }}>
              Word worlds
            </h2>
            <p className="section-sub">Tick words with ☆ on a word card to fill these bars.</p>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem 1.3rem' }}>
          {categories.map((category) => {
            const learned = category.words.filter((word) => state.known.includes(word.id)).length;
            const percent = Math.round((learned / category.words.length) * 100);
            return (
              <div className="progress-row" key={category.id}>
                <a className="name" href={`#/category/${category.id}`} style={{ textDecoration: 'none' }}>
                  {category.emoji} {category.name}
                </a>
                <span className="meaning" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {learned} / {category.words.length} · ⭐ {state.stars[category.id] ?? 0}
                </span>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: '1.6rem' }}>
              Game records
            </h2>
            <p className="section-sub">Your best score in each game, out of 100%.</p>
          </div>
        </div>

        <div className="stat-grid">
          {GAMES.map((game) => (
            <div className="stat" key={game.id}>
              <span className="label">
                {game.emoji} {game.name}
              </span>
              <span className="value">
                {state.best[game.id] ? `${state.best[game.id]}%` : '—'}
              </span>
              <span className="meaning" style={{ fontSize: '0.78rem' }}>
                {state.plays[game.id] ?? 0} plays
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: '1.6rem' }}>
              Badges
            </h2>
            <p className="section-sub">Can you collect them all?</p>
          </div>
        </div>

        <div className="badge-grid">
          {badges.map((badge) => (
            <div key={badge.name} className={`badge${badge.earned ? ' earned' : ''}`}>
              <div className="b-emoji" aria-hidden="true">
                {badge.emoji}
              </div>
              <div className="b-name">{badge.name}</div>
              <div className="b-desc">{badge.desc}</div>
              <div className="b-desc" style={{ marginTop: '0.35rem', fontWeight: 800 }}>
                {badge.earned ? 'Earned!' : 'Locked'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ padding: '1.2rem 1.4rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Start fresh</h3>
          <p className="meaning" style={{ fontSize: '0.88rem', marginTop: '0.3rem' }}>
            This clears the stars, learned words and scores saved in this browser.
          </p>
          <button
            className="btn ghost"
            style={{ marginTop: '0.8rem' }}
            onClick={() => {
              if (window.confirm('Clear all progress on this device?')) reset();
            }}
          >
            Reset my progress
          </button>
        </div>
      </section>
    </div>
  );
}
