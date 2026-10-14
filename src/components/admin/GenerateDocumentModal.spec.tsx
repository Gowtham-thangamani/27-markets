import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GenerateDocumentModal } from './GenerateDocumentModal'
import { adminApi } from '@/lib/adminApi'

vi.mock('@/lib/adminApi', () => ({
  adminApi: {
    listTextTemplates: vi.fn(),
    prepareDocument: vi.fn(),
    generateDocument: vi.fn(),
  },
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const client = {
  id: 'c1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  accounts: [
    { id: 'a1', number: 'MT5-1001', type: 'STANDARD', mode: 'LIVE', status: 'ACTIVE', balance: '1250.00' },
  ],
} as any

const statement = { id: 't1', kind: 'PDF', name: 'Account Statement', body: '', enabled: true, sortOrder: 0, createdAt: '', updatedAt: '' }

describe('GenerateDocumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // jsdom implements neither of these; download() calls both and would throw.
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.mocked(adminApi.listTextTemplates).mockResolvedValue([statement] as any)
    vi.mocked(adminApi.prepareDocument).mockResolvedValue({
      autoVars: { clientName: 'Ada Lovelace', balance: '1250.00' },
      manualTokens: ['period'],
      needsAccount: true,
    })
  })

  it('lists the enabled PDF templates', async () => {
    render(<GenerateDocumentModal client={client} onClose={() => {}} />)
    await waitFor(() => expect(adminApi.listTextTemplates).toHaveBeenCalledWith('PDF'))
    expect(screen.getAllByText('Account Statement').length).toBeGreaterThan(0)
  })

  it('shows the account picker and an input per manual token', async () => {
    render(<GenerateDocumentModal client={client} onClose={() => {}} />)
    await userEvent.selectOptions(await screen.findByLabelText(/template/i), 't1')
    await waitFor(() => expect(adminApi.prepareDocument).toHaveBeenCalled())
    expect(await screen.findByLabelText(/trading account/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/period/i)).toBeInTheDocument()
  })

  it('generates with the chosen account and typed values', async () => {
    vi.mocked(adminApi.generateDocument).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }))
    render(<GenerateDocumentModal client={client} onClose={() => {}} />)
    await userEvent.selectOptions(await screen.findByLabelText(/template/i), 't1')
    await userEvent.type(await screen.findByLabelText(/period/i), 'June 2026')
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() =>
      expect(adminApi.generateDocument).toHaveBeenCalledWith({
        templateId: 't1',
        clientId: 'c1',
        accountId: 'a1',
        vars: { period: 'June 2026' },
      }),
    )
  })
})
