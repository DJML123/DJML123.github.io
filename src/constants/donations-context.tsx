import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { repo } from '@/services/repository';
import { payDonation } from '@/services/payments';
import type { Donation, DonationMethod } from '@/services/types';

/** Wallet coins per euro. Kept in one place so the coin and euro totals stay
 *  comparable. Tied to the pack economy: the cheapest pack sells 100 coins
 *  for 0,99 €, so 100 coins = 1 € keeps the creator payout equal to what the
 *  coins cost the donor. (The v1 rate was 50 - kept only in repository.ts
 *  for historical migration of old coin donations.) */
export const COINS_PER_EURO = 100;

/** Share of every donation the creator actually receives; the platform keeps
 *  the rest. Fixed at record time so past donations stay truthful even if the
 *  rate ever changes. */
export const CREATOR_SHARE_PERCENT = 65;

/** Creator's cut of a donation, in euro-cents. */
export function creatorShareCentsFor(amountCents: number): number {
  return Math.round((amountCents * CREATOR_SHARE_PERCENT) / 100);
}

interface DonationsContextValue {
  donations: Donation[];
  totalDonatedCents: number;
  /** Coins given away in total - what the profile's final goal counts. */
  totalDonatedCoins: number;
  /** True while a payment is in flight (payments seam). */
  processing: boolean;
  /** Pays via the payments seam and records the donation on success. */
  donate: (amountCents: number, method: DonationMethod, targetName: string) => Promise<boolean>;
  /** Tips straight from the coin wallet - no payment seam involved, the coins
   *  are simply spent. Returns false when the balance does not cover it. */
  donateCoins: (coins: number, targetName: string) => boolean;
}

const DonationsContext = createContext<DonationsContextValue | null>(null);

/** Donation history + the only entry point for sending money. Payments go
 *  through the simulated payments seam; the repository persists the result.
 *  Reads and writes flow through the repo, so state survives reloads. */
export function DonationsProvider({ children }: { children: ReactNode }) {
  const [donations, setDonations] = useState<Donation[]>(() => repo.getDonations());
  const [totalDonatedCents, setTotalDonatedCents] = useState(() => repo.getTotalDonatedCents());
  const [totalDonatedCoins, setTotalDonatedCoins] = useState(() => repo.getTotalDonatedCoins());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    repo.ready().then(() => {
      setDonations(repo.getDonations());
      setTotalDonatedCents(repo.getTotalDonatedCents());
      setTotalDonatedCoins(repo.getTotalDonatedCoins());
    });
    const unsubscribe = repo.subscribe(() => {
      setDonations(repo.getDonations());
      setTotalDonatedCents(repo.getTotalDonatedCents());
      setTotalDonatedCoins(repo.getTotalDonatedCoins());
    });
    return unsubscribe;
  }, []);

  const donate = async (amountCents: number, method: DonationMethod, targetName: string) => {
    if (!Number.isFinite(amountCents) || amountCents <= 0 || processing) return false;
    setProcessing(true);
    try {
      const result = await payDonation(amountCents, method);
      if (!result.ok) return false;
      repo.recordDonation(amountCents, method, targetName, undefined, creatorShareCentsFor(amountCents));
      return true;
    } finally {
      setProcessing(false);
    }
  };

  const donateCoins = (coins: number, targetName: string) => {
    if (!Number.isFinite(coins) || coins <= 0) return false;
    if (!repo.spendCoins(coins)) return false;
    const amountCents = Math.round((coins / COINS_PER_EURO) * 100);
    repo.recordDonation(amountCents, 'coins', targetName, coins, creatorShareCentsFor(amountCents));
    return true;
  };

  return (
    <DonationsContext.Provider value={{ donations, totalDonatedCents, totalDonatedCoins, processing, donate, donateCoins }}>
      {children}
    </DonationsContext.Provider>
  );
}

export function useDonations() {
  const ctx = useContext(DonationsContext);
  if (!ctx) throw new Error('useDonations must be used within DonationsProvider');
  return ctx;
}
