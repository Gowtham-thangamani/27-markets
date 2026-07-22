import { ExternalKycProvider, ManualKycProvider } from './kyc-provider'

const cfg = (over: Record<string, any> = {}) => ({
  get: (k: string) => ({ KYC_PROVIDER_LEVEL: 'basic-kyc-level', KYC_PROVIDER_BASE_URL: 'https://api.sumsub.com', ...over }[k]),
}) as any

const subject = { userId: 'u1', email: 'a@x.io', fullName: 'Ada Lovelace', returnUrl: 'https://app/portal/kyc' }

describe('ExternalKycProvider (SumSub)', () => {
  afterEach(() => jest.restoreAllMocks())

  it('refuses (fail-closed) without an API key + secret', async () => {
    const p = new ExternalKycProvider(cfg({ KYC_PROVIDER_API_KEY: undefined, KYC_PROVIDER_SECRET: undefined }))
    await expect(p.createVerificationSession(subject)).rejects.toThrow(/not configured/i)
  })

  it('creates an applicant, issues an SDK token, and signs every request', async () => {
    const calls: any[] = []
    global.fetch = jest.fn().mockImplementation((url: string, init: any) => {
      calls.push({ url, headers: init.headers })
      if (url.includes('/resources/applicants?')) return Promise.resolve({ ok: true, json: async () => ({ id: 'appl_1' }) })
      if (url.includes('/resources/accessTokens')) return Promise.resolve({ ok: true, json: async () => ({ token: 'tok_1' }) })
      return Promise.resolve({ ok: false, status: 404, text: async () => '' })
    }) as any

    const p = new ExternalKycProvider(cfg({ KYC_PROVIDER_API_KEY: 'app-tok', KYC_PROVIDER_SECRET: 'sec' }))
    const res = await p.createVerificationSession(subject)

    expect(res).toEqual({ provider: 'external', reference: 'appl_1', url: null, sdkToken: 'tok_1' })
    // Both calls carry the SumSub signing headers.
    for (const c of calls) {
      expect(c.headers['X-App-Token']).toBe('app-tok')
      expect(c.headers['X-App-Access-Sig']).toMatch(/^[a-f0-9]{64}$/)
      expect(c.headers['X-App-Access-Ts']).toMatch(/^\d+$/)
    }
  })

  it('reuses an existing applicant when creation returns 409', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/resources/applicants?')) return Promise.resolve({ status: 409, ok: false, text: async () => 'exists' })
      if (url.includes('/externalUserId/')) return Promise.resolve({ ok: true, json: async () => ({ id: 'appl_existing' }) })
      if (url.includes('/resources/accessTokens')) return Promise.resolve({ ok: true, json: async () => ({ token: 'tok_2' }) })
      return Promise.resolve({ ok: false, status: 404, text: async () => '' })
    }) as any

    const p = new ExternalKycProvider(cfg({ KYC_PROVIDER_API_KEY: 'app-tok', KYC_PROVIDER_SECRET: 'sec' }))
    const res = await p.createVerificationSession(subject)
    expect(res.reference).toBe('appl_existing')
    expect(res.sdkToken).toBe('tok_2')
  })
})

describe('ManualKycProvider (unchanged)', () => {
  it('returns no hosted session', async () => {
    expect(await new ManualKycProvider().createVerificationSession()).toEqual({ provider: 'manual', reference: null, url: null })
  })
})
