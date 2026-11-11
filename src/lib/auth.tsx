import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const SESSION_KEY = 'wordwizards.session.v1';
const ACCOUNTS_KEY = 'wordwizards.accounts.v1';
const GUEST_KEY = 'wordwizards.guest.v1';
const ITERATIONS = 120_000;

export type AuthResult = { ok: true } | { ok: false; error: string };

export type User = {
  name: string;
  guest: boolean;
};

type StoredAccount = {
  name: string;
  salt: string;
  hash: string;
  createdAt: number;
};

type AuthValue = {
  user: User | null;
  signIn: (name: string, password: string) => Promise<AuthResult>;
  register: (name: string, password: string) => Promise<AuthResult>;
  continueAsGuest: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StoredAccount =>
        Boolean(entry) &&
        typeof (entry as StoredAccount).name === 'string' &&
        typeof (entry as StoredAccount).salt === 'string' &&
        typeof (entry as StoredAccount).hash === 'string',
    );
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    /* Storage blocked or full: the account will not persist. */
  }
}

function clearGuest() {
  try {
    window.sessionStorage.removeItem(GUEST_KEY);
  } catch {
    /* Nothing stored to clear. */
  }
}

function storeSession(name: string) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ name, since: Date.now() }));
    window.sessionStorage.removeItem(GUEST_KEY);
  } catch {
    /* Private browsing: the session lasts for this page only. */
  }
}

function readStoredName(): string | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: unknown };
    if (typeof parsed.name !== 'string' || !parsed.name) return null;
    const stillExists = readAccounts().some((account) => account.name === parsed.name);
    if (!stillExists) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.name;
  } catch {
    return null;
  }
}

function readUser(): User | null {
  try {
    if (window.sessionStorage.getItem(GUEST_KEY) === '1') {
      return { name: 'Guest', guest: true };
    }
  } catch {
    /* No guest session available. */
  }

  const name = readStoredName();
  return name ? { name, guest: false } : null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function hashPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<string> {
  const material = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);

  const signIn = useCallback(async (name: string, password: string): Promise<AuthResult> => {
    const clean = normaliseName(name);
    const account = readAccounts().find(
      (entry) => entry.name.toLowerCase() === clean.toLowerCase(),
    );

    if (!account) {
      return {
        ok: false,
        error: 'We could not find that name on this device. Check the spelling or create an account.',
      };
    }

    try {
      const hash = await hashPassword(password, base64ToBytes(account.salt));
      if (hash !== account.hash) {
        return { ok: false, error: 'That password is not quite right. Try again!' };
      }
    } catch {
      return { ok: false, error: 'This browser could not check your password. Please try again.' };
    }

    storeSession(account.name);
    setUser({ name: account.name, guest: false });
    return { ok: true };
  }, []);

  const register = useCallback(async (name: string, password: string): Promise<AuthResult> => {
    const clean = normaliseName(name);

    if (clean.length < 2) {
      return { ok: false, error: 'Please use a name with at least 2 letters.' };
    }
    if (clean.length > 20) {
      return { ok: false, error: 'Please use a shorter name (20 letters or fewer).' };
    }
    if (password.length < 4) {
      return { ok: false, error: 'Passwords need at least 4 characters.' };
    }

    const accounts = readAccounts();
    if (accounts.some((entry) => entry.name.toLowerCase() === clean.toLowerCase())) {
      return { ok: false, error: 'That name is already used on this device. Try another name.' };
    }

    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const hash = await hashPassword(password, salt);
      writeAccounts([
        ...accounts,
        { name: clean, salt: bytesToBase64(salt), hash, createdAt: Date.now() },
      ]);
    } catch {
      return { ok: false, error: 'This browser could not save your account. Please try again.' };
    }

    storeSession(clean);
    setUser({ name: clean, guest: false });
    return { ok: true };
  }, []);

  const continueAsGuest = useCallback(() => {
    try {
      window.sessionStorage.setItem(GUEST_KEY, '1');
    } catch {
      /* Guest play still works for this page. */
    }
    setUser({ name: 'Guest', guest: true });
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* Nothing stored to clear. */
    }
    clearGuest();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, signIn, register, continueAsGuest, signOut }),
    [user, signIn, register, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
