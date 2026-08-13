import { CREATOR_SHARE_PERCENT, COINS_PER_EURO, creatorShareCentsFor } from '../donations-context';

describe('creator share', () => {
  it('is a 65 % flat rate - the creator keeps the majority', () => {
    expect(CREATOR_SHARE_PERCENT).toBe(65);
  });

  it('computes the creator cut of a donation in euro-cents', () => {
    // 100 coins = 1,00 € -> creator keeps 0,65 €
    expect(creatorShareCentsFor(100)).toBe(65);
    // 250 coins = 2,50 € -> creator keeps 1,625 €, rounded to 163 cent
    expect(creatorShareCentsFor(250)).toBe(163);
    // 500 coins = 5,00 € -> creator keeps 3,25 €
    expect(creatorShareCentsFor(500)).toBe(325);
  });

  it('matches the coin-pack baseline: 100 coins = 1 €', () => {
    expect(100 / COINS_PER_EURO).toBe(1);
  });
});