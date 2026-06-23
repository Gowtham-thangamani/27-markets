import { UserRole } from '@prisma/client';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminController', () => {
  it('ping returns the staff identity', () => {
    const dashboard = {} as AdminDashboardService;
    const controller = new AdminController(dashboard);
    const user = { id: 'a1', email: 'admin@27.com', role: UserRole.ADMIN };
    expect(controller.ping(user)).toEqual({ ok: true, staff: user });
  });
});
