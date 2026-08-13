import { COIN_PACKS, REFERRAL_BONUS } from '../coins';

/** Discount of a pack vs the Starter baseline (100 coins for 0,99 €). */
function bonusPercent(pack: { coins: number; priceCents: number }): number {
  const baselineCoins = pack.priceCents / 0.99; // coins at 0 % bonus (0,99 cent per coin)
  return (pack.coins - baselineCoins) / baselineCoins;
}

describe('coin packs', () => {
  it('starts at the 0 % baseline: 100 coins for 0,99 €', () => {
    const starter = COIN_PACKS[0];
    expect(starter.id).toBe('starter');
    expect(starter.coins).toBe(100);
    expect(starter.priceCents).toBe(99);
  });

  it('keeps the last pack at exactly 15 % - the economy must not drift higher', () => {
    const last = COIN_PACKS[COIN_PACKS.length - 1];
    expect(bonusPercent(last)).toBeCloseTo(0.15, 2);
    for (const pack of COIN_PACKS) {
      expect(bonusPercent(pack)).toBeLessThanOrEqual(0.1501);
    }
  });

  it('scales value monotonically: bigger packs always give more coins per euro', () => {
    const perEuro = COIN_PACKS.map((p) => p.coins / p.priceCents);
    for (let i = 1; i < perEuro.length; i++) {
      expect(perEuro[i]).toBeGreaterThan(perEuro[i - 1]);
    }
  });

  it('has unique ids and positive prices/coins everywhere', () => {
    const ids = COIN_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pack of COIN_PACKS) {
      expect(pack.priceCents).toBeGreaterThan(0);
      expect(pack.coins).toBeGreaterThan(0);
    }
  });

  it('keeps the referral bonus at one-time-earned value (100 coins)', () => {
    expect(REFERRAL_BONUS).toBe(100);
  });
});