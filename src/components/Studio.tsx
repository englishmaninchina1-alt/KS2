import { useState } from 'react';
import { categories, getCategory } from '../data/vocabulary';
import { useProgress } from '../lib/progress';
import { playWin } from '../lib/sound';
import { speak } from '../lib/speech';
import { useRecorder } from '../lib/useRecorder';

export default function Studio({ categoryId }: { categoryId: string }) {
  const initial = getCategory(categoryId) ?? categories[0];
  const [catId, setCatId] = useState(initial.id);
  const category = getCategory(catId) ?? categories[0];
  const [index, setIndex] = useState(0);
  const [rating, setRating] = useState<string | null>(null);
  const [rated, setRated] = useState<string[]>([]);
  const { addStars } = useProgress();
  const recorder = useRecorder(7);

  const word = category.words[Math.min(index, category.words.length - 1)];
  const syllables = word.respell.split('-');
  const hasRated = rated.includes(word.id);

  const move = (delta: number) => {
    setRating(null);
    recorder.stop();
    setIndex((current) => {
      const next = current + delta;
      if (next < 0) return category.words.length - 1;
      if (next >= category.words.length) return 0;
      return next;
    });
  };

  const changeCategory = (id: string) => {
    setCatId(id);
    setIndex(0);
    setRating(null);
    recorder.stop();
  };

  const rate = (value: string) => {
    setRating(value);
    if (value !== 'again' && !hasRated) {
      addStars(category.id, 1);
      setRated((current) => [...current, word.id]);
      playWin();
    }
  };

  return (
    <div className="container fade-up">
      <div className="page-head">
        <div className="crumbs">
          <a href="#/">Home</a>
          <span aria-hidden="true">›</span>
          <span>Say It Studio</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>Say It Studio 🎙️</h1>
        <p className="meaning" style={{ marginTop: '0.4rem', maxWidth: '70ch' }}>
          Listen to the word, copy the beat from the respelling, then record yourself and listen
          back. You can practise all {category.words.length} words in {category.name}.
        </p>

        <div className="word-toolbar" style={{ marginTop: '1rem' }}>
          <label className="search" style={{ maxWidth: 340 }}>
            <span aria-hidden="true">🌍</span>
            <span className="sr-only">Choose a word world</span>
            <select
              value={catId}
              onChange={(event) => changeCategory(event.target.value)}
              style={{ border: 0, background: 'transparent', width: '100%', fontWeight: 700 }}
            >
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.name}
                </option>
              ))}
            </select>
          </label>
          <span className="pill">
            Word {index + 1} of {category.words.length}
          </span>
        </div>
      </div>

      <div className="studio">
        <div>
          <div className="studio-card">
            <span className="pill">{category.emoji} {category.name}</span>
            <h2 className="studio-word" style={{ marginTop: '0.7rem' }}>
              {word.word}
            </h2>

            <div className="syllables" aria-label={`Pronunciation: ${word.respell}`}>
              {syllables.map((syllable, position) => {
                const stressed = syllable === syllable.toUpperCase() && /[A-Z]/i.test(syllable);
                return (
                  <span
                    key={`${syllable}-${position}`}
                    className={`syllable${stressed ? ' stress' : ''}`}
                  >
                    {syllable}
                  </span>
                );
              })}
            </div>

            <p className="meaning" style={{ marginTop: '0.75rem', fontWeight: 700 }}>
              {word.meaning}
            </p>

            <div className="studio-actions">
              <button className="btn primary" onClick={() => speak(word.word)}>
                🔊 Listen
              </button>
              <button className="btn ghost" onClick={() => speak(word.word, { rate: 0.55 })}>
                🐢 Slowly
              </button>
              <button className="btn ghost" onClick={() => speak(word.example, { rate: 0.75 })}>
                💬 In a sentence
              </button>
            </div>

            <div style={{ marginTop: '1.4rem', borderTop: '1px dashed rgba(42,19,87,.2)', paddingTop: '1.2rem' }}>
              <p style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                1. Listen · 2. Record · 3. Play back · 4. Compare
              </p>
              <div className="studio-actions">
                <button
                  className={`btn ${recorder.recording ? 'coral' : 'sun'}`}
                  onClick={() => void recorder.start()}
                  aria-pressed={recorder.recording}
                >
                  {recorder.recording ? '⏹ Stop recording' : '🎙️ Record my voice'}
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    recorder.stop();
                    setRating(null);
                  }}
                  disabled={!recorder.url}
                >
                  🔁 Start again
                </button>
              </div>

              {recorder.recording && (
                <>
                  <div className="wave" aria-hidden="true">
                    {Array.from({ length: 11 }, (_, bar) => (
                      <span
                        key={bar}
                        style={{
                          animationDelay: `${bar * 0.07}s`,
                          height: `${10 + ((bar * 7) % 26)}px`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="record-status" role="status">
                    Recording… {recorder.seconds}s of 7s
                  </p>
                </>
              )}

              {!recorder.recording && recorder.url && (
                <>
                  <audio controls src={recorder.url} style={{ width: '100%', marginTop: '1rem' }} />
                  <p className="record-status">That’s your voice. Does the loud beat match? 🎧</p>
                  <div className="studio-actions" style={{ marginTop: '0.6rem' }}>
                    <button
                      className={`btn sm ${rating === 'great' ? 'mint' : 'ghost'}`}
                      onClick={() => rate('great')}
                    >
                      😀 I nailed it
                    </button>
                    <button
                      className={`btn sm ${rating === 'good' ? 'sun' : 'ghost'}`}
                      onClick={() => rate('good')}
                    >
                      🙂 Pretty close
                    </button>
                    <button
                      className={`btn sm ${rating === 'again' ? 'coral' : 'ghost'}`}
                      onClick={() => rate('again')}
                    >
                      🤔 Try again
                    </button>
                  </div>
                  {rating === 'again' && (
                    <p className="record-status">No problem — listen once more and copy the beat.</p>
                  )}
                </>
              )}

              {recorder.error && (
                <p className="record-status" role="alert" style={{ color: '#c02a1b' }}>
                  {recorder.error}
                </p>
              )}

              <p className="record-status" style={{ fontSize: '0.76rem' }}>
                🔒 Your recordings stay in this browser. Nothing is uploaded or saved.
              </p>
            </div>

            <div className="flash-controls" style={{ marginTop: '1.2rem' }}>
              <button className="btn ghost" onClick={() => move(-1)} aria-label="Previous word">
                ←
              </button>
              <button className="btn primary" onClick={() => move(1)}>
                Next word →
              </button>
            </div>
          </div>

          <p className="meaning" style={{ textAlign: 'center', marginTop: '0.9rem', fontSize: '0.85rem' }}>
            Example: “{word.example}”
          </p>
        </div>

        <aside>
          <div className="legend" style={{ marginBottom: '0.9rem' }}>
            <h3>Reading the respelling</h3>
            <ul>
              <li>
                Loudest beat in <code>CAPITALS</code>.
              </li>
              <li>Dashes split the beats: <code>el-e-phant</code> → <code>EL-i-funt</code>.</li>
              <li>Tap a word in the list to practise it.</li>
            </ul>
          </div>

          <div className="studio-list" aria-label={`${category.name} words`}>
            {category.words.map((item, position) => (
              <button
                key={item.id}
                className={`studio-item${item.id === word.id ? ' active' : ''}`}
                onClick={() => {
                  setIndex(position);
                  setRating(null);
                  recorder.stop();
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="w" style={{ display: 'block' }}>
                    {item.word}
                  </span>
                  <span className="r">{item.respell}</span>
                </span>
                <span aria-hidden="true" style={{ opacity: 0.6 }}>
                  {rated.includes(item.id) ? '⭐' : '▶'}
                </span>
              </button>
            ))}
          </div>
          <p className="meaning" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
            ⭐ {rated.length} of {category.words.length} words practised aloud here.
          </p>
        </aside>
      </div>
    </div>
  );
}
