import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from './AdminDashboardPage';
import { adminApi } from '@/lib/adminApi';

vi.mock('@/lib/adminApi', () => ({
  adminApi: { getDashboard: vi.fn() },
}));

const payload = {
  kpis: {
    totalClients: { value: 1240, delta: 12.5, spark: [1, 2, 3] },
    netFlow: { value: '$8,500.00', delta: 4.2, spark: [1, -1, 2] },
    pendingKyc: { value: 3, spark: [0, 1] },
    pendingWithdrawals: { value: 2, spark: [1, 0] },
    openTickets: { value: 4, spark: [2, 1] },
  },
  series: Array.from({ length: 90 }, (_, i) => ({ date: `2026-01-${(i % 28) + 1}`, deposits: i, withdrawals: i / 2, signups: i % 3 })),
  distributions: { funnel: { NEW: 6, CONTACTED: 3, QUALIFIED: 2, CONVERTED: 1, LOST: 1 }, kyc: { NOT_SUBMITTED: 1, PENDING: 2, APPROVED: 5, REJECTED: 0 } },
  recentSignups: [{ id: 'c1', name: 'Ada Lovelace', email: 'ada@x.io', country: 'UK', createdAt: '2026-03-05T10:00:00Z' }],
  recentActivity: [{ id: 'a1', action: 'finance.withdrawal.approve', entity: 'JournalEntry', createdAt: '2026-03-05T09:00:00Z', actor: 'Avery Stone' }],
  recentWithdrawals: [{ id: 'w1', reference: 'TX-1', client: 'Ada Lovelace', amount: '$500.00', createdAt: '2026-03-05T08:00:00Z' }],
};

it('renders KPIs and panels from the dashboard payload', async () => {
  (adminApi.getDashboard as any).mockResolvedValue(payload);
  render(<MemoryRouter><AdminDashboardPage /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Total Clients')).toBeInTheDocument());
  expect(screen.getByText('Fund Flow')).toBeInTheDocument();
  expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  // "Pending Withdrawals" appears as both a KPI label and a panel heading; assert the panel heading
  expect(screen.getAllByText('Pending Withdrawals').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('Recent Signups')).toBeInTheDocument();
});
