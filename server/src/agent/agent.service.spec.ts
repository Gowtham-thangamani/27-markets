import { AgentService } from './agent.service';

describe('AgentService', () => {
  const prisma = {
    lead: { groupBy: jest.fn(), findMany: jest.fn() },
    ticket: { count: jest.fn(), findMany: jest.fn() },
  } as any;
  const svc = new AgentService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('summary aggregates the agent lead statuses + ticket counts', async () => {
    prisma.lead.groupBy.mockResolvedValue([
      { status: 'NEW', _count: { _all: 3 } },
      { status: 'CONVERTED', _count: { _all: 2 } },
    ]);
    prisma.ticket.count
      .mockResolvedValueOnce(5) // total
      .mockResolvedValueOnce(4); // open

    const s = await svc.summary('agent1');
    expect(s.leads.total).toBe(5);
    expect(s.leads.new).toBe(3);
    expect(s.leads.converted).toBe(2);
    expect(s.leads.qualified).toBe(0);
    expect(s.tickets).toEqual({ open: 4, total: 5 });
    // groupBy scoped to the agent
    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignedToId: 'agent1' } }),
    );
  });

  it('myLeads returns only the agent assigned leads, ISO dates', async () => {
    prisma.lead.findMany.mockResolvedValue([
      { id: 'l1', name: 'A', email: 'a@x.io', phone: null, country: 'AE', source: 'MANUAL', status: 'NEW', createdAt: new Date('2026-01-01T00:00:00Z') },
    ]);
    const rows = await svc.myLeads('agent1');
    expect(rows[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { assignedToId: 'agent1' } }),
    );
  });

  it('myTickets flattens the client name', async () => {
    prisma.ticket.findMany.mockResolvedValue([
      { id: 't1', subject: 'S', category: 'billing', priority: 'HIGH', status: 'OPEN', updatedAt: new Date('2026-01-02T00:00:00Z'), user: { firstName: 'Jane', lastName: 'Doe' } },
    ]);
    const rows = await svc.myTickets('agent1');
    expect(rows[0].client).toBe('Jane Doe');
    expect(rows[0].updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });
});
