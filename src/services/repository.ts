import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ViewTab } from '@/constants/mock-data';
import type { AccentKey } from '@/constants/accent';
import type {
  ActivityItem,
  AnalyticEvent,
  AuthUser,
  ChatMessage,
  Donation,
  DonationMethod,
  PersistedState,
  Report,
  Units,
} from './types';

const STORAGE_KEY = 'onspot/state/v1';
const MAX_ANALYTICS = 500;
const MAX_ACTIVITIES = 50;
const MAX_DONATIONS = 200;
/** Phase 4: chat messages self-destruct 24 h after sending (Snap-style). */
const MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;

/** Plus trial length. The countdown shown in the UI is the real remainder of
 *  this window, never a shortened "ends today" bluff. */
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;
/** Streak lengths worth celebrating. Only these fire the celebration modal. */
const STREAK_MILESTONES = [3, 7, 14, 30, 100];

/** Streak lengths that unlock a permanent profile badge (status, not coins). */
export const BADGE_STREAK_MILESTONES = [7, 30, 100];

/** v1 paid 50 coins per euro (donations were coin-based). */
const COINS_PER_EURO = 50;

/** Local calendar day as YYYY-MM-DD. Deliberately local, not UTC: a streak is
 *  about the user's days, and a UTC boundary would break the count for anyone
 *  using the app late in the evening. */
function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Euro formatting used by the repo for activity-feed text. */
export function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function defaultState(): PersistedState {
  return {
    version: 2,
    user: null,
    following: ['LiveWithMax'],
    messages: {},
    subscribed: false,
    blocked: [],
    savedIds: [],
    units: 'km',
    startTab: 'map',
    accent: 'violet',
    onboardingDone: false,
    interests: [],
    streak: { count: 0, lastOpenDay: '' },
    trialEndsAt: null,
    likedVideos: [],
    visitedIds: [],
    donations: [],
    activities: [],
    reports: [],
    analytics: [],
    coins: { balance: 0 },
    unlocked: [],
    referralCode: '',
    referralUsed: null,
  };
}

/** Normalizes the message shape: older persisted messages (before Phase 4)
 *  have no `expiresAt` yet - give them a 24 h expiry counting from `at`. */
function normalizeMessages(messages: Record<string, ChatMessage[]>): Record<string, ChatMessage[]> {
  let changed = false;
  const next: Record<string, ChatMessage[]> = {};
  for (const [thread, list] of Object.entries(messages)) {
    next[thread] = (list ?? []).map((m) => {
      if (typeof m.expiresAt === 'number') return m;
      changed = true;
      return { ...m, expiresAt: m.at + MESSAGE_TTL_MS };
    });
  }
  return changed ? next : messages;
}

/** Upgrades a persisted payload of any older version to the current shape.
 *  v1 (coin economy) had balance/txns/streak/quests; donations made in coins
 *  are converted 1:1 into euro donations, everything else is dropped. */
function migrate(raw: unknown): PersistedState {
  if (!raw || typeof raw !== 'object') return defaultState();
  const incoming = raw as Record<string, unknown>;
  if (incoming.version === 2) {
    const merged: PersistedState = { ...defaultState(), ...(incoming as Partial<PersistedState>) };
    if (merged.messages) merged.messages = normalizeMessages(merged.messages);
    // A short-lived daily-reward experiment persisted `dailyReward`; coins
    // must stay a purchased/one-time-earned currency, so drop the field and
    // never carry its claim state forward.
    delete (merged as Partial<PersistedState> & { dailyReward?: unknown }).dailyReward;
    return merged;
  }

  const v1 = incoming as Record<string, unknown> & { txns?: { amount?: number; reason?: string }[] };
  let carried: Donation[] = [];
  if (Array.isArray(v1.txns)) {
    const spentCoins = v1.txns.filter((t) => t && t.reason === 'donate' && typeof t.amount === 'number' && t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount as number), 0);
    const euros = Math.floor(spentCoins / COINS_PER_EURO);
    if (euros > 0) carried = [{ id: `don-${Date.now()}`, amountCents: euros * 100, method: 'card', targetName: 'Community', at: Date.now() }];
  }
  return { ...defaultState(), ...(incoming as Partial<PersistedState>), version: 2, donations: carried };
}

let donationSeq = 0;
const donationId = () => `don-${Date.now()}-${donationSeq++}`;
const activityId = () => `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Single source of truth for everything that must survive a reload: donations,
 * following, chats, saved spots, prefs, progress, reports, analytics.
 *
 * The UI never talks to storage directly - components read through the
 * context providers, which all subscribe here. Swap `repo` for an API-backed
 * implementation of the same methods (src/services/api.ts) once a backend
 * exists and nothing else in the app changes.
 */
class LocalRepository {
  private state: PersistedState = defaultState();
  private loadPromise: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** Wall-clock time of the last local change/push; used to decide whether a
   *  remote snapshot is newer than the local one. */
  private lastSavedAt = Date.now();
  /** Streak milestone reached in this session and not yet acknowledged by the
   *  UI. In-memory only - see recordVisitDay. */
  private pendingMilestone: number | null = null;

  /** Idempotent - safe to call from every provider's mount effect. */
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) this.state = migrate(JSON.parse(raw));
          this.lastSavedAt = Date.now();
        } catch (err) {
          console.warn('[onspot] State konnte nicht geladen werden:', err);
        }
      })();
    }
    return this.loadPromise;
  }

  /** Resolves once the persisted state has been read (or failed). */
  ready(): Promise<void> {
    return this.load();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private mutate(fn: (s: PersistedState) => void) {
    fn(this.state);
    this.lastSavedAt = Date.now();
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch((err) =>
        console.warn('[onspot] State konnte nicht gespeichert werden:', err)
      );
    }, 300);
    this.listeners.forEach((l) => l());
  }

  /** Full deep copy of the persisted state - sent to the backend as-is. */
  getSnapshot(): PersistedState {
    return JSON.parse(JSON.stringify(this.state)) as PersistedState;
  }

  /** Time of the last local change (or successful push). */
  getLastSavedAt(): number {
    return this.lastSavedAt;
  }

  /** Called after a successful push so the remote timestamp wins. */
  markSaved(): void {
    this.lastSavedAt = Date.now();
  }

  /** Replaces the whole state with a remote snapshot (version-guarded) and
   *  persists it locally right away. Returns false when the payload doesn't
   *  look like a valid state - callers then keep the local state. */
  replaceState(next: unknown): boolean {
    if (!next || typeof next !== 'object') return false;
    const incoming = next as Partial<PersistedState>;
    if (incoming.version !== defaultState().version) return false;
    if (incoming.messages) incoming.messages = normalizeMessages(incoming.messages);
    this.state = { ...defaultState(), ...incoming };
    this.lastSavedAt = Date.now();
    this.listeners.forEach((l) => l());
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)).catch((err) =>
      console.warn('[onspot] State konnte nicht gespeichert werden:', err)
    );
    return true;
  }

  private pushActivity(emoji: string, text: string) {
    const item: ActivityItem = { id: activityId(), emoji, text, at: Date.now() };
    this.state.activities = [item, ...this.state.activities].slice(0, MAX_ACTIVITIES);
  }

  // ---------- user ----------

  getUser(): AuthUser | null {
    return this.state.user;
  }

  setUser(user: AuthUser | null) {
    this.mutate((s) => {
      s.user = user;
    });
    this.logEvent('auth', user ? { name: user.name } : {});
  }

  // ---------- donations ----------

  getDonations(): Donation[] {
    return this.state.donations;
  }

  getTotalDonatedCents(): number {
    return this.state.donations.reduce((sum, d) => sum + d.amountCents, 0);
  }

  /** Coins given away across every wallet-paid donation. This - not the euro
   *  total - is what the profile's final goal is measured against. */
  getTotalDonatedCoins(): number {
    return this.state.donations.reduce((sum, d) => sum + (d.coins ?? 0), 0);
  }

  /** Records a completed donation. Payment itself happens in the payments
   *  seam (src/services/payments.ts) - this only persists the result. */
  recordDonation(amountCents: number, method: DonationMethod, targetName: string, coins?: number, creatorShareCents?: number): void {
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    const donation: Donation = {
      id: donationId(),
      amountCents: Math.round(amountCents),
      method,
      targetName,
      at: Date.now(),
      ...(coins ? { coins: Math.round(coins) } : {}),
      ...(creatorShareCents != null ? { creatorShareCents: Math.round(creatorShareCents) } : {}),
    };
    this.mutate((s) => {
      s.donations = [donation, ...s.donations].slice(0, MAX_DONATIONS);
    });
    const label = donation.coins ? `${donation.coins} Coins` : formatEuro(donation.amountCents);
    this.pushActivity('🪙', `${label} an ${targetName} gespendet`);
    this.logEvent('donation', { amountCents: donation.amountCents, method, targetName, coins: donation.coins });
  }

  // ---------- social ----------

  getFollowing(): string[] {
    return this.state.following;
  }

  isFollowing(name: string): boolean {
    return this.state.following.includes(name);
  }

  toggleFollow(name: string): void {
    this.mutate((s) => {
      if (s.following.includes(name)) {
        s.following = s.following.filter((n) => n !== name);
      } else {
        s.following = [...s.following, name];
        this.pushActivity('👥', `Du folgst jetzt ${name}`);
      }
    });
    this.logEvent('follow', { name, following: this.state.following.includes(name) });
  }

  getMessages(): Record<string, ChatMessage[]> {
    return this.state.messages;
  }

  appendMessage(thread: string, message: ChatMessage): void {
    this.mutate((s) => {
      const withExpiry: ChatMessage = { ...message, expiresAt: message.expiresAt ?? message.at + MESSAGE_TTL_MS };
      s.messages = { ...s.messages, [thread]: [...(s.messages[thread] ?? []), withExpiry] };
    });
  }

  /** Pins a message so it never expires (Snapchat "hold"). */
  holdMessage(thread: string, id: string): void {
    this.mutate((s) => {
      const list = s.messages[thread];
      if (!list) return;
      s.messages = {
        ...s.messages,
        [thread]: list.map((m) => (m.id === id ? { ...m, held: !m.held } : m)),
      };
    });
  }

  /** Removes expired, non-held messages. Mutates (and returns true) only if
   *  something actually expired, so the caller can skip re-rendering. */
  pruneExpiredMessages(): boolean {
    const now = Date.now();
    let removed = 0;
    const next: Record<string, ChatMessage[]> = {};
    for (const [thread, list] of Object.entries(this.state.messages)) {
      const kept = (list ?? []).filter((m) => m.held || m.expiresAt > now);
      removed += (list ?? []).length - kept.length;
      next[thread] = kept;
    }
    if (removed === 0) return false;
    this.mutate((s) => {
      s.messages = next;
    });
    return true;
  }

  isSubscribed(): boolean {
    return this.state.subscribed;
  }

  setSubscribed(value: boolean): void {
    this.mutate((s) => {
      s.subscribed = value;
    });
    this.logEvent('subscription', { value });
  }

  isBlocked(name: string): boolean {
    return this.state.blocked.includes(name);
  }

  block(name: string): void {
    this.mutate((s) => {
      if (!s.blocked.includes(name)) s.blocked = [...s.blocked, name];
      s.following = s.following.filter((n) => n !== name);
    });
    this.pushActivity('🚫', `Du hast ${name} blockiert`);
    this.logEvent('block', { name });
  }

  unblock(name: string): void {
    this.mutate((s) => {
      s.blocked = s.blocked.filter((n) => n !== name);
    });
  }

  getBlocked(): string[] {
    return this.state.blocked;
  }

  // ---------- saved spots ----------

  getSavedIds(): string[] {
    return this.state.savedIds;
  }

  isSaved(id: string): boolean {
    return this.state.savedIds.includes(id);
  }

  toggleSaved(id: string): void {
    this.mutate((s) => {
      if (s.savedIds.includes(id)) {
        s.savedIds = s.savedIds.filter((x) => x !== id);
      } else {
        s.savedIds = [...s.savedIds, id];
        this.pushActivity('⭐', 'Neuer Ort gespeichert');
      }
    });
    this.logEvent('save', { id, saved: this.state.savedIds.includes(id) });
  }

  // ---------- prefs ----------

  getPrefs(): {
    units: Units;
    startTab: ViewTab;
    accent: AccentKey;
    onboardingDone: boolean;
    interests: string[];
    streak: { count: number; lastOpenDay: string };
    trialEndsAt: number | null;
    milestone: number | null;
  } {
    return {
      units: this.state.units,
      startTab: this.state.startTab,
      accent: this.state.accent,
      onboardingDone: this.state.onboardingDone,
      interests: this.state.interests ?? [],
      // Included here so the prefs provider re-renders on change - it already
      // subscribes to the repo, so consumers stay in sync for free.
      streak: this.getStreak(),
      trialEndsAt: this.getTrialEndsAt(),
      milestone: this.pendingMilestone,
    };
  }

  setUnits(units: Units): void {
    this.mutate((s) => {
      s.units = units;
    });
  }

  setStartTab(tab: ViewTab): void {
    this.mutate((s) => {
      s.startTab = tab;
    });
  }

  setAccent(accent: AccentKey): void {
    this.mutate((s) => {
      s.accent = accent;
    });
  }

  toggleInterest(key: string): void {
    this.mutate((s) => {
      const list = s.interests ?? [];
      s.interests = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
    });
  }

  // ---------- likes ----------

  getLikedVideos(): string[] {
    return this.state.likedVideos ?? [];
  }

  toggleLike(videoId: string): void {
    this.mutate((s) => {
      const list = s.likedVideos ?? [];
      s.likedVideos = list.includes(videoId)
        ? list.filter((id) => id !== videoId)
        : [...list, videoId];
    });
    this.logEvent('like', { videoId, liked: this.getLikedVideos().includes(videoId) });
  }

  // ---------- coins ----------

  getCoins(): number {
    return this.state.coins?.balance ?? 0;
  }

  /** Spends coins if the balance covers the amount. False when broke. */
  spendCoins(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0 || this.getCoins() < amount) return false;
    this.mutate((s) => {
      s.coins = { balance: s.coins.balance - amount };
    });
    this.logEvent('coins_spend', { amount });
    return true;
  }

  grantCoins(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.mutate((s) => {
      s.coins = { balance: s.coins.balance + amount };
    });
    this.logEvent('coins_grant', { amount });
  }

  getUnlocked(): string[] {
    return this.state.unlocked ?? [];
  }

  isUnlocked(key: string): boolean {
    return (this.state.unlocked ?? []).includes(key);
  }

  unlock(key: string): void {
    if (this.isUnlocked(key)) return;
    this.mutate((s) => {
      s.unlocked = [...(s.unlocked ?? []), key];
    });
  }

  /** The user's invite code, generated once and persisted. */
  getReferralCode(): string {
    if (this.state.referralCode) return this.state.referralCode;
    const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
    const code = `ONS-${seed.slice(-6)}`;
    this.mutate((s) => {
      s.referralCode = code;
    });
    return code;
  }

  /** True when this code has not been redeemed yet (one per user, ever). */
  markReferralRedeemed(code: string): boolean {
    if (this.state.referralUsed !== null) return false;
    this.mutate((s) => {
      s.referralUsed = code;
    });
    this.logEvent('referral_redeemed', { code });
    return true;
  }

  // ---------- streak ----------

  getStreak(): { count: number; lastOpenDay: string } {
    return this.state.streak ?? { count: 0, lastOpenDay: '' };
  }

  /** Records today's visit. A milestone just reached is published through the
   *  normal subscription rather than returned, so consumers can read it during
   *  render instead of pushing it into state from an effect. Not persisted -
   *  a celebration is for the moment it happens, not for the next cold start.
   *  Badge milestones are unlocked permanently (unlike the celebration), so
   *  existing users catch up automatically: any badge ≤ the new count opens. */
  recordVisitDay(): void {
    const today = dayKey(new Date());
    const current = this.getStreak();
    // Already counted today - opening the app again is not another day.
    if (current.lastOpenDay === today) return;

    const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const next = current.lastOpenDay === yesterday ? current.count + 1 : 1;
    const milestone = STREAK_MILESTONES.includes(next) ? next : null;

    for (const m of BADGE_STREAK_MILESTONES) {
      if (next >= m) this.unlock(`badge:streak-${m}`);
    }

    this.pendingMilestone = milestone;
    this.mutate((s) => {
      s.streak = { count: next, lastOpenDay: today };
    });
    if (milestone) this.logEvent('streak_milestone', { days: milestone });
  }

  getPendingMilestone(): number | null {
    return this.pendingMilestone;
  }

  clearPendingMilestone(): void {
    if (this.pendingMilestone == null) return;
    this.pendingMilestone = null;
    this.listeners.forEach((l) => l());
  }

  // ---------- trial ----------

  getTrialEndsAt(): number | null {
    return this.state.trialEndsAt ?? null;
  }

  /** Starts the Plus trial once - and only once, ever. The guard checks that
   *  no trial was ever started (not just "none running"), so an expired trial
   *  cannot be rolled into a new one: the countdown the user saw is the
   *  countdown they get, and the loss-framing after expiry stays real. */
  startTrial(): void {
    if (this.state.trialEndsAt != null) return;
    this.mutate((s) => {
      s.trialEndsAt = Date.now() + TRIAL_MS;
    });
    this.logEvent('trial_start', {});
  }

  setOnboardingDone(): void {
    this.mutate((s) => {
      s.onboardingDone = true;
    });
    this.logEvent('onboarding_done');
  }

  // ---------- progress ----------

  recordVisit(spotId: string): void {
    this.mutate((s) => {
      if (s.visitedIds.includes(spotId)) return;
      s.visitedIds = [...s.visitedIds, spotId];
    });
    this.logEvent('spot_visit', { spotId });
  }

  // ---------- activities / reports / analytics ----------

  getActivities(): ActivityItem[] {
    return this.state.activities;
  }

  addReport(report: Omit<Report, 'id' | 'at'>): void {
    this.mutate((s) => {
      s.reports = [{ ...report, id: activityId(), at: Date.now() }, ...s.reports].slice(0, 50);
    });
    this.logEvent('report', report);
  }

  getAnalytics(): AnalyticEvent[] {
    return this.state.analytics;
  }

  logEvent(name: string, props?: Record<string, unknown>): void {
    this.mutate((s) => {
      s.analytics = [...s.analytics, { id: activityId(), name, props, at: Date.now() }].slice(-MAX_ANALYTICS);
    });
  }

  /** Demo helper: wipe everything. */
  reset(): Promise<void> {
    this.state = defaultState();
    this.listeners.forEach((l) => l());
    return AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const repo = new LocalRepository();
