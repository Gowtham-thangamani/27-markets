import { ExternalAmlProvider, SimulationAmlProvider } from './aml-provider'

const cfg = (over: Record<string, any> = {}) => ({
  get: (k: string) => ({ AML_PROVIDER_BASE_URL: 'https://api.opensanctions.org', ...over }[k]),
}) as any

const mockMatch = (results: { score: number; caption?: string; properties?: any; datasets?: string[] }[]) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ responses: { q: { results } } }),
  }) as any
}

const subject = { userId: 'u1', fullName: 'Jordan Avery', country: 'AE', dateOfBirth: new Date('1990-01-02') }

describe('ExternalAmlProvider (OpenSanctions)', () => {
  afterEach(() => { jest.restoreAllMocks() })

  it('refuses (fail-closed) when no API key is configured', async () => {
    const p = new ExternalAmlProvider(cfg({ AML_PROVIDER_API_KEY: undefined }))
    await expect(p.screen(subject)).rejects.toThrow(/not configured/i)
  })

  it('returns CLEAR with no hits when nothing scores above review', async () => {
    mockMatch([{ score: 0.3, caption: 'Someone Else' }])
    const p = new ExternalAmlProvider(cfg({ AML_PROVIDER_API_KEY: 'k' }))
    const r = await p.screen(subject)
    expect(r.status).toBe('CLEAR')
    expect(r.hits).toEqual([])
  })

  it('returns REVIEW for a mid-confidence match', async () => {
    mockMatch([{ score: 0.7, caption: 'Jordan Avery', properties: { topics: ['role.pep'] } }])
    const p = new ExternalAmlProvider(cfg({ AML_PROVIDER_API_KEY: 'k' }))
    const r = await p.screen(subject)
    expect(r.status).toBe('REVIEW')
    expect(r.hits[0]).toMatchObject({ list: 'role.pep', name: 'Jordan Avery', score: 0.7 })
  })

  it('returns HIT for a high-confidence sanctions match', async () => {
    mockMatch([
      { score: 0.92, caption: 'Jordan Avery', properties: { topics: ['sanction'] } },
      { score: 0.4, caption: 'noise' },
    ])
    const p = new ExternalAmlProvider(cfg({ AML_PROVIDER_API_KEY: 'k' }))
    const r = await p.screen(subject)
    expect(r.status).toBe('HIT')
    expect(r.hits).toHaveLength(1) // sub-threshold noise dropped
    expect(r.hits[0].score).toBe(0.92)
  })

  it('sends name, DOB and country in the match query', async () => {
    mockMatch([])
    const p = new ExternalAmlProvider(cfg({ AML_PROVIDER_API_KEY: 'k' }))
    await p.screen(subject)
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.queries.q.properties).toEqual({ name: ['Jordan Avery'], birthDate: ['1990-01-02'], country: ['AE'] })
  })

  it('raises (fail-closed) when the provider errors rather than clearing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, text: async () => 'bad gateway' }) as any
    const p = new ExternalAmlProvider(cfg({ AML_PROVIDER_API_KEY: 'k' }))
    await expect(p.screen(subject)).rejects.toThrow(/provider error/i)
  })
})

describe('SimulationAmlProvider (unchanged)', () => {
  it('clears everyone except the denylist', async () => {
    const p = new SimulationAmlProvider(cfg({ AML_SIM_DENYLIST: 'Bad Actor' }))
    expect((await p.screen(subject)).status).toBe('CLEAR')
    expect((await p.screen({ ...subject, fullName: 'Bad Actor' })).status).toBe('HIT')
  })
})
