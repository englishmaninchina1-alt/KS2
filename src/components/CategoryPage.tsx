import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { getCategory } from '../data/vocabulary';
import { GAMES } from '../games/registry';
import { useProgress } from '../lib/progress';
import { speak } from '../lib/speech';

type Tab = 'words' | 'cards';

export default function CategoryPage({ categoryId }: { categoryId: string }) {
  const category = getCategory(categoryId);
  const { state, toggleKnown } = useProgress();
  const [tab, setTab] = useState<Tab>('words');
  const [query, setQuery] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const filtered = useMemo(() => {
    if (!category) return [];
    const term = query.trim().toLowerCase();
    if (!term) return category.words;
    return category.words.filter(
      (word) =>
        word.word.toLowerCase().includes(term) ||
        word.meaning.toLowerCase().includes(term) ||
        word.respell.toLowerCase().includes(term),
    );
  }, [category, query]);

  if (!category) {
    return (
      <div className="container page-head">
        <h1>Word world not found</h1>
        <p className="meaning" style={{ marginTop: '0.5rem' }}>
          That world is not on the map yet.
        </p>
        <p style={{ marginTop: '1rem' }}>
          <a className="btn primary" href="#/games">
            See all games
          </a>
        </p>
      </div>
    );
  }

  const knownInCategory = category.words.filter((word) => state.known.includes(word.id)).length;
  const card = category.words[Math.min(cardIndex, category.words.length - 1)];
  const isKnown = state.known.includes(card.id);

  const goCard = (delta: number) => {
    setFlipped(false);
    setCardIndex((current) => {
      const next = current + delta;
      if (next < 0) return category.words.length - 1;
      if (next >= category.words.length) return 0;
      return next;
    });
  };

  const colorVars = {
    ['--from' as string]: category.from,
    ['--to' as string]: category.to,
  } as CSSProperties;

  return (
    <div className="container fade-up">
      <div className="page-head">
        <div className="crumbs">
          <a href="#/">Home</a>
          <span aria-hidden="true">›</span>
          <a href="#/games">Word worlds</a>
          <span aria-hidden="true">›</span>
          <span>{category.name}</span>
        </div>

        <div className="cat-hero" style={colorVars}>
          <div className="cat-hero-inner">
            <span className="cat-hero-emoji" aria-hidden="true">
              {category.emoji}
            </span>
            <div>
              <h1>{category.name}</h1>
              <p>{category.blurb}</p>
              <div className="cat-meta" style={{ marginTop: '0.5rem' }}>
                <span>{category.words.length} words</span>
                <span>·</span>
                <span>{knownInCategory} learned</span>
                <span>·</span>
                <span>⭐ {state.stars[category.id] ?? 0}</span>
              </div>
            </div>
            <div className="cat-hero-actions">
              <button className="btn primary" onClick={() => setTab('cards')}>
                🃏 Flashcards
              </button>
              <a className="btn ghost" href={`#/studio/${category.id}`}>
                🎙️ Say it
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="Category views">
        <button
          className={`tab${tab === 'words' ? ' active' : ''}`}
          role="tab"
          aria-selected={tab === 'words'}
          onClick={() => setTab('words')}
        >
          Word list
        </button>
        <button
          className={`tab${tab === 'cards' ? ' active' : ''}`}
          role="tab"
          aria-selected={tab === 'cards'}
          onClick={() => setTab('cards')}
        >
          Flashcards
        </button>
      </div>

      {tab === 'words' && (
        <>
          <div className="word-toolbar">
            <label className="search">
              <span aria-hidden="true">🔍</span>
              <span className="sr-only">Search words</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search the ${category.words.length} words…`}
                type="search"
              />
            </label>
            <span className="pill">{filtered.length} showing</span>
          </div>

          <div className="word-grid">
            {filtered.map((word) => {
              const known = state.known.includes(word.id);
              return (
                <article key={word.id} className={`word-card${known ? ' known' : ''}`}>
                  <div className="word-top">
                    <div>
                      <h3 className="word-title">{word.word}</h3>
                      <p className="respell">{word.respell}</p>
                    </div>
                    <div className="word-actions">
                      <button
                        className="mini-btn"
                        onClick={() => speak(word.word)}
                        aria-label={`Hear ${word.word}`}
                        title={`Hear ${word.word}`}
                      >
                        🔊
                      </button>
                      <button
                        className={`mini-btn${known ? ' active' : ''}`}
                        onClick={() => toggleKnown(word.id)}
                        aria-pressed={known}
                        aria-label={known ? `Mark ${word.word} as still learning` : `Mark ${word.word} as learned`}
                        title={known ? 'Learned!' : 'I know this word'}
                      >
                        {known ? '⭐' : '☆'}
                      </button>
                    </div>
                  </div>
                  <p className="meaning">{word.meaning}</p>
                  <p className="example">“{word.example}”</p>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="meaning" style={{ padding: '2rem 0' }}>
              No words match “{query}”. Try another spelling.
            </p>
          )}

          <section className="section">
            <div className="section-head">
              <div>
                <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
                  Play with these words
                </h2>
                <p className="section-sub">Games start straight away with {category.name} vocabulary.</p>
              </div>
            </div>
            <div className="game-grid">
              {GAMES.filter((game) => game.id !== 'say-it').map((game) => (
                <a key={game.id} className="game-card" href={`#/game/${game.id}/${category.id}`}>
                  <span className="g-emoji" aria-hidden="true">
                    {game.emoji}
                  </span>
                  <span className="g-name">{game.name}</span>
                  <span className="g-desc">{game.tagline}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'cards' && card && (
        <div className="flash-wrap">
          <p className="flash-count">
            Card {cardIndex + 1} of {category.words.length} · ⭐ {knownInCategory} learned
          </p>

          <div
            className={`flashcard${flipped ? ' flipped' : ''}`}
            onClick={() => setFlipped((value) => !value)}
            role="button"
            tabIndex={0}
            aria-label={`Flashcard for ${card.word}. Activate to ${flipped ? 'see the word' : 'see the meaning'}.`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setFlipped((value) => !value);
              }
            }}
          >
            <div className="flash-inner">
              <div className="flash-face" style={colorVars}>
                <span className="flash-hint">Tap to flip</span>
                <span className="flash-word">{card.word}</span>
                <span className="flash-respell">{card.respell}</span>
                <span className="meaning" style={{ maxWidth: '34ch' }}>
                  {card.meaning}
                </span>
                <span className="pill">{category.name}</span>
              </div>
              <div className="flash-face flash-back" style={colorVars}>
                <span className="flash-hint">Example sentence</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.45 }}>
                  “{card.example}”
                </span>
                <span className="meaning">{card.meaning}</span>
                <span className="flash-respell">{card.respell}</span>
              </div>
            </div>
          </div>

          <div className="flash-controls">
            <button className="btn ghost" onClick={() => goCard(-1)} aria-label="Previous card">
              ← Back
            </button>
            <button className="icon-btn" onClick={() => speak(card.word)} aria-label={`Hear ${card.word}`}>
              🔊
            </button>
            <button
              className={`icon-btn${isKnown ? ' speaking' : ''}`}
              onClick={() => toggleKnown(card.id)}
              aria-pressed={isKnown}
              aria-label={isKnown ? 'Mark as still learning' : 'Mark as learned'}
            >
              {isKnown ? '⭐' : '☆'}
            </button>
            <button className="btn primary" onClick={() => goCard(1)}>
              Next card →
            </button>
          </div>

          <p className="meaning" style={{ fontSize: '0.85rem', textAlign: 'center' }}>
            💡 Say the word out loud before you flip the card. Then check the example sentence.
          </p>
          <a className="btn sun" href={`#/studio/${category.id}`}>
            🎙️ Practise saying these words
          </a>
        </div>
      )}
    </div>
  );
}
