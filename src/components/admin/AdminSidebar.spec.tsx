import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

import { AdminSidebarContent } from './AdminSidebar';

describe('AdminSidebarContent', () => {
  it('renders the admin label and a Dashboard link', () => {
    render(
      <MemoryRouter>
        <AdminSidebarContent />
      </MemoryRouter>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });
});
