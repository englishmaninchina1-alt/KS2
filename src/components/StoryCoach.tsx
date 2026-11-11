import { useEffect, useRef, useState } from 'react';
import { categories, getCategory } from '../data/vocabulary';
import { speak, stopSpeaking } from '../lib/speech';
import {
  askStoryCoach,
  StoryError,
  type StoryMessage,
  type StoryPlan,
} from '../lib/story';

const INTRO =
  'Hello! I’m your story coach. Tell me one thing about your story — who is in it, or where it happens. Tap a story starter if you would like a head start. What shall we write about?';

const EMPTY_PLAN: StoryPlan = { who: '', where: '', problem: '', ending: '' };

const STARTERS: { emoji: string; label: string; plan: StoryPlan }[] = [
  {
    emoji: '🐉',
    label: 'The shy dragon',
    plan: {
      who: 'Pip, a shy dragon',
      where: 'a cave under the school playground',
      problem: 'Pip is afraid of water',
      ending: 'Pip makes a friend at the swimming pool',
    },
  },
  {
    emoji: '🚀',
    label: 'Lost in space',
    plan: {
      who: 'Zara, a young astronaut',
      where: 'a tiny planet made of jelly',
      problem: 'her rocket runs out of fuel',
      ending: 'the jelly creatures help her fly home',
    },
  },
  {
    emoji: '🐕',
    label: 'The missing dog',
    plan: {
      who: 'Ben and his dog Biscuit',
      where: 'a busy Saturday market',
      problem: 'Biscuit disappears between the stalls',
      ending: 'a trail of sausages leads them back together',
    },
  },
  {
    emoji: '🌈',
    label: 'Rainbow weather',
    plan: {
      who: 'Maya, a girl who can paint the sky',
      where: 'a village that has lost its colours',
      problem: 'a storm washes her paints away',
      ending: 'the village paints itself with flowers',
    },
  },
  {
    emoji: '⚽',
    label: 'The big match',
    plan: {
      who: 'Sam, the smallest player on the team',
      where: 'the school cup final',
      problem: 'the team is losing with two minutes left',
      ending: 'Sam scores with a clever pass',
    },
  },
  {
    emoji: '🏰',
    label: 'The secret door',
    plan: {
      who: 'Lina and her little brother',
      where: 'a castle with a door that only opens at night',
      problem: 'the door locks behind them',
      ending: 'they solve a riddle to get out',
    },
  },
];

const NUDGES = [
  { label: '✍️ Start my story', text: 'Help me write the opening of my story. Give me one sentence starter and one question.' },
  { label: '➡️ What happens next?', text: 'What could happen next in my story?' },
  { label: '⚡ Make it exciting', text: 'How can I make this part more exciting without making it scary?' },
  { label: '🏁 Help me finish', text: 'How should my story end?' },
];

export default function StoryCoach({ categoryId }: { categoryId?: string }) {
  const initial = getCategory(categoryId) ?? categories[0];
  const [catId, setCatId] = useState(initial.id);
  const category = getCategory(catId) ?? categories[0];

  const [plan, setPlan] = useState<StoryPlan>(EMPTY_PLAN);
  const [messages, setMessages] = useState<StoryMessage[]>([{ role: 'assistant', content: INTRO }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef(0);

  const words = category.words.filter((_, index) => index % 6 === 0).slice(0, 10);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy]);

  const run = async (history: StoryMessage[], activePlan: StoryPlan) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setMessages(history);
    setBusy(true);
    setError(null);
    try {
      const reply = await askStoryCoach({
        messages: history.slice(-8),
        plan: activePlan,
        category: category.name,
        words: words.map((word) => word.word),
      });
      if (requestRef.current !== requestId) return;
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(
        err instanceof StoryError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      if (requestRef.current === requestId) setBusy(false);
    }
  };

  const send = (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || busy) return;
    const history: StoryMessage[] = [...messages, { role: 'user', content }];
    setInput('');
    void run(history, plan);
  };

  const startStory = (starter: (typeof STARTERS)[number]) => {
    stopSpeaking();
    setPlan(starter.plan);
    setError(null);
    const request = `Let’s write about ${starter.plan.who} in ${starter.plan.where}. The problem is ${starter.plan.problem}.`;
    void run(
      [
        { role: 'assistant', content: INTRO },
        { role: 'user', content: request },
      ],
      starter.plan,
    );
  };

  const newStory = () => {
    requestRef.current += 1;
    stopSpeaking();
    setMessages([{ role: 'assistant', content: INTRO }]);
    setPlan(EMPTY_PLAN);
    setInput('');
    setError(null);
    setBusy(false);
    inputRef.current?.focus();
  };

  const insertWord = (word: string) => {
    setInput((value) => (value ? `${value.trimEnd()} ${word}` : word));
    inputRef.current?.focus();
  };

  return (
    <div className="container fade-up story-page">
      <div className="page-head">
        <div className="crumbs">
          <a href="#/">Home</a>
          <span aria-hidden="true">›</span>
          <span>Story Coach</span>
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)' }}>The Story Coach ✍️</h1>
        <p className="meaning" style={{ marginTop: '0.45rem', maxWidth: '72ch' }}>
          Build a story one small step at a time. Your coach gives you a compliment, one tip and one
          question — you write the words. Pick a starter, or plan your own adventure.
        </p>
      </div>

      <div className="story-grid">
        <aside className="card story-plan">
          <h2>Your story plan</h2>
          <p className="meaning" style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>
            Optional, but a plan helps. Fill in what you know.
          </p>

          <label className="story-field">
            <span>Who is in it?</span>
            <input
              value={plan.who}
              maxLength={120}
              onChange={(event) => setPlan({ ...plan, who: event.target.value })}
              placeholder="a shy dragon called Pip"
            />
          </label>
          <label className="story-field">
            <span>Where does it happen?</span>
            <input
              value={plan.where}
              maxLength={120}
              onChange={(event) => setPlan({ ...plan, where: event.target.value })}
              placeholder="a cave under the school"
            />
          </label>
          <label className="story-field">
            <span>What goes wrong?</span>
            <input
              value={plan.problem}
              maxLength={120}
              onChange={(event) => setPlan({ ...plan, problem: event.target.value })}
              placeholder="the dragon is afraid of water"
            />
          </label>
          <label className="story-field">
            <span>How might it end?</span>
            <input
              value={plan.ending}
              maxLength={120}
              onChange={(event) => setPlan({ ...plan, ending: event.target.value })}
              placeholder="a new friend at the pool"
            />
          </label>

          <label className="story-field">
            <span>Word world</span>
            <select value={catId} onChange={(event) => setCatId(event.target.value)}>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.name}
                </option>
              ))}
            </select>
          </label>

          <p className="story-minihead">Or borrow a story starter</p>
          <div className="story-starters">
            {STARTERS.map((starter) => (
              <button
                key={starter.label}
                className="starter-chip"
                onClick={() => startStory(starter)}
                disabled={busy}
              >
                {starter.emoji} {starter.label}
              </button>
            ))}
          </div>

          <p className="story-minihead">Words to borrow</p>
          <div className="wordbank">
            {words.map((word) => (
              <button
                key={word.id}
                onClick={() => insertWord(word.word)}
                title={word.meaning}
              >
                {word.word}
              </button>
            ))}
          </div>
          <p className="meaning" style={{ fontSize: '0.74rem', marginTop: '0.5rem' }}>
            Tap a word to add it to your sentence. These come from {category.name}.
          </p>
        </aside>

        <section className="story-chat" aria-label="Story Coach chat">
          <div className="story-chat-head">
            <span className="coach-avatar" aria-hidden="true">
              🪄
            </span>
            <div>
              <div className="story-chat-title">Story Coach</div>
              <div className="story-chat-sub">One question at a time</div>
            </div>
            <span className="pill ai-pill">AI helper</span>
            <button className="btn ghost sm" onClick={newStory} type="button">
              New story
            </button>
          </div>

          <div className="story-messages" ref={scrollRef} aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`bubble ${message.role === 'assistant' ? 'coach' : 'child'}`}
              >
                <div>{message.content}</div>
                {message.role === 'assistant' && (
                  <div className="bubble-tools">
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      aria-label="Read this reply aloud"
                    >
                      🔊 Read aloud
                    </button>
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="bubble coach typing-bubble" role="status" aria-label="Coach is thinking">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {error && (
            <div className="story-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          <div className="nudge-row">
            {NUDGES.map((nudge) => (
              <button
                key={nudge.label}
                className="nudge"
                type="button"
                onClick={() => send(nudge.text)}
                disabled={busy}
              >
                {nudge.label}
              </button>
            ))}
          </div>

          <form
            className="story-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor="story-input">
              Write your story or ask the coach a question
            </label>
            <textarea
              id="story-input"
              ref={inputRef}
              value={input}
              maxLength={600}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Write your next line, or ask for help…"
            />
            <div className="story-composer-row">
              <span className="story-note">
                Enter to send · Shift + Enter for a new line
              </span>
              <button className="btn primary sm" type="submit" disabled={busy || !input.trim()}>
                {busy ? 'Thinking…' : 'Send ✍️'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <p className="story-grownup">
        🤖 The coach uses OpenAI to generate each reply, so answers can be surprising or wrong. It is
        written for ages 7–11 and is asked never to request personal details. Please remind children
        not to share full names, schools or addresses. Replies are not stored by Word Wizards.
      </p>
    </div>
  );
}
