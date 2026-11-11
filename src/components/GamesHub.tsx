import { useState } from 'react';
import { categories } from '../data/vocabulary';
import { GAMES } from '../games/registry';
import { useProgress } from '../lib/progress';

export default function GamesHub() {
  const { state } = useProgress();
  const [categoryId, setCategoryId] = useState('all');

  return (
    <div className="container fade-up">
      <div className="page-head">
        <div className="crumbs">
          <a href="#/">Home</a>
          <span aria-hidden="true">›</span>
          <span>Games</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>The games arcade 🎮</h1>
        <p className="meaning" style={{ marginTop: '0.5rem', maxWidth: '62ch' }}>
          Choose a word world, then pick a game. Every game teaches the same 50 words in a
          different way, so you can play them again and again.
        </p>

        <div className="word-toolbar" style={{ marginTop: '1.2rem' }}>
          <label className="search" style={{ maxWidth: 360 }}>
            <span aria-hidden="true">🌍</span>
            <span className="sr-only">Choose a word world</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              style={{ border: 0, background: 'transparent', width: '100%', fontWeight: 700 }}
            >
              <option value="all">All 500 words · mixed</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name} ({category.words.length})
                </option>
              ))}
            </select>
          </label>
          <span className="pill">
            {categoryId === 'all'
              ? '500 words in play'
              : `${categories.find((category) => category.id === categoryId)?.words.length ?? 0} words in play`}
          </span>
        </div>
      </div>

      <div className="game-grid">
        {GAMES.map((game) => {
          const best = state.best[game.id];
          const href = game.id === 'say-it' ? `#/studio/${categoryId}` : `#/game/${game.id}/${categoryId}`;
          return (
            <a key={game.id} className="game-card" href={href}>
              {typeof best === 'number' && best > 0 && <span className="g-best">Best {best}%</span>}
              <span className="g-emoji" aria-hidden="true">
                {game.emoji}
              </span>
              <span className="g-name">{game.name}</span>
              <span className="g-desc">{game.description}</span>
              <span className="g-tag">{game.tag}</span>
            </a>
          );
        })}
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
              Not sure where to start?
            </h2>
          </div>
        </div>
        <div className="steps">
          <a className="step" href="#/game/word-search/all" style={{ textDecoration: 'none' }}>
            <span className="num">🔎</span>
            <h3>Warm up with a word search</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Find ten hidden words. Great for spotting letter patterns.
            </p>
          </a>
          <a className="step" href="#/game/listen/all" style={{ textDecoration: 'none' }}>
            <span className="num">🎧</span>
            <h3>Train your ears</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Listen to a word and choose how it is spelled.
            </p>
          </a>
          <a className="step" href="#/studio/animals" style={{ textDecoration: 'none' }}>
            <span className="num">🎙️</span>
            <h3>Record yourself</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Hear the word, copy the beat and play your voice back.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
