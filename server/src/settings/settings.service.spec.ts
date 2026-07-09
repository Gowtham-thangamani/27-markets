import { SettingsService } from './settings.service';

const cfg = (allowLive: boolean) => ({ get: () => allowLive }) as any;

describe('SettingsService.publicSettings', () => {
  it('maps + coerces stored settings', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { key: 'support_email', value: 'help@27markets.com' },
      { key: 'min_deposit_usd', value: '100' },
      { key: 'maintenance_mode', value: 'true' },
      { key: 'maintenance_message', value: 'Back soon' },
    ]);
    const service = new SettingsService({ appSetting: { findMany } } as any, cfg(false));

    const s = await service.publicSettings();

    expect(s.supportEmail).toBe('help@27markets.com');
    expect(s.minDeposit).toBe(100);
    expect(s.maintenanceMode).toBe(true);
    expect(s.maintenanceMessage).toBe('Back soon');
  });

  it('falls back to defaults when settings are missing', async () => {
    const service = new SettingsService({ appSetting: { findMany: jest.fn().mockResolvedValue([]) } } as any, cfg(false));

    const s = await service.publicSettings();

    expect(s.minDeposit).toBe(50);
    expect(s.maintenanceMode).toBe(false);
    expect(s.supportEmail).toBe('info@27markets.com');
  });

  it('reports live accounts as enabled only when ALLOW_LIVE_MODE is on', async () => {
    const prisma = { appSetting: { findMany: jest.fn().mockResolvedValue([]) } } as any;
    expect((await new SettingsService(prisma, cfg(false)).publicSettings()).liveAccountsEnabled).toBe(false);
    expect((await new SettingsService(prisma, cfg(true)).publicSettings()).liveAccountsEnabled).toBe(true);
  });
});
