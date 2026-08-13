import type { ViewTab } from '@/constants/mock-data';
import type { AccentKey } from '@/constants/accent';

/** Backend-ready models: every entity has a stable id and timestamps, and all
 *  relations reference each other by id/name so a later Supabase-backed
 *  repository can map them 1:1 onto tables. */

export type Units = 'km' | 'mi';

/** How the donation was paid. Real money is never handled locally: the UI
 *  goes through the payments seam (src/services/payments.ts), which is a
 *  simulation until a Stripe backend exists. */
export type DonationMethod = 'coins' | 'card' | 'paypal' | 'apple' | 'google';

export interface Donation {
  id: string;
  /** Amount in euro-cents (100, 300, 500, ...) - integers keep serialization
   *  and aggregation free of float errors. */
  amountCents: number;
  method: DonationMethod;
  /** Coins spent, when the donation was paid from the wallet. Euro donations
   *  leave this undefined - the two are counted separately on purpose. */
  coins?: number;
  /** What the creator actually receives (35 % of the donation value), fixed
   *  at record time. Undefined on donations made before the split existed. */
  creatorShareCents?: number;
  /** The streamer/creator the donation went to. */
  targetName: string;
  at: number;
}

/** The logged-in user as persisted locally. `verified` gates chatting (email
 *  confirmation from the auth service); demo mode starts verified so the
 *  flow stays testable without a backend.
 *
 *  The avatar is either an uploaded image (`avatarUrl`) or a creator-built
 *  one (`avatarColor` + `avatarEmoji`, falling back to the name's initial).
 *  All three are optional so pre-existing persisted users keep working. */
/** Avatar ring cosmetics. Only available to OnSpot+ subscribers - the ring
 *  renders around the photo or the color/emoji build, `aurora` is animated. */
/** Avatar ring cosmetics. `aurora`, `pulse` and `orbit` animate - they are the
 *  "animated profile picture" tier and cost the most coins. */
export type AvatarFrame = 'neon' | 'gold' | 'rainbow' | 'aurora' | 'pulse' | 'orbit';

export interface AuthUser {
  name: string;
  verified: boolean;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  avatarEmoji?: string | null;
  avatarFrame?: AvatarFrame | null;
}

/** A chat message behaves like a Snap: it auto-deletes `expiresAt` (24 h
 *  after sending) unless the user "holds" it (`held: true`), which pins it
 *  forever. `expiresAt` is set by the repository for all messages, including
 *  pre-Phase-4 ones that predate the field. */
export interface ChatMessage {
  id: string;
  from: 'me' | 'them';
  text: string;
  at: number;
  expiresAt: number;
  held?: boolean;
}

export interface ActivityItem {
  id: string;
  emoji: string;
  text: string;
  at: number;
}

export interface Report {
  id: string;
  targetType: 'spot' | 'stream';
  targetId: string;
  reason: string;
  at: number;
}

export interface AnalyticEvent {
  id: string;
  name: string;
  props?: Record<string, unknown>;
  at: number;
}

/** The full client state, serialized to AsyncStorage under one key. This is
 *  the contract a future `api.ts` repository will map onto server tables. */
export interface PersistedState {
  version: 2;
  user: AuthUser | null;
  following: string[];
  messages: Record<string, ChatMessage[]>;
  subscribed: boolean;
  blocked: string[];
  savedIds: string[];
  units: Units;
  startTab: ViewTab;
  /** User-picked accent colour for buttons, pills and highlights. */
  accent: AccentKey;
  onboardingDone: boolean;
  /** Legacy: categories picked in an early onboarding build. No longer set by
   *  the UI (the map simply opens on everything) - kept so persisted states
   *  and remote snapshots stay compatible. Safe to drop in the next
   *  version-migration. */
  interests: string[];
  /** Real app visits, counted per local calendar day. Opening the app twice on
   *  one day does not count twice; skipping a day resets the count to 1. The
   *  number shown in the UI is always this one - it is never inflated. */
  streak: { count: number; lastOpenDay: string };
  /** Epoch-ms when the Plus trial ends, or null if none was ever started.
   *  Persisted so the countdown survives reloads and stays truthful. */
  trialEndsAt: number | null;
  /** Feed items this user liked. Their own like only - the baseline count
   *  lives in the mock content. */
  likedVideos: string[];
  visitedIds: string[];
  donations: Donation[];
  activities: ActivityItem[];
  reports: Report[];
  analytics: AnalyticEvent[];
  /** Coin economy (Phase 1): balance, owned premium items, referral code. */
  coins: { balance: number };
  /** Keys of owned premium items (e.g. `avatar-color:neon-blue`). */
  unlocked: string[];
  /** User's own invite code, generated once. */
  referralCode: string;
  /** Referral code already redeemed by this user (one per user, ever). */
  referralUsed: string | null;
}
