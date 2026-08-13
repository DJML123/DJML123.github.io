import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  buyPremiumItem,
  COIN_PACKS,
  getBalance,
  getReferralCode,
  isOwned,
  PREMIUM_FRAMES,
  purchasePack,
  redeemReferral,
  type CoinPack,
  type PremiumFrame,
} from '@/services/coins';
import { repo } from '@/services/repository';

interface CoinsContextValue {
  /** Current coin balance - always the repository's truth. */
  balance: number;
  packs: CoinPack[];
  frames: PremiumFrame[];
  referralCode: string;
  /** True while a pack purchase is in flight. */
  processing: boolean;
  isOwned: (key: string) => boolean;
  buyItem: (key: string, coins: number) => boolean;
  buyPack: (packId: string) => Promise<boolean>;
  redeem: (code: string) => { ok: boolean; message: string };
}

const CoinsContext = createContext<CoinsContextValue | null>(null);

/** Wallet state + the only entry points for earning and spending coins.
 *  Reads and writes flow through the repository, so the balance survives
 *  reloads and every screen updates on change. */
export function CoinsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(() => getBalance());
  const [referralCode, setReferralCode] = useState(() => getReferralCode());
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    repo.ready().then(() => {
      setBalance(getBalance());
      setReferralCode(getReferralCode());
    });
    const unsubscribe = repo.subscribe(() => {
      setBalance(getBalance());
      setReferralCode(getReferralCode());
    });
    return unsubscribe;
  }, []);

  const buyPack = async (packId: string) => {
    if (processing) return false;
    setProcessing(true);
    try {
      return await purchasePack(packId);
    } finally {
      setProcessing(false);
    }
  };

  const value: CoinsContextValue = {
    balance,
    packs: COIN_PACKS,
    frames: PREMIUM_FRAMES,
    referralCode,
    processing,
    isOwned,
    buyItem: buyPremiumItem,
    buyPack,
    redeem: redeemReferral,
  };

  return <CoinsContext.Provider value={value}>{children}</CoinsContext.Provider>;
}

export function useCoins(): CoinsContextValue {
  const ctx = useContext(CoinsContext);
  if (!ctx) throw new Error('useCoins must be used within CoinsProvider');
  return ctx;
}
