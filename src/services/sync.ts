import { getSupabase, isBackendConfigured } from './api';
import { subscribeAuth } from './auth';
import { repo } from './repository';

export type SyncStatus = 'off' | 'connecting' | 'synced' | 'error';

const TABLE = 'app_state';
const PUSH_DEBOUNCE_MS = 800;

let status: SyncStatus = 'off';
const listeners = new Set<(s: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l(next));
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushing = false;

async function ensureUserId(client: NonNullable<ReturnType<typeof getSupabase>>): Promise<string> {
  const { data } = await client.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: anon, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  if (!anon.user) throw new Error('Anonymer Login lieferte keinen Benutzer');
  return anon.user.id;
}

async function pull(client: NonNullable<ReturnType<typeof getSupabase>>, userId: string) {
  const { data, error } = await client
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.data) return;
  const remoteAt = new Date(data.updated_at as string).getTime();
  if (!Number.isFinite(remoteAt)) return;
  if (remoteAt > repo.getLastSavedAt()) {
    repo.replaceState(data.data);
  }
}

async function push(client: NonNullable<ReturnType<typeof getSupabase>>, userId: string) {
  const { error } = await client.from(TABLE).upsert(
    { user_id: userId, data: repo.getSnapshot(), updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
  repo.markSaved();
}

/**
 * Bridges the local repository to Supabase: anonymous login (a pseudonym the
 * server issues, no email/name), one snapshot row per user in `app_state`.
 * Pulls the newest state on start, pushes debounced on every local change,
 * and re-pulls whenever the auth identity changes (e.g. an email-verified
 * account logs in). Without credentials (or offline) the app stays local.
 */
export async function initSync(): Promise<void> {
  await repo.ready();
  if (!isBackendConfigured()) return;
  setStatus('connecting');
  try {
    const client = getSupabase();
    if (!client) return;
    const userId = await ensureUserId(client);
    await pull(client, userId);
    setStatus('synced');
    repo.subscribe(() => schedulePush());
    subscribeAuth(() => {
      void ensureUserId(client).then((id) => pull(client, id).catch(() => {})).catch(() => {});
    });
  } catch (err) {
    console.warn('[onspot] Backend nicht erreichbar - App läuft lokal weiter:', err);
    setStatus('error');
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

async function pushNow() {
  if (pushing) return;
  pushing = true;
  try {
    const client = getSupabase();
    if (!client) return;
    const userId = await ensureUserId(client);
    await push(client, userId);
    setStatus('synced');
  } catch (err) {
    console.warn('[onspot] Push fehlgeschlagen:', err);
    setStatus('error');
  } finally {
    pushing = false;
  }
}
