import { repo, BADGE_STREAK_MILESTONES } from '../repository';

/** Local noon in UTC - the dayKey() boundary is mid-day local time, so a
 *  ±12 h offset around a set day never crosses into another date. */
function noonUTC(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

describe('streak', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await repo.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts the first visit as 1 and the same day again as still 1', () => {
    jest.setSystemTime(noonUTC('2026-01-01'));
    repo.recordVisitDay();
    expect(repo.getStreak()).toEqual({ count: 1, lastOpenDay: '2026-01-01' });

    repo.recordVisitDay();
    expect(repo.getStreak()).toEqual({ count: 1, lastOpenDay: '2026-01-01' });
  });

  it('increments on consecutive days and resets after a gap', () => {
    jest.setSystemTime(noonUTC('2026-01-01'));
    repo.recordVisitDay();
    jest.setSystemTime(noonUTC('2026-01-02'));
    repo.recordVisitDay();
    expect(repo.getStreak().count).toBe(2);

    jest.setSystemTime(noonUTC('2026-01-04')); // Jan 3 skipped
    repo.recordVisitDay();
    expect(repo.getStreak().count).toBe(1);
  });

  it('keeps the badge that was reached even when the streak later breaks', () => {
    for (let day = 1; day <= 7; day++) {
      jest.setSystemTime(noonUTC(`2026-01-${String(day).padStart(2, '0')}`));
      repo.recordVisitDay();
    }
    expect(repo.isUnlocked('badge:streak-7')).toBe(true);

    jest.setSystemTime(noonUTC('2026-02-01'));
    repo.recordVisitDay();
    expect(repo.getStreak().count).toBe(1);
    expect(repo.isUnlocked('badge:streak-7')).toBe(true);
  });

  it('unlocks the badge for a count reached in an earlier session (catch-up)', () => {
    repo.replaceState({
      ...repo.getSnapshot(),
      streak: { count: 30, lastOpenDay: '2026-01-01' },
    });
    jest.setSystemTime(noonUTC('2026-01-02'));
    repo.recordVisitDay();
    expect(repo.isUnlocked('badge:streak-30')).toBe(true);
    expect(repo.isUnlocked('badge:streak-100')).toBe(false);
  });

  it('publishes exactly the reached milestone once and then clears it', () => {
    for (let day = 1; day <= 3; day++) {
      jest.setSystemTime(noonUTC(`2026-01-${String(day).padStart(2, '0')}`));
      repo.recordVisitDay();
    }
    expect(repo.getPendingMilestone()).toBe(3);
    repo.clearPendingMilestone();
    expect(repo.getPendingMilestone()).toBeNull();
  });
});

describe('coins', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await repo.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts at 0 and grants add up', () => {
    expect(repo.getCoins()).toBe(0);
    repo.grantCoins(100);
    repo.grantCoins(50);
    expect(repo.getCoins()).toBe(150);
  });

  it('ignores non-positive or non-finite grants', () => {
    repo.grantCoins(0);
    repo.grantCoins(-5);
    repo.grantCoins(Number.NaN);
    expect(repo.getCoins()).toBe(0);
  });

  it('spends only what the balance covers', () => {
    repo.grantCoins(100);
    expect(repo.spendCoins(60)).toBe(true);
    expect(repo.getCoins()).toBe(40);
    expect(repo.spendCoins(41)).toBe(false);
    expect(repo.getCoins()).toBe(40);
  });

  it('never lets spendCoins go negative', () => {
    expect(repo.spendCoins(10)).toBe(false);
    expect(repo.getCoins()).toBe(0);
  });
});

describe('referral', () => {
  beforeEach(async () => {
    await repo.reset();
  });

  it('generates a stable invite code', () => {
    const code = repo.getReferralCode();
    expect(code).toMatch(/^ONS-[A-Z0-9]{6}$/);
    expect(repo.getReferralCode()).toBe(code);
  });

  it('can be redeemed exactly once', () => {
    expect(repo.markReferralRedeemed('ONS-ABC123')).toBe(true);
    expect(repo.markReferralRedeemed('ONS-DEF456')).toBe(false);
  });
});

describe('messages', () => {
  beforeEach(async () => {
    await repo.reset();
  });

  it('prunes expired snap messages but keeps fresh ones', () => {
    const now = Date.now();
    repo.appendMessage('chat', {
      id: 'm1',
      from: 'them',
      text: 'alt',
      at: now - 48 * 60 * 60 * 1000,
      expiresAt: now - 24 * 60 * 60 * 1000,
    });
    repo.appendMessage('chat', {
      id: 'm2',
      from: 'me',
      text: 'frisch',
      at: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    repo.pruneExpiredMessages();
    const remaining = repo.getMessages().chat.map((m) => m.id);
    expect(remaining).toEqual(['m2']);
  });

  it('back-fills expiresAt for legacy messages without one', () => {
    const now = Date.now();
    repo.replaceState({
      ...repo.getSnapshot(),
      messages: {
        chat: [{ id: 'legacy', from: 'them', text: 'alt', at: now }],
      },
    });
    const restored = repo.getMessages().chat[0];
    expect(restored.expiresAt).toBe(now + 24 * 60 * 60 * 1000);
  });
});

describe('badge milestones', () => {
  it('are exactly the exported permanent badges', () => {
    expect(BADGE_STREAK_MILESTONES).toEqual([7, 30, 100]);
  });
});
describe('donations', () => {
  beforeEach(async () => {
    await repo.reset();
  });

  it('stores the creator share on coin donations', () => {
    repo.grantCoins(500);
    repo.spendCoins(250);
    repo.recordDonation(250, 'coins', 'LiveWithMax', 250, 163);
    const donation = repo.getDonations()[0];
    expect(donation.amountCents).toBe(250);
    expect(donation.coins).toBe(250);
    expect(donation.creatorShareCents).toBe(163);
    expect(repo.getTotalDonatedCents()).toBe(250);
  });

  it('leaves creatorShareCents undefined for legacy-shaped records', () => {
    repo.recordDonation(500, 'coins', 'LiveWithMax', 500);
    expect(repo.getDonations()[0].creatorShareCents).toBeUndefined();
  });
});
