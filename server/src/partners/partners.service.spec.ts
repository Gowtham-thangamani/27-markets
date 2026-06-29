import { PartnersService } from './partners.service';

describe('PartnersService.apply', () => {
  it('creates a PENDING application (lowercased email)', async () => {
    const created = { id: 'app1' };
    const prisma = { partnerApplication: { create: jest.fn().mockResolvedValue(created) } } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PartnersService(prisma, audit);

    const res = await service.apply({
      firstName: 'Pat', lastName: 'Lee', email: 'Pat@Example.com', company: 'PatPromo',
    } as any);

    expect(res).toEqual({ id: 'app1' });
    expect(prisma.partnerApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'pat@example.com', status: 'PENDING' }) }),
    );
  });
});
