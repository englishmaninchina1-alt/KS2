import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

type Mode = 'signin' | 'register';

export default function Login() {
  const { signIn, register, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  function switchMode(next: Mode) {
    if (busy) return;
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (isRegister && password !== confirmPassword) {
      setError('The two passwords do not match. Try again!');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = isRegister
        ? await register(name, password)
        : await signIn(name, password);
      if (!result.ok) setError(result.error);
    } catch {
      setError('Something went wrong with your login. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap fade-up">
      <div className="login-card">
        <span className="login-badge" aria-hidden="true">
          🪄
        </span>
        <h1>{isRegister ? 'Join Word Wizards' : 'Welcome back'}</h1>
        <p className="login-sub">
          {isRegister
            ? 'Pick a name and a password to start collecting stars.'
            : 'Sign in to play, collect stars and keep your streak going.'}
        </p>

        <div className="login-tabs" role="tablist" aria-label="Sign in or create an account">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={`login-tab${!isRegister ? ' active' : ''}`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={`login-tab${isRegister ? ' active' : ''}`}
            onClick={() => switchMode('register')}
          >
            New account
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-name">Your name</label>
            <input
              id="login-name"
              name="username"
              type="text"
              autoComplete="username"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              placeholder="e.g. Mia"
              maxLength={20}
              required
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-pass">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                placeholder={isRegister ? 'At least 4 characters' : 'Your password'}
                required
              />
              <button
                type="button"
                className="login-show"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span aria-hidden="true">{showPassword ? '🙈' : '👀'}</span>
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="login-field">
              <label htmlFor="login-confirm">Password again</label>
              <input
                id="login-confirm"
                name="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError('');
                }}
                placeholder="Type it once more"
                required
              />
            </div>
          )}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn primary lg block" type="submit" disabled={busy}>
            {busy
              ? 'Just a moment…'
              : isRegister
                ? 'Create my account →'
                : 'Let me in →'}
          </button>
        </form>

        <button type="button" className="login-guest" onClick={continueAsGuest}>
          Continue as guest →
        </button>

        <p className="login-note">
          {isRegister
            ? 'Your account is saved in this browser on this device, so use the same tablet or computer to sign in again.'
            : 'New here? Choose “New account” to make your own login. Guests can play everything, but their login is not saved after this visit.'}
        </p>
      </div>
    </div>
  );
}
