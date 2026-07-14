import { NotificationsService } from './notifications.service'

describe('NotificationsService', () => {
  it('creates a notification for the user', async () => {
    const create = jest.fn().mockResolvedValue({})
    const svc = new NotificationsService({ notification: { create } } as any, { sendNotification: jest.fn() } as any)
    await svc.create('u1', { title: 'Deposit confirmed', body: '$100 credited', kind: 'SUCCESS' as any })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', title: 'Deposit confirmed', kind: 'SUCCESS' }) }))
  })

  it('never throws if creation fails (best-effort)', async () => {
    const svc = new NotificationsService({ notification: { create: jest.fn().mockRejectedValue(new Error('db down')) } } as any, { sendNotification: jest.fn() } as any)
    await expect(svc.create('u1', { title: 't', body: 'b' })).resolves.toBeUndefined()
  })

  it('lists the user notifications with a client-friendly shape (lowercased kind)', async () => {
    const rows = [{ id: 'n1', title: 'T', body: 'B', kind: 'SUCCESS', read: false, createdAt: new Date('2026-01-01T00:00:00Z') }]
    const svc = new NotificationsService({ notification: { findMany: jest.fn().mockResolvedValue(rows) } } as any, { sendNotification: jest.fn() } as any)
    const r = await svc.list('u1')
    expect(r[0]).toEqual({ id: 'n1', title: 'T', body: 'B', kind: 'success', read: false, date: '2026-01-01T00:00:00.000Z' })
  })

  it('marks all unread as read', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 3 })
    const svc = new NotificationsService({ notification: { updateMany } } as any, { sendNotification: jest.fn() } as any)
    const r = await svc.markAllRead('u1')
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', read: false }, data: { read: true } }))
    expect(r).toEqual({ ok: true })
  })
})
