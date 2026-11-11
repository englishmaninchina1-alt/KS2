import type { CSSProperties } from 'react';
import { allWords, categories, TOTAL_WORDS, type Word } from '../data/vocabulary';
import { GAMES } from '../games/registry';
import { useProgress } from '../lib/progress';
import { speak } from '../lib/speech';

function findWord(word: string): Word | undefined {
  return allWords.find((entry) => entry.word === word);
}

const showcase = ['elephant', 'rainbow', 'football', 'curious']
  .map(findWord)
  .filter((word): word is Word => Boolean(word));

const showcasePositions = [
  { top: '4%', left: '0%', rotate: '-7deg' },
  { top: '0%', right: '2%', rotate: '6deg' },
  { bottom: '18%', left: '4%', rotate: '4deg' },
  { bottom: '0%', right: '4%', rotate: '-5deg' },
];

function wordOfTheDay(): Word {
  const day = Math.floor(Date.now() / 86_400_000);
  return allWords[day % allWords.length];
}

export default function Home() {
  const { state, totalStars } = useProgress();
  const daily = wordOfTheDay();
  const knownCount = state.known.length;

  return (
    <div className="container fade-up">
      <section className="hero">
        <div>
          <span className="pill">UK KS2 · Ages 7–11 · ESL</span>
          <h1 className="hero-title">
            Speak, spell and <span className="spark">play</span> your way to English.
          </h1>
          <p className="hero-sub">
            500 words across 10 word worlds, with audio, natural phonetic respelling, recordings and
            eight games. Listen to every word, say it out loud, then play until it sticks.
          </p>
          <div className="hero-actions">
            <a className="btn primary lg" href="#/category/animals">
              Start exploring
            </a>
            <a className="btn sun lg" href="#/games">
              🎮 Play a game
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="big">{TOTAL_WORDS}</span>
              <span className="small">Words to learn</span>
            </div>
            <div className="hero-stat">
              <span className="big">{categories.length}</span>
              <span className="small">Word worlds</span>
            </div>
            <div className="hero-stat">
              <span className="big">{GAMES.length}</span>
              <span className="small">Games &amp; studio</span>
            </div>
            <div className="hero-stat">
              <span className="big">{totalStars}</span>
              <span className="small">Stars collected</span>
            </div>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="hero-blob" />
          {showcase.map((word, index) => {
            const position = showcasePositions[index];
            return (
              <div
                key={word.id}
                className="float-card"
                style={
                  {
                    ...position,
                    ['--rot' as string]: position.rotate,
                    animationDelay: `${index * 0.4}s`,
                  } as CSSProperties
                }
              >
                <span className="fc-emoji">{word.emoji}</span>
                <span className="fc-word">{word.word}</span>
                <span className="fc-respell">{word.respell}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <a
          className="preply-cta"
          href="https://preply.com/en/?pref=MjA1MDc3OTA=&id=1793560453.016828&ep=w1"
          target="_blank"
          rel="sponsored noopener noreferrer"
        >
          <span className="preply-emoji" aria-hidden="true">
            👩‍🏫
          </span>
          <span className="preply-copy">
            To learn with human teachers and save 30% on your first lesson
          </span>
          <span className="btn sun lg">Find a teacher →</span>
        </a>
      </section>

      <section className="section">
        <div
          className="card"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: '1rem',
            alignItems: 'center',
            padding: '1.2rem 1.4rem',
          }}
        >
          <div>
            <span className="pill">Word of the day</span>
            <h2 style={{ fontSize: '1.8rem', marginTop: '0.5rem' }}>{daily.word}</h2>
            <p className="respell" style={{ fontSize: '1rem' }}>
              {daily.respell}
            </p>
            <p className="meaning" style={{ marginTop: '0.35rem' }}>
              {daily.meaning}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => speak(daily.word)}>
              🔊 Listen
            </button>
            <a className="btn ghost" href={`#/category/${daily.categoryId}`}>
              {daily.emoji} {daily.categoryName}
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Pick a word world</h2>
            <p className="section-sub">
              Every world has 50 words, a pronunciation studio and its own games.
            </p>
          </div>
          <a className="btn ghost" href="#/games">
            Browse games →
          </a>
        </div>

        <div className="cat-grid">
          {categories.map((category) => {
            const known = category.words.filter((word) => state.known.includes(word.id)).length;
            const percent = Math.round((known / category.words.length) * 100);
            const stars = state.stars[category.id] ?? 0;
            return (
              <a
                key={category.id}
                className="cat-card"
                href={`#/category/${category.id}`}
                style={{ ['--from' as string]: category.from, ['--to' as string]: category.to } as CSSProperties}
              >
                <span className="cat-emoji" aria-hidden="true">
                  {category.emoji}
                </span>
                <span className="cat-name">{category.name}</span>
                <span className="cat-blurb">{category.blurb}</span>
                <span className="cat-meta">
                  <span>{category.words.length} words</span>
                  {stars > 0 && (
                    <span>
                      · ⭐ {stars}
                    </span>
                  )}
                </span>
                <span className="cat-progress">
                  <span style={{ width: `${percent}%` }} />
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">The games arcade</h2>
            <p className="section-sub">Eight ways to play with words. Pick one and beat your best score.</p>
          </div>
        </div>

        <div className="game-grid">
          {GAMES.map((game) => {
            const best = state.best[game.id];
            return (
              <a key={game.id} className="game-card" href={game.link}>
                {typeof best === 'number' && best > 0 && (
                  <span className="g-best">Best {best}%</span>
                )}
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
      </section>

      <section className="section">
        <div className="card story-cta">
          <div>
            <span className="pill">✨ New · AI Story Coach</span>
            <h2 style={{ fontSize: '1.9rem', marginTop: '0.5rem' }}>Write a story with a coach beside you</h2>
            <p className="meaning" style={{ marginTop: '0.4rem', maxWidth: '58ch' }}>
              Pick a hero, a place and a problem. Your coach praises one thing, gives one tip and
              asks one question — you write the story. It never writes it for you.
            </p>
          </div>
          <a className="btn primary lg" href="#/story">
            Start a story →
          </a>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Say it, don’t just see it</h2>
            <p className="section-sub">
              Every word comes with natural phonetic respelling — the letters that show you exactly
              how it sounds — plus audio and a recording button.
            </p>
          </div>
        </div>

        <div
          className="card"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '1.4rem',
            padding: '1.5rem',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ fontSize: '2rem' }}>elephant</h3>
            <p className="respell" style={{ fontSize: '1.2rem', marginTop: '0.2rem' }}>
              EL-i-funt
            </p>
            <p className="meaning" style={{ marginTop: '0.5rem' }}>
              Say the <strong>EL</strong> a little louder. The other two parts are soft and quick.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={() => speak('elephant')}>
                🔊 Hear it
              </button>
              <button className="btn ghost" onClick={() => speak('elephant', { rate: 0.55 })}>
                🐢 Slowly
              </button>
            </div>
          </div>
          <div className="legend">
            <h3>How to read the respelling</h3>
            <ul>
              <li>
                <code>CAPITAL</code> letters are the beat you say loudest: <code>EL</code>-i-funt.
              </li>
              <li>Each dash starts a new beat or syllable: <code>BUT-uh-fly</code>.</li>
              <li>Letters sound like normal English, so <code>funt</code> sounds like “fun” + “t”.</li>
              <li>Listen to the audio, then copy the beat.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">How Word Wizards works</h2>
            <p className="section-sub">Five minutes a day is plenty. Little and often wins.</p>
          </div>
        </div>
        <div className="steps">
          <div className="step">
            <span className="num">1</span>
            <h3>Listen</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Tap the speaker to hear each word in a British English voice.
            </p>
          </div>
          <div className="step">
            <span className="num">2</span>
            <h3>Say it</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Follow the respelling, record yourself and compare.
            </p>
          </div>
          <div className="step">
            <span className="num">3</span>
            <h3>Play</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Word search, quizzes and matching games help the spelling stick.
            </p>
          </div>
          <div className="step">
            <span className="num">4</span>
            <h3>Collect</h3>
            <p className="meaning" style={{ marginTop: '0.4rem' }}>
              Earn stars, keep a streak and fill your word collection. You have{' '}
              <strong>{knownCount}</strong> words so far.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
