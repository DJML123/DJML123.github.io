import { getSupabase, isBackendConfigured } from './api';
import { repo } from './repository';
import type { AvatarFrame } from './types';

/**
 * Auth status:
 *  - 'boot'     initializing (restoring a persisted session)
 *  - 'guest'    not logged in
 *  - 'pending'  account created, email not yet confirmed
 *  - 'verified' logged in with a confirmed email (demo mode logs in directly)
 */
export type AuthStatus = 'boot' | 'guest' | 'pending' | 'verified';

export interface AuthSnapshot {
  status: AuthStatus;
  name: string;
  email: string | null;
  verified: boolean;
  avatarUrl: string | null;
  avatarColor: string | null;
  avatarEmoji: string | null;
  avatarFrame: AvatarFrame | null;
}

/** Avatar data collected by the profile creator in the sign-up flow. */
export interface AvatarSelection {
  color?: string;
  emoji?: string;
  /** Uploaded image as a data/file URI - used verbatim, never re-encoded. */
  avatarUrl?: string;
  /** Plus-only ring cosmetic. `undefined` keeps the current, `null` removes. */
  frame?: AvatarFrame | null;
}

const GUEST: AuthSnapshot = { status: 'guest', name: '', email: null, verified: false, avatarUrl: null, avatarColor: null, avatarEmoji: null, avatarFrame: null };

let snapshot: AuthSnapshot = GUEST;
const listeners = new Set<(s: AuthSnapshot) => void>();

function set(next: AuthSnapshot) {
  if (snapshot.status === next.status && snapshot.email === next.email) return;
  snapshot = next;
  listeners.forEach((l) => l(next));
}

export function getAuth(): AuthSnapshot {
  return snapshot;
}

export function subscribeAuth(fn: (s: AuthSnapshot) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Persists the local user record (survives reloads) and mirrors it into the
 *  auth snapshot. `verified` is what the chat gate checks. */
function persistUser(name: string, verified: boolean, avatar: AvatarSelection = {}) {
  repo.setUser({ name, verified, avatarUrl: avatar.avatarUrl ?? null, avatarColor: avatar.color ?? null, avatarEmoji: avatar.emoji ?? null, avatarFrame: avatar.frame ?? null });
}

function fromSession(email: string | null, verified: boolean, name: string | null): AuthSnapshot {
  if (!email) return GUEST;
  return {
    status: verified ? 'verified' : 'pending',
    name: name || email.split('@')[0] || 'Nutzer',
    email,
    verified,
    avatarUrl: null,
    avatarColor: null,
    avatarEmoji: null,
    avatarFrame: null,
  };
}

// ---------- demo mode (no backend configured) ----------

async function demoSignUp(email: string, name: string, avatar: AvatarSelection = {}) {
  await repo.ready();
  const finalName = name.trim() || email.split('@')[0] || 'Nutzer';
  persistUser(finalName, false, avatar);
  set({ status: 'pending', name: finalName, email, verified: false, avatarUrl: avatar.avatarUrl ?? null, avatarColor: avatar.color ?? null, avatarEmoji: avatar.emoji ?? null, avatarFrame: avatar.frame ?? null });
}

/** Demo-only: pretend the email was confirmed. */
async function demoConfirm() {
  const current = repo.getUser();
  persistUser(current?.name ?? 'Nutzer', true);
  set({ ...snapshot, status: 'verified', verified: true });
}

async function demoSignIn(email: string) {
  await repo.ready();
  const name = email.split('@')[0] || 'Nutzer';
  persistUser(name, true);
  set({ status: 'verified', name, email, verified: true, avatarUrl: null, avatarColor: null, avatarEmoji: null, avatarFrame: null });
}

async function clearUser() {
  await repo.ready();
  repo.setUser(null);
  set(GUEST);
}

// ---------- real mode (Supabase) ----------

function setupSupabaseListener() {
  const client = getSupabase();
  if (!client || !isBackendConfigured()) return;

  client.auth.onAuthStateChange((event, session) => {
    const user = session?.user;
    if (event === 'SIGNED_OUT' || !user) {
      void clearUser().then(() => {});
      return;
    }
    const verified = user.email_confirmed_at != null;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name = typeof meta?.display_name === 'string' ? meta.display_name : null;
    set(fromSession(user.email ?? null, verified, name));
    if (verified) {
      void repo.ready().then(() => persistUser(name || user.email?.split('@')[0] || 'Nutzer', true));
    }
  });

  // Restore a persisted session (supabase persists it in AsyncStorage).
  void client.auth.getSession().then(({ data }) => {
    const user = data.session?.user;
    if (!user) {
      set(GUEST);
      return;
    }
    const verified = user.email_confirmed_at != null;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name = typeof meta?.display_name === 'string' ? meta.display_name : null;
    set(fromSession(user.email ?? null, verified, name));
  });
}

// ---------- public API ----------

export interface AuthResult {
  ok: boolean;
  /** German user-facing error message, or null on success. */
  error: string | null;
  /** True when the account needs email confirmation next. */
  pendingVerification: boolean;
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    if (/already registered|already exists/i.test(msg)) return 'Diese E-Mail ist bereits registriert.';
    if (/invalid login|invalid credentials|password/i.test(msg)) return 'E-Mail oder Passwort ist falsch.';
    if (/rate.limit/i.test(msg)) return 'Zu viele Versuche – bitte kurz warten.';
    return msg;
  }
  return 'Unbekannter Fehler – bitte erneut versuchen.';
}

export async function signUp(email: string, password: string, name: string, avatar: AvatarSelection = {}): Promise<AuthResult> {
  const clean = email.trim().toLowerCase();
  if (!clean || !password || !name.trim()) return { ok: false, error: 'Bitte alle Felder ausfüllen.', pendingVerification: false };
  if (!isBackendConfigured()) {
    await demoSignUp(clean, name, avatar);
    return { ok: true, error: null, pendingVerification: true };
  }
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Backend nicht konfiguriert.', pendingVerification: false };
  const { data, error } = await client.auth.signUp({
    email: clean,
    password,
    options: { data: { display_name: name.trim() } },
  });
  if (error) return { ok: false, error: errorMessage(error), pendingVerification: false };
  const user = data.user;
  if (!user) return { ok: false, error: 'Konto konnte nicht erstellt werden.', pendingVerification: false };
  const verified = user.email_confirmed_at != null;
  set(fromSession(clean, verified, name.trim()));
  if (verified) await repo.ready().then(() => persistUser(name.trim(), true));
  return { ok: true, error: null, pendingVerification: !verified };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const clean = email.trim().toLowerCase();
  if (!clean || !password) return { ok: false, error: 'Bitte E-Mail und Passwort eingeben.', pendingVerification: false };
  if (!isBackendConfigured()) {
    await demoSignIn(clean);
    return { ok: true, error: null, pendingVerification: false };
  }
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Backend nicht konfiguriert.', pendingVerification: false };
  const { data, error } = await client.auth.signInWithPassword({ email: clean, password });
  if (error) return { ok: false, error: errorMessage(error), pendingVerification: false };
  const user = data.user;
  const verified = user?.email_confirmed_at != null;
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  const name = typeof meta?.display_name === 'string' ? meta.display_name : null;
  set(fromSession(clean, verified, name));
  if (verified) await repo.ready().then(() => persistUser(name || clean.split('@')[0] || 'Nutzer', true));
  return { ok: true, error: null, pendingVerification: !verified };
}

export async function signOut(): Promise<void> {
  if (isBackendConfigured()) {
    const client = getSupabase();
    if (client) await client.auth.signOut().catch(() => {});
  }
  await clearUser();
}

/** Demo-only: pretend the confirmation email was clicked. */
export async function confirmDemoVerification(): Promise<void> {
  await demoConfirm();
}

/** Updates just the avatar (color/emoji/photo) without touching the session.
 *  Works for guests too, so the PFP creator is usable before sign-up. */
export async function updateAvatar(avatar: AvatarSelection): Promise<void> {
  await repo.ready();
  const current = repo.getUser();
  const merged: AuthSnapshot = {
    ...snapshot,
    name: snapshot.name || current?.name || 'Nutzer',
    avatarUrl: avatar.avatarUrl ?? snapshot.avatarUrl,
    avatarColor: avatar.color ?? snapshot.avatarColor,
    avatarEmoji: avatar.emoji ?? snapshot.avatarEmoji,
    avatarFrame: avatar.frame === undefined ? snapshot.avatarFrame : avatar.frame,
  };
  persistUser(merged.name, merged.verified, {
    color: merged.avatarColor ?? undefined,
    emoji: merged.avatarEmoji ?? undefined,
    avatarUrl: merged.avatarUrl ?? undefined,
    frame: merged.avatarFrame ?? undefined,
  });
  // `set()` early-returns when status/email are unchanged, so notify directly.
  snapshot = merged;
  listeners.forEach((l) => l(merged));
}

/** Re-sends the confirmation email (real mode only). */
export async function resendVerification(email: string): Promise<AuthResult> {
  if (!isBackendConfigured()) return { ok: true, error: null, pendingVerification: true };
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Backend nicht konfiguriert.', pendingVerification: false };
  const { error } = await client.auth.signUp({ email: email.trim().toLowerCase(), password: ' ' });
  if (error && !/already registered/i.test(String(error.message))) {
    return { ok: false, error: errorMessage(error), pendingVerification: true };
  }
  return { ok: true, error: null, pendingVerification: true };
}

/** Call once at app start; restores a persisted session / wires listeners. */
export function initAuth(): void {
  void repo.ready();
  setupSupabaseListener();
}
