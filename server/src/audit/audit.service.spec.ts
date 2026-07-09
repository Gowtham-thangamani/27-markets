import { AuditService } from './audit.service';
import { requestContext } from '../common/request-context';

describe('AuditService — IP/UA capture', () => {
  const make = () => {
    const create = jest.fn().mockResolvedValue({});
    const audit = new AuditService({ auditLog: { create } } as any);
    return { audit, create };
  };

  it('fills ip/userAgent from the request context when not passed explicitly', async () => {
    const { audit, create } = make();
    await requestContext.run({ ip: '1.2.3.4', userAgent: 'UA/1' }, async () => {
      await audit.record({ action: 'test.action' });
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ip: '1.2.3.4', userAgent: 'UA/1' }) }),
    );
  });

  it('prefers explicitly-passed ip/userAgent over the context', async () => {
    const { audit, create } = make();
    await requestContext.run({ ip: '1.2.3.4', userAgent: 'UA/1' }, async () => {
      await audit.record({ action: 'test.action', ip: '9.9.9.9', userAgent: 'Explicit' });
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ip: '9.9.9.9', userAgent: 'Explicit' }) }),
    );
  });
});
