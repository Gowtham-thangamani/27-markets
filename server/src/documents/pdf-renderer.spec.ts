import { renderPdf, simulationFooter } from './pdf-renderer';

describe('simulationFooter', () => {
  it('returns the watermark note when the platform is in SIMULATION', () => {
    expect(simulationFooter('SIMULATION')).toBe('SIMULATION — not a valid financial document');
  });

  it('returns null only when the platform is explicitly LIVE', () => {
    expect(simulationFooter('LIVE')).toBeNull();
  });

  it('fails safe: keeps the watermark for a missing or unknown mode', () => {
    expect(simulationFooter(undefined)).not.toBeNull();
    expect(simulationFooter('')).not.toBeNull();
    expect(simulationFooter('nonsense')).not.toBeNull();
  });
});

describe('renderPdf', () => {
  const input = {
    title: 'Account Statement',
    body: 'Statement for Ada Lovelace — period June 2026.\nBalance: 1250.00',
    footerNote: 'SIMULATION — not a valid financial document',
    generatedAt: new Date('2026-07-16T00:00:00.000Z'),
  };

  it('produces a valid PDF buffer', async () => {
    const buf = await renderPdf(input);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(500);
  });

  it('omits the footer when footerNote is null', async () => {
    const withFooter = await renderPdf(input);
    const without = await renderPdf({ ...input, footerNote: null });
    expect(without.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // Differential assertion: the only difference between these two renders is
    // the footer, so a shorter buffer is evidence it was actually omitted. A
    // bare '%PDF-' check would pass even if the footer were still drawn.
    expect(without.length).toBeLessThan(withFooter.length);
  });

  it('renders a body with no text without throwing', async () => {
    const buf = await renderPdf({ ...input, body: '' });
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
