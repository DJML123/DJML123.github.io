import { getSupabase, isBackendConfigured } from './api';
import type { AvatarFrame } from './types';
import { repo } from './repository';

/**
 * Coin economy (Phase 1).
 *
 * Everything a user can earn or spend is defined here - packs, premium avatar
 * items, referral and streak bonuses. Demo mode (no Supabase configured) runs
 * entirely against the local repository; with a backend the same actions go
 * through the `grant-coins` / `redeem-iap` edge functions, which are the only
 * writers of the `wallets` table. The client never touches balances directly.
 */

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  priceCents: number;
  /** Short marketing line under the pack name. */
  tagline: string;
  badge?: string;
}

export const COIN_PACKS: CoinPack[] = [
  { id: 'starter', name: 'Starter', coins: 100, priceCents: 99, tagline: 'Erste Coins zum Ausprobieren' },
  { id: 'creator', name: 'Creator', coins: 515, priceCents: 499, tagline: 'Rahmen freischalten + Tipps geben', badge: 'Beliebt' },
  { id: 'vip', name: 'VIP', coins: 1050, priceCents: 999, tagline: 'Alles freischalten + Puffer' },
  { id: 'mega', name: 'Mega', coins: 2150, priceCents: 1999, tagline: 'Große Ladung für Stammtipper' },
  { id: 'ultra', name: 'Ultra', coins: 4400, priceCents: 3999, tagline: 'Puffer für die Creator-Szene' },
  { id: 'legendaer', name: 'Legendär', coins: 8950, priceCents: 7999, tagline: 'Für echte OnSpot-Fans' },
  { id: 'titan', name: 'Titan', coins: 17100, priceCents: 14999, tagline: 'Whale-Liga für Top-Spender' },
  { id: 'kosmos', name: 'Kosmos', coins: 58000, priceCents: 49999, tagline: 'Die maximale Ladung' },
];

export interface PremiumFrame {
  key: string;
  id: AvatarFrame;
  name: string;
  /** One line on what it looks like - the creator shows this under the price. */
  detail: string;
  coins: number;
  /** Animated rings cost more and are grouped separately in the creator. */
  animated: boolean;
}

/**
 * The avatar shop. Colors and emojis are deliberately NOT in here - a palette
 * behind a paywall makes the basic avatar feel crippled. What costs coins is
 * what nobody needs and everybody notices: the ring around the picture, and
 * above all the ones that move.
 *
 * Bought once, owned forever. OnSpot+ unlocks every ring for as long as the
 * subscription runs, so coins and the subscription are two ways to the same
 * cosmetic rather than two paywalls stacked on each other.
 */
export const PREMIUM_FRAMES: PremiumFrame[] = [
  { key: 'avatar-frame:neon', id: 'neon', name: 'Neon', detail: 'Leuchtender Cyan-Ring', coins: 300, animated: false },
  { key: 'avatar-frame:gold', id: 'gold', name: 'Gold', detail: 'Warmer Gold-Verlauf', coins: 600, animated: false },
  { key: 'avatar-frame:rainbow', id: 'rainbow', name: 'Regenbogen', detail: 'Fünf-Farben-Verlauf', coins: 900, animated: false },
  { key: 'avatar-frame:pulse', id: 'pulse', name: 'Puls', detail: 'Ring atmet im Takt', coins: 1200, animated: true },
  { key: 'avatar-frame:orbit', id: 'orbit', name: 'Orbit', detail: 'Punkt kreist ums Bild', coins: 1600, animated: true },
  { key: 'avatar-frame:aurora', id: 'aurora', name: 'Aurora', detail: 'Rotierender Regenbogen', coins: 2500, animated: true },
];

/** Friends who install via your invite code - paid out once per code. */
export const REFERRAL_BONUS = 100;

// ---------- read ----------

export function getBalance(): number {
  return repo.getCoins();
}

export function isOwned(key: string): boolean {
  return repo.isUnlocked(key);
}

export function getReferralCode(): string {
  return repo.getReferralCode();
}

// ---------- spend ----------

/** Buys a premium item; returns false when already owned or too broke. */
export function buyPremiumItem(key: string, coins: number): boolean {
  if (repo.isUnlocked(key)) return false;
  if (!repo.spendCoins(coins)) return false;
  repo.unlock(key);
  return true;
}

// ---------- earn ----------

/** Simulated pack purchase. With a backend this becomes a real purchase via
 *  `expo-iap`; the receipt goes to the `redeem-iap` edge function, which is
 *  the only path that credits paid coins. */
export async function purchasePack(packId: string): Promise<boolean> {
  const pack = COIN_PACKS.find((p) => p.id === packId);
  if (!pack) return false;
  if (isBackendConfigured()) {
    const client = getSupabase();
    if (!client) return false;
    // Placeholder for the IAP flow: purchase -> receipt -> redeem-iap.
    const { error } = await client.functions.invoke('redeem-iap', {
      body: { packId },
    });
    if (error) return false;
    return true;
  }
  // Demo mode: simulate the payment seam, then credit directly.
  await new Promise((resolve) => setTimeout(resolve, 600));
  repo.grantCoins(pack.coins);
  return true;
}

/** Redeems an invite code; every user can redeem exactly one code ever. */
export function redeemReferral(code: string): { ok: boolean; message: string } {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, message: 'Code eingeben – z. B. ONS-A1B2C3.' };
  if (!repo.markReferralRedeemed(clean)) return { ok: false, message: 'Du hast bereits einen Code eingelöst.' };
  repo.grantCoins(REFERRAL_BONUS);
  return { ok: true, message: `${REFERRAL_BONUS} Coins gutgeschrieben!` };
}
