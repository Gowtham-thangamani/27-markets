export interface DailyPoint {
  date: string;
  deposits: number;
  withdrawals: number;
  signups: number;
}

/** UTC calendar-day key, e.g. '2026-03-05'. */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** N zero-filled days ending on `today`, oldest first. */
export function emptySeries(days: number, today: Date): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: dayKey(d), deposits: 0, withdrawals: 0, signups: 0 });
  }
  return out;
}

/** Percent change vs previous; null when previous is 0 (avoid divide-by-zero). */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function sparkFromSeries(
  series: DailyPoint[],
  key: 'deposits' | 'withdrawals' | 'signups',
  n = 14,
): number[] {
  return series.slice(-n).map((p) => p[key]);
}

type Step = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
const STEP_PRIORITY: Step[] = ['REJECTED', 'PENDING', 'NOT_SUBMITTED', 'APPROVED'];

/** A profile's overall KYC status = the lowest-priority step it has. */
export function kycStatusOf(p: {
  identityStatus: string;
  addressStatus: string;
  selfieStatus: string;
}): Step {
  const steps = [p.identityStatus, p.addressStatus, p.selfieStatus] as Step[];
  for (const s of STEP_PRIORITY) if (steps.includes(s)) return s;
  return 'APPROVED';
}
