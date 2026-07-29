import type { PersistedSession } from '../types.js';

const SESSION_KEY = 'p2-transfer:session';

export function loadSession(): PersistedSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return null;

    const session = JSON.parse(value) as Partial<PersistedSession>;
    if (
      session.version !== 2 ||
      (session.role !== 'creator' && session.role !== 'joiner') ||
      typeof session.sessionId !== 'string' ||
      typeof session.code !== 'string'
    ) {
      clearSession();
      return null;
    }

    return session as PersistedSession;
  } catch {
    clearSession();
    return null;
  }
}

export function saveSession(session: PersistedSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The app still works when browser storage is unavailable.
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
}
