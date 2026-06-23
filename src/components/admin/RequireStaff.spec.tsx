import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let authState: { user: { role: string } | null; isAuthenticated: boolean; loading: boolean };
vi.mock('@/context/AuthContext', () => ({ useAuth: () => authState }));

import { RequireStaff } from './RequireStaff';

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
      <Routes>
        <Route
          path="/admin/dashboard"
          element={
            <RequireStaff>
              <div>ADMIN CONTENT</div>
            </RequireStaff>
          }
        />
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/portal/dashboard" element={<div>PORTAL PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireStaff', () => {
  beforeEach(() => {
    authState = { user: null, isAuthenticated: false, loading: false };
  });

  it('renders children for a staff user (AGENT)', () => {
    authState = { user: { role: 'AGENT' }, isAuthenticated: true, loading: false };
    renderAt();
    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument();
  });

  it('redirects an authenticated non-staff user to the portal', () => {
    authState = { user: { role: 'CLIENT' }, isAuthenticated: true, loading: false };
    renderAt();
    expect(screen.getByText('PORTAL PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor to login', () => {
    authState = { user: null, isAuthenticated: false, loading: false };
    renderAt();
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('shows a loader while the session is restoring', () => {
    authState = { user: null, isAuthenticated: false, loading: true };
    renderAt();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
  });
});
