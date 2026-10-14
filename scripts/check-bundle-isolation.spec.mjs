import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkIsolation } from './check-bundle-isolation.mjs'

/** Builds a throwaway dist/ with the given files under assets/. */
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'iso-'))
  mkdirSync(join(dir, 'assets'), { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, 'assets', name), body)
  }
  return dir
}

describe('checkIsolation — clean bundles', () => {
  it('passes when no foreign chunk or string is present', () => {
    const dir = fixture({ 'AboutPage-abc.js': 'const a="/about"' })
    expect(checkIsolation('marketing', dir)).toEqual({ ok: true, leaks: [] })
  })

  it("ignores a surface's own chunks", () => {
    const dir = fixture({ 'AdminWithdrawalsPage-x.js': 'const r="admin/withdrawal-requests"' })
    expect(checkIsolation('admin', dir)).toEqual({ ok: true, leaks: [] })
  })

  it('skips the check entirely for surface "all"', () => {
    const dir = fixture({ 'AdminWithdrawalsPage-x.js': 'const r="admin/withdrawal-requests"' })
    expect(checkIsolation('all', dir)).toEqual({ ok: true, leaks: [] })
  })
})

describe('checkIsolation — chunk filename leaks', () => {
  it('fails when an admin chunk is emitted into the marketing bundle', () => {
    const dir = fixture({ 'AdminWithdrawalsPage-x.js': 'x' })
    const result = checkIsolation('marketing', dir)
    expect(result.ok).toBe(false)
    expect(result.leaks[0]).toMatch(/AdminWithdrawalsPage/)
    expect(result.leaks[0]).toMatch(/admin/)
  })

  it('fails when a partner chunk is emitted into the admin bundle', () => {
    const dir = fixture({ 'PartnerCommissionsPage-x.js': 'x' })
    expect(checkIsolation('admin', dir).ok).toBe(false)
  })

  it('fails when a portal chunk is emitted into the partner bundle', () => {
    const dir = fixture({ 'FundsPage-x.js': 'x' })
    expect(checkIsolation('partner', dir).ok).toBe(false)
  })

  it('does not confuse PartnerApplyPage (marketing) with the partner portal', () => {
    const dir = fixture({ 'PartnerApplyPage-x.js': 'x' })
    expect(checkIsolation('marketing', dir)).toEqual({ ok: true, leaks: [] })
  })
})

describe('checkIsolation — content string leaks', () => {
  it('fails when an admin route string is inlined into the marketing entry', () => {
    const dir = fixture({ 'index-abc.js': 'const r="admin/withdrawal-requests"' })
    const result = checkIsolation('marketing', dir)
    expect(result.ok).toBe(false)
    expect(result.leaks[0]).toMatch(/withdrawal-requests/)
  })
})

describe('checkIsolation — the check must not pass vacuously', () => {
  it('fails on a directory with no JavaScript in it', () => {
    const dir = fixture({})
    const result = checkIsolation('marketing', dir)
    expect(result.ok).toBe(false)
    expect(result.leaks[0]).toMatch(/no javascript files/i)
  })

  it('fails on a directory that does not exist', () => {
    const result = checkIsolation('marketing', join(tmpdir(), 'definitely-not-here-29381'))
    expect(result.ok).toBe(false)
  })

  it('scans nested directories, not just the top level', () => {
    const dir = fixture({})
    mkdirSync(join(dir, 'assets', 'nested'), { recursive: true })
    writeFileSync(join(dir, 'assets', 'nested', 'AgentLeadsPage-x.js'), 'x')
    expect(checkIsolation('marketing', dir).ok).toBe(false)
  })
})
