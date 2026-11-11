import { useEffect, useState } from 'react';
import { ProgressProvider, useProgress } from './lib/progress';
import { AuthProvider, useAuth } from './lib/auth';
import { initSpeech } from './lib/speech';
import Home from './components/Home';
import Login from './components/Login';
import CategoryPage from './components/CategoryPage';
import GamesHub from './components/GamesHub';
import Studio from './components/Studio';
import StoryCoach from './components/StoryCoach';
import ProgressPage from './components/ProgressPage';
import GameHost from './games/GameHost';

type Route =
  | { name: 'home' }
  | { name: 'category'; id: string }
  | { name: 'games' }
  | { name: 'studio'; id: string }
  | { name: 'story'; id?: string }
  | { name: 'progress' }
  | { name: 'game'; game: string; category: string }
  | { name: 'missing' };

function parseRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  const [first, second, third] = parts;

  if (!first) return { name: 'home' };
  if (first === 'login') return { name: 'home' };
  if (first === 'category') return second ? { name: 'category', id: second } : { name: 'games' };
  if (first === 'games') return { name: 'games' };
  if (first === 'studio') return { name: 'studio', id: second ?? 'animals' };
  if (first === 'story') return { name: 'story', id: second };
  if (first === 'progress') return { name: 'progress' };
  if (first === 'game' && second) {
    return { name: 'game', game: second, category: third ?? 'all' };
  }
  return { name: 'missing' };
}

function Header({ route }: { route: Route }) {
  const { totalStars } = useProgress();
  const [hash, setHash] = useState(() => window.location.hash || '#/');

  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const isActive = (path: string) => {
    if (path === '#/') return route.name === 'home';
    return hash.startsWith(path);
  };

  return (
    <header className="topbar">
      <div className="container">
        <div className="topbar-inner">
          <a className="brand" href="#/" aria-label="Word Wizards home">
            <span className="brand-mark" aria-hidden="true">
              🪄
            </span>
            <span>
              <span className="brand-name">Word Wizards</span>
              <span className="brand-tag">KS2 English · Learn &amp; play</span>
            </span>
          </a>

          <nav className="nav" aria-label="Main navigation">
            <a className={`navlink${isActive('#/') ? ' active' : ''}`} href="#/">
              Home
            </a>
            <a
              className={`navlink${isActive('#/category') ? ' active' : ''}`}
              href="#/category/animals"
            >
              Word Worlds
            </a>
            <a className={`navlink${isActive('#/games') || isActive('#/game') ? ' active' : ''}`} href="#/games">
              Games
            </a>
            <a className={`navlink${isActive('#/story') ? ' active' : ''}`} href="#/story">
              Story Coach
            </a>
            <a className={`navlink${isActive('#/studio') ? ' active' : ''}`} href="#/studio/animals">
              Say It
            </a>
            <a className={`navlink${isActive('#/progress') ? ' active' : ''}`} href="#/progress">
              Progress
            </a>
          </nav>

          <span className="star-chip" title="Stars you have earned">
            <span aria-hidden="true">⭐</span>
            <span className="num">{totalStars}</span>
            <span className="sr-only">stars earned</span>
          </span>
        </div>
      </div>
    </header>
  );
}

function Shell() {
  const { user, signOut } = useAuth();
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    initSpeech();
    const onChange = () => {
      setRoute(parseRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  if (!user) return <Login />;

  let page: React.ReactNode;
  switch (route.name) {
    case 'home':
      page = <Home />;
      break;
    case 'category':
      page = <CategoryPage categoryId={route.id} />;
      break;
    case 'games':
      page = <GamesHub />;
      break;
    case 'studio':
      page = <Studio categoryId={route.id} />;
      break;
    case 'story':
      page = <StoryCoach categoryId={route.id} />;
      break;
    case 'progress':
      page = <ProgressPage />;
      break;
    case 'game':
      page = <GameHost gameId={route.game} categoryId={route.category} />;
      break;
    default:
      page = (
        <div className="container page-head fade-up">
          <h1>That page flew away 🪁</h1>
          <p className="meaning" style={{ marginTop: '0.6rem' }}>
            Let us get you back to somewhere fun.
          </p>
          <p style={{ marginTop: '1rem' }}>
            <a className="btn primary" href="#/">
              Back to home
            </a>
          </p>
        </div>
      );
  }

  return (
    <div className="app">
      <Header route={route} />
      <main className="main">{page}</main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>
            <strong>Word Wizards</strong> · 10 word worlds · 500 words · 8 games · AI story coach
          </span>
          <span>Pronunciation uses natural phonetic respelling. Built for UK KS2 learners.</span>
        </div>
        <div className="container footer-session">
          <span>
            {user.guest ? 'Playing as guest' : 'Signed in as'} <strong>{user.name}</strong>
          </span>
          <button type="button" className="linklike" onClick={signOut}>
            {user.guest ? 'Sign in' : 'Log out'}
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ProgressProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ProgressProvider>
  );
}
