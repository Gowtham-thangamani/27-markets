import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { KpiSparkCard } from './KpiSparkCard';

it('renders label, value, and a positive delta chip', () => {
  render(<KpiSparkCard icon={Users} label="Total Clients" value="1,240" delta={12.5} spark={[1, 2, 3]} />);
  expect(screen.getByText('Total Clients')).toBeInTheDocument();
  expect(screen.getByText('1,240')).toBeInTheDocument();
  expect(screen.getByText(/12\.5/)).toBeInTheDocument();
});

it('omits the delta chip when delta is null', () => {
  render(<KpiSparkCard icon={Users} label="Pending KYC" value="3" delta={null} spark={[0, 1]} />);
  expect(screen.queryByText('%', { exact: false })).not.toBeInTheDocument();
});
