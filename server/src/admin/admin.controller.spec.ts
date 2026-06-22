import { UserRole } from '@prisma/client';
import { AdminController } from './admin.controller';

describe('AdminController', () => {
  it('ping returns the staff identity', () => {
    const controller = new AdminController();
    const user = { id: 'a1', email: 'admin@27.com', role: UserRole.ADMIN };
    expect(controller.ping(user)).toEqual({ ok: true, staff: user });
  });
});
