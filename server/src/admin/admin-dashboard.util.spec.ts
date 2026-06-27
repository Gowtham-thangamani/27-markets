import { emptySeries, computeDelta, sparkFromSeries, dayKey, kycStatusOf } from './admin-dashboard.util';

describe('admin-dashboard.util', () => {
  it('dayKey returns a UTC YYYY-MM-DD string', () => {
    expect(dayKey(new Date('2026-03-05T23:30:00Z'))).toBe('2026-03-05');
  });

  it('emptySeries returns N zero-filled days, oldest first, ending today', () => {
    const today = new Date('2026-03-05T12:00:00Z');
    const s = emptySeries(3, today);
    expect(s.map((d) => d.date)).toEqual(['2026-03-03', '2026-03-04', '2026-03-05']);
    expect(s[0]).toEqual({ date: '2026-03-03', deposits: 0, withdrawals: 0, signups: 0 });
  });

  it('computeDelta returns percent change, or null when previous is 0', () => {
    expect(computeDelta(150, 100)).toBeCloseTo(50);
    expect(computeDelta(80, 100)).toBeCloseTo(-20);
    expect(computeDelta(5, 0)).toBeNull();
  });

  it('sparkFromSeries takes the last N points of one key', () => {
    const series = emptySeries(20, new Date('2026-03-20T00:00:00Z'));
    series[19].deposits = 7;
    const spark = sparkFromSeries(series, 'deposits', 14);
    expect(spark).toHaveLength(14);
    expect(spark[13]).toBe(7);
  });

  it('kycStatusOf reports the lowest non-approved step, else APPROVED', () => {
    expect(kycStatusOf({ identityStatus: 'APPROVED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' })).toBe('APPROVED');
    expect(kycStatusOf({ identityStatus: 'APPROVED', addressStatus: 'PENDING', selfieStatus: 'NOT_SUBMITTED' })).toBe('PENDING');
    expect(kycStatusOf({ identityStatus: 'REJECTED', addressStatus: 'APPROVED', selfieStatus: 'APPROVED' })).toBe('REJECTED');
    expect(kycStatusOf({ identityStatus: 'NOT_SUBMITTED', addressStatus: 'NOT_SUBMITTED', selfieStatus: 'NOT_SUBMITTED' })).toBe('NOT_SUBMITTED');
  });
});
