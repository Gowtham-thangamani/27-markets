import { EmailService } from './email.service';

describe('EmailService.sendLoginAlert', () => {
  const make = () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const provider = { send } as any;
    const config = { get: () => 'http://localhost:5173' } as any;
    const prisma = { notificationTemplate: { findUnique: jest.fn().mockResolvedValue(null) } } as any; // fall back to default
    return { service: new EmailService(provider, config, prisma), send };
  };

  it('renders and sends the login alert with the sign-in details', async () => {
    const { service, send } = make();

    await service.sendLoginAlert('a@x.com', { firstName: 'Alice', time: '2026-01-01T00:00:00Z', ip: '1.2.3.4', device: 'Chrome on Windows' });

    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe('a@x.com');
    expect(arg.subject).toMatch(/sign-in/i);
    expect(arg.text).toContain('Alice');
    expect(arg.text).toContain('1.2.3.4');
    expect(arg.text).toContain('Chrome on Windows');
    expect(arg.text).toContain('2026-01-01T00:00:00Z');
  });
});
